import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estimateDateFromMileage } from "@/lib/estimate-date";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const body = await request.json();

    // Handle currency update
    if (body.currency) {
        if (!["USD", "CAD"].includes(body.currency)) {
            return NextResponse.json(
                { error: "Currency must be USD or CAD" },
                { status: 400 },
            );
        }

        try {
            const record = await prisma.shelbyServiceRecord.update({
                where: { id },
                data: { currency: body.currency },
            });
            return NextResponse.json(record);
        } catch {
            return NextResponse.json(
                { error: "Record not found" },
                { status: 404 },
            );
        }
    }

    // Handle guess date
    if (body.guessDate) {
        try {
            const record = await prisma.shelbyServiceRecord.findUnique({
                where: { id },
            });

            if (!record) {
                return NextResponse.json(
                    { error: "Record not found" },
                    { status: 404 },
                );
            }

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
        } catch {
            return NextResponse.json(
                { error: "Failed to estimate date" },
                { status: 500 },
            );
        }
    }

    return NextResponse.json({ error: "No valid action" }, { status: 400 });
}
