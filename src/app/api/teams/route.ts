import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (_request, { session }) => {
    const memberships = await prisma.sharedTeamMember.findMany({
        where: { userId: session.sharedUserId },
        include: {
            team: {
                include: {
                    members: {
                        include: { user: true },
                    },
                    _count: { select: { members: true } },
                },
            },
        },
        orderBy: { joinedAt: "asc" },
    });

    const teamIds = memberships.map((m) => m.teamId);
    const vehicles = await prisma.shelbyVehicle.findMany({
        where: { teamId: { in: teamIds } },
        select: { teamId: true, year: true, make: true, model: true },
    });
    const vehicleByTeam = new Map(
        vehicles.map((v) => [v.teamId, `${v.year} ${v.make} ${v.model}`]),
    );

    const teams = memberships.map((m) => ({
        id: m.team.id,
        name: m.team.name,
        vehicleName: vehicleByTeam.get(m.team.id) ?? null,
        safeMode: m.team.safeMode,
        role: m.role,
        memberCount: m.team._count.members,
        isActive: m.teamId === session.activeTeamId,
        members: m.team.members.map((member) => ({
            id: member.id,
            role: member.role,
            displayName: member.user.displayName,
            email: member.user.email,
            photoUrl: member.user.photoUrl,
            isYou: member.userId === session.sharedUserId,
        })),
    }));

    return NextResponse.json(teams);
});

export const POST = withAuth(async (request, { session }) => {
    const { name } = await request.json();

    if (!name?.trim()) {
        return NextResponse.json(
            { error: "Team name is required" },
            { status: 400 },
        );
    }

    const team = await prisma.sharedTeam.create({
        data: {
            name: name.trim(),
            createdBy: session.sharedUserId,
            members: {
                create: {
                    userId: session.sharedUserId,
                    role: "owner",
                },
            },
        },
    });

    return NextResponse.json(team, { status: 201 });
});
