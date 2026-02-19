import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const vehicle = await prisma.shelbyVehicle.findFirst();
    if (!vehicle) {
        return NextResponse.json([], { status: 200 });
    }

    // Get standalone odometer readings
    const odometerReadings = await prisma.shelbyOdometerReading.findMany({
        where: { vehicleId: vehicle.id },
        orderBy: { date: "desc" },
    });

    // Get service records with mileage
    const serviceRecords = await prisma.shelbyServiceRecord.findMany({
        where: { vehicleId: vehicle.id, mileage: { not: null } },
        orderBy: { serviceDate: "desc" },
        include: { document: { select: { originalFilename: true } } },
    });

    // Merge into unified timeline
    const entries: { date: string; mileage: number; source: string }[] = [];

    for (const r of odometerReadings) {
        entries.push({
            date: r.date.toISOString(),
            mileage: r.mileage,
            source: r.source,
        });
    }

    for (const r of serviceRecords) {
        entries.push({
            date: r.serviceDate.toISOString(),
            mileage: r.mileage!,
            source: r.document?.originalFilename ?? "Manual entry",
        });
    }

    // Deduplicate by date+mileage, sort newest first
    const seen = new Set<string>();
    const unique = entries.filter((e) => {
        const key = `${e.date.slice(0, 10)}-${e.mileage}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    unique.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return NextResponse.json(unique);
}

export async function POST(request: NextRequest) {
    const vehicle = await prisma.shelbyVehicle.findFirst();
    if (!vehicle) {
        return NextResponse.json(
            { error: "No vehicle configured" },
            { status: 400 },
        );
    }

    const body = await request.json();
    const { date, mileage } = body;

    if (!date || !mileage) {
        return NextResponse.json(
            { error: "Date and mileage required" },
            { status: 400 },
        );
    }

    const reading = await prisma.shelbyOdometerReading.create({
        data: {
            vehicleId: vehicle.id,
            date: new Date(date),
            mileage: Number(mileage),
            source: "Manual",
        },
    });

    // Update vehicle mileage if this is the highest reading
    if (Number(mileage) > vehicle.mileage) {
        await prisma.shelbyVehicle.update({
            where: { id: vehicle.id },
            data: { mileage: Number(mileage) },
        });
    }

    return NextResponse.json(reading, { status: 201 });
}
