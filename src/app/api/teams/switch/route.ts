import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

export const POST = withAuth(async (request, { session }) => {
    const { teamId } = await request.json();

    if (!teamId) {
        return new Response(JSON.stringify({ error: "teamId required" }), {
            status: 400,
        });
    }

    // Verify membership
    const membership = await prisma.sharedTeamMember.findUnique({
        where: {
            teamId_userId: { teamId, userId: session.sharedUserId },
        },
    });

    if (!membership) {
        return new Response(
            JSON.stringify({ error: "Not a member of this team" }),
            { status: 403 },
        );
    }

    const jar = await cookies();
    jar.set("active-team", teamId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
    });

    return new Response(JSON.stringify({ ok: true, teamId, role: membership.role }));
});
