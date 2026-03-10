import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";
import { randomBytes } from "crypto";

export const GET = withAuth(async (_request, { session, params }) => {
    const { id } = params;

    // Verify user is owner of this team
    const membership = await prisma.sharedTeamMember.findUnique({
        where: { teamId_userId: { teamId: id, userId: session.sharedUserId } },
    });

    if (!membership || membership.role !== "owner") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invites = await prisma.sharedTeamInvite.findMany({
        where: { teamId: id, acceptedAt: null },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invites);
});

export const POST = withAuth(async (request, { session, params }) => {
    const { id } = params;

    // Verify user is owner of this team
    const membership = await prisma.sharedTeamMember.findUnique({
        where: { teamId_userId: { teamId: id, userId: session.sharedUserId } },
    });

    if (!membership || membership.role !== "owner") {
        return NextResponse.json({ error: "Only owners can invite" }, { status: 403 });
    }

    const { email, role } = await request.json();

    if (!email?.trim() || !["collaborator", "viewer"].includes(role)) {
        return NextResponse.json(
            { error: "Valid email and role (collaborator/viewer) required" },
            { status: 400 },
        );
    }

    // Check if already a member
    const existingUser = await prisma.sharedUser.findFirst({
        where: { email: email.trim().toLowerCase() },
    });
    if (existingUser) {
        const existingMember = await prisma.sharedTeamMember.findUnique({
            where: { teamId_userId: { teamId: id, userId: existingUser.id } },
        });
        if (existingMember) {
            return NextResponse.json(
                { error: "User is already a team member" },
                { status: 409 },
            );
        }
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.sharedTeamInvite.upsert({
        where: { teamId_email: { teamId: id, email: email.trim().toLowerCase() } },
        create: {
            teamId: id,
            invitedBy: session.sharedUserId,
            email: email.trim().toLowerCase(),
            role,
            token,
            expiresAt,
        },
        update: {
            role,
            token,
            expiresAt,
            acceptedAt: null,
        },
    });

    return NextResponse.json(invite, { status: 201 });
});
