import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

export const PATCH = withAuth(
    async (request, { session, params }) => {
        const { id } = params;

        const membership = await prisma.sharedTeamMember.findUnique({
            where: {
                teamId_userId: { teamId: id, userId: session.sharedUserId },
            },
        });

        if (!membership || membership.role !== "owner") {
            return NextResponse.json(
                { error: "Only the team owner can update settings" },
                { status: 403 },
            );
        }

        const body = await request.json();
        const update: Record<string, unknown> = {};

        if (typeof body.safeMode === "boolean") {
            update.safeMode = body.safeMode;
        }

        const team = await prisma.sharedTeam.update({
            where: { id },
            data: update,
        });

        return NextResponse.json(team);
    },
);

export const DELETE = withAuth(
    async (_request, { session, params }) => {
        const { id } = params;

        // Verify the user is the owner of this team
        const membership = await prisma.sharedTeamMember.findUnique({
            where: {
                teamId_userId: { teamId: id, userId: session.sharedUserId },
            },
        });

        if (!membership || membership.role !== "owner") {
            return NextResponse.json(
                { error: "Only the team owner can delete a team" },
                { status: 403 },
            );
        }

        // Check safe mode
        const team = await prisma.sharedTeam.findUnique({
            where: { id },
            select: { safeMode: true },
        });

        if (team?.safeMode) {
            return NextResponse.json(
                { error: "Safe mode is enabled — disable it before deleting" },
                { status: 400 },
            );
        }

        // Don't allow deleting the user's only team
        const teamCount = await prisma.sharedTeamMember.count({
            where: { userId: session.sharedUserId },
        });

        if (teamCount <= 1) {
            return NextResponse.json(
                { error: "Cannot delete your only team" },
                { status: 400 },
            );
        }

        // Delete all shelby data for vehicles in this team, then the team itself
        await prisma.$transaction(async (tx) => {
            const vehicles = await tx.shelbyVehicle.findMany({
                where: { teamId: id },
                select: { id: true },
            });
            const vehicleIds = vehicles.map((v) => v.id);

            if (vehicleIds.length > 0) {
                await tx.shelbyNote.deleteMany({
                    where: { serviceRecord: { vehicleId: { in: vehicleIds } } },
                });
                await tx.shelbyServiceLineItem.deleteMany({
                    where: { serviceRecord: { vehicleId: { in: vehicleIds } } },
                });
                await tx.shelbyServiceRecord.deleteMany({
                    where: { vehicleId: { in: vehicleIds } },
                });
                await tx.shelbyOdometerReading.deleteMany({
                    where: { vehicleId: { in: vehicleIds } },
                });
                await tx.shelbyDiagnosticReport.deleteMany({
                    where: { vehicleId: { in: vehicleIds } },
                });
                await tx.shelbyDocument.deleteMany({
                    where: { vehicleId: { in: vehicleIds } },
                });
                await tx.shelbyComponent.deleteMany({
                    where: { vehicleId: { in: vehicleIds } },
                });
                await tx.shelbyVehicle.deleteMany({
                    where: { teamId: id },
                });
            }

            // Team members and invites cascade-delete via schema
            await tx.sharedTeam.delete({ where: { id } });
        });

        return NextResponse.json({ success: true });
    },
);
