import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

export const PATCH = withAuth(async (request, { session, params }) => {
    const { id, memberId } = params;

    // Verify user is owner
    const membership = await prisma.sharedTeamMember.findUnique({
        where: { teamId_userId: { teamId: id, userId: session.sharedUserId } },
    });

    if (!membership || membership.role !== "owner") {
        return NextResponse.json({ error: "Only owners can change roles" }, { status: 403 });
    }

    const { role } = await request.json();
    if (!["collaborator", "viewer"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Can't change own role
    const target = await prisma.sharedTeamMember.findUnique({
        where: { id: memberId },
    });
    if (!target || target.teamId !== id) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (target.userId === session.sharedUserId) {
        return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }

    const updated = await prisma.sharedTeamMember.update({
        where: { id: memberId },
        data: { role },
    });

    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (_request, { session, params }) => {
    const { id, memberId } = params;

    const target = await prisma.sharedTeamMember.findUnique({
        where: { id: memberId },
    });
    if (!target || target.teamId !== id) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Owner can remove anyone except themselves; non-owners can only remove themselves (leave)
    const membership = await prisma.sharedTeamMember.findUnique({
        where: { teamId_userId: { teamId: id, userId: session.sharedUserId } },
    });
    if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isOwner = membership.role === "owner";
    const isSelf = target.userId === session.sharedUserId;

    if (!isOwner && !isSelf) {
        return NextResponse.json({ error: "Only owners can remove members" }, { status: 403 });
    }
    if (isOwner && isSelf) {
        return NextResponse.json({ error: "Owner cannot leave their own team" }, { status: 400 });
    }

    await prisma.sharedTeamMember.delete({ where: { id: memberId } });

    return NextResponse.json({ ok: true });
});
