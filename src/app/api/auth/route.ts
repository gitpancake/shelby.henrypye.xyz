import { getSession, setSession, clearSession } from "@/lib/auth";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  const { idToken } = (await req.json()) as { idToken?: string };

  if (!idToken) {
    return Response.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userRecord = await adminAuth.getUser(decoded.uid);

    await setSession(idToken);
    return Response.json({
      ok: true,
      uid: decoded.uid,
      email: userRecord.email ?? "",
      displayName: userRecord.displayName ?? null,
      photoURL: userRecord.photoURL ?? null,
    });
  } catch {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ authenticated: false });
  }
  return Response.json({
    authenticated: true,
    uid: session.uid,
    email: session.email,
    displayName: session.displayName,
    photoURL: session.photoURL,
  });
}

export async function DELETE() {
  await clearSession();
  return Response.json({ ok: true });
}
