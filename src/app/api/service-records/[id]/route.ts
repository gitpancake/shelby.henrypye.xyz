import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estimateDateFromMileage } from "@/lib/estimate-date";
import { withAuth, assertCanWrite } from "@/lib/auth";

export const PATCH = withAuth(async (request, { session, params }) => {
    const forbidden = assertCanWrite(session);
    if (forbidden) return forbidden;

    const { id } = params;
    const body = await request.json();

    // Verify the record belongs to user's vehicle
    const record = await prisma.shelbyServiceRecord.findFirst({
        where: {
            id,
            vehicle: { is: { teamId: session.activeTeamId } },
        },
    });

    if (!record) {
        return NextResponse.json(
            { error: "Record not found" },
            { status: 404 },
        );
    }

    // Handle currency update
    if (body.currency) {
        if (!["USD", "CAD"].includes(body.currency)) {
            return NextResponse.json(
                { error: "Currency must be USD or CAD" },
                { status: 400 },
            );
        }

        const updated = await prisma.shelbyServiceRecord.update({
            where: { id },
            data: { currency: body.currency },
        });
        return NextResponse.json(updated);
    }

    // Handle guess date
    if (body.guessDate) {
        if (!record.mileage) {
            return NextResponse.json(
                { error: "Record has no mileage to estimate from" },
                { status: 400 },
            );
        }

        const estimated = await estimateDateFromMileage(
            record.vehicleId,
            record.mileage,
        );

        if (!estimated) {
            return NextResponse.json(
                { error: "Not enough odometer data to estimate date" },
                { status: 400 },
            );
        }

        const updated = await prisma.shelbyServiceRecord.update({
            where: { id },
            data: { serviceDate: estimated },
        });

        return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "No valid action" }, { status: 400 });
});

export const DELETE = withAuth(async (_request, { session, params }) => {
    const forbidden = assertCanWrite(session);
    if (forbidden) return forbidden;

    const { id } = params;

    // Verify the record belongs to team's vehicle
    const record = await prisma.shelbyServiceRecord.findFirst({
        where: {
            id,
            vehicle: { is: { teamId: session.activeTeamId } },
        },
    });

    if (!record) {
        return NextResponse.json(
            { error: "Record not found" },
            { status: 404 },
        );
    }

    await prisma.shelbyNote.deleteMany({
        where: { serviceRecordId: id },
    });
    await prisma.shelbyServiceLineItem.deleteMany({
        where: { serviceRecordId: id },
    });
    await prisma.shelbyServiceRecord.delete({
        where: { id },
    });

    return NextResponse.json({ ok: true });
});
