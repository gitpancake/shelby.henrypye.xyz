import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

export const POST = withAuth(async (request, { session }) => {
    const { token } = await request.json();

    if (!token) {
        return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const invite = await prisma.sharedTeamInvite.findUnique({
        where: { token },
        include: { team: true },
    });

    if (!invite) {
        return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
    }

    if (invite.acceptedAt) {
        return NextResponse.json({ error: "Invite already accepted" }, { status: 409 });
    }

    if (invite.expiresAt < new Date()) {
        return NextResponse.json({ error: "Invite expired" }, { status: 410 });
    }

    // Check if already a member
    const existing = await prisma.sharedTeamMember.findUnique({
        where: {
            teamId_userId: {
                teamId: invite.teamId,
                userId: session.sharedUserId,
            },
        },
    });

    if (existing) {
        return NextResponse.json({ error: "Already a member" }, { status: 409 });
    }

    // Add to team and mark invite as accepted
    await prisma.$transaction([
        prisma.sharedTeamMember.create({
            data: {
                teamId: invite.teamId,
                userId: session.sharedUserId,
                role: invite.role,
            },
        }),
        prisma.sharedTeamInvite.update({
            where: { id: invite.id },
            data: { acceptedAt: new Date() },
        }),
    ]);

    return NextResponse.json({
        ok: true,
        teamId: invite.teamId,
        teamName: invite.team.name,
        role: invite.role,
    });
});
