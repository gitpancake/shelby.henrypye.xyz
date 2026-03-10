import { cookies } from "next/headers";
import { adminAuth } from "./firebase-admin";
import { prisma } from "./prisma";

const SESSION_COOKIE = "firebase-token";
const TEAM_COOKIE = "active-team";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type TeamRole = "owner" | "collaborator" | "viewer";

export interface SessionUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  sharedUserId: string;
  activeTeamId: string;
  teamRole: TeamRole;
}

async function resolveToken(token: string): Promise<SessionUser | null> {
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const userRecord = await adminAuth.getUser(decoded.uid);

    const email = userRecord.email ?? "";
    const displayName = userRecord.displayName ?? null;
    const photoURL = userRecord.photoURL ?? null;

    // Upsert shared_users record
    const sharedUser = await prisma.sharedUser.upsert({
      where: { firebaseUid: decoded.uid },
      create: {
        firebaseUid: decoded.uid,
        email,
        displayName,
        photoUrl: photoURL,
      },
      update: {
        email,
        displayName,
        photoUrl: photoURL,
      },
    });

    // Get user's team memberships
    let memberships = await prisma.sharedTeamMember.findMany({
      where: { userId: sharedUser.id },
      include: { team: true },
    });

    // Auto-create personal team if none exist
    if (memberships.length === 0) {
      const team = await prisma.sharedTeam.create({
        data: {
          name: `${displayName || email}'s Team`,
          createdBy: sharedUser.id,
          members: {
            create: {
              userId: sharedUser.id,
              role: "owner",
            },
          },
        },
      });
      memberships = await prisma.sharedTeamMember.findMany({
        where: { userId: sharedUser.id },
        include: { team: true },
      });
    }

    // Resolve active team from cookie
    const jar = await cookies();
    const activeTeamCookie = jar.get(TEAM_COOKIE)?.value;

    let activeMembership = activeTeamCookie
      ? memberships.find((m) => m.teamId === activeTeamCookie)
      : null;

    // Default to first team if cookie is invalid or not set
    if (!activeMembership) {
      activeMembership = memberships[0];
    }

    return {
      uid: decoded.uid,
      email,
      displayName,
      photoURL,
      sharedUserId: sharedUser.id,
      activeTeamId: activeMembership.teamId,
      teamRole: activeMembership.role as TeamRole,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const cookieToken = jar.get(SESSION_COOKIE)?.value;
  if (cookieToken) {
    return resolveToken(cookieToken);
  }
  return null;
}

export async function setSession(idToken: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(TEAM_COOKIE);
}

export function assertCanWrite(session: SessionUser): Response | null {
  if (session.teamRole === "viewer") {
    return new Response(
      JSON.stringify({ error: "Viewers cannot modify data" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  return null;
}

export function withAuth(
  handler: (
    request: Request,
    context: { session: SessionUser; params?: any },
  ) => Promise<Response>,
) {
  return async (request: Request, routeContext?: any): Promise<Response> => {
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const params = routeContext?.params
      ? await routeContext.params
      : undefined;
    return handler(request, { session, params });
  };
}
