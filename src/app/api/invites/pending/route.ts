import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (_request, { session }) => {
    const invites = await prisma.sharedTeamInvite.findMany({
        where: {
            email: session.email.toLowerCase(),
            acceptedAt: null,
            expiresAt: { gt: new Date() },
        },
        include: {
            team: true,
            inviter: { select: { displayName: true, email: true } },
        },
    });

    return NextResponse.json(
        invites.map((inv) => ({
            id: inv.id,
            token: inv.token,
            teamName: inv.team.name,
            role: inv.role,
            invitedBy: inv.inviter.displayName ?? inv.inviter.email,
            expiresAt: inv.expiresAt.toISOString(),
        })),
    );
});
