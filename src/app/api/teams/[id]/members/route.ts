import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (_request, { session, params }) => {
    const { id } = params;

    // Verify user is a member of this team
    const membership = await prisma.sharedTeamMember.findUnique({
        where: { teamId_userId: { teamId: id, userId: session.sharedUserId } },
    });

    if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await prisma.sharedTeamMember.findMany({
        where: { teamId: id },
        include: {
            user: {
                select: {
                    displayName: true,
                    email: true,
                    photoUrl: true,
                },
            },
        },
        orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json(members);
});
