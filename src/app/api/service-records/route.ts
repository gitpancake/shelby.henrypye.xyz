import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const vehicle = await prisma.shelbyVehicle.findFirst();
    if (!vehicle) {
        return NextResponse.json([], { status: 200 });
    }

    const records = await prisma.shelbyServiceRecord.findMany({
        where: { vehicleId: vehicle.id },
        orderBy: { serviceDate: "desc" },
        include: {
            lineItems: {
                include: { component: true },
            },
            document: {
                select: { originalFilename: true },
            },
        },
    });

    return NextResponse.json(records);
}

export async function POST(request: Request) {
    try {
        const vehicle = await prisma.shelbyVehicle.findFirst();
        if (!vehicle) {
            return NextResponse.json(
                { error: "No vehicle found" },
                { status: 404 },
            );
        }

        const body = await request.json();
        const {
            date,
            description,
            componentName,
            category,
            cost,
            currency,
            mileage,
            shop,
            notes,
        } = body;

        if (
            (!date && !mileage) ||
            !description ||
            !componentName ||
            !category
        ) {
            return NextResponse.json(
                {
                    error: "Date or mileage (plus description, component, category) required",
                },
                { status: 400 },
            );
        }

        const component = await prisma.shelbyComponent.upsert({
            where: {
                vehicleId_name: {
                    vehicleId: vehicle.id,
                    name: componentName,
                },
            },
            create: {
                vehicleId: vehicle.id,
                name: componentName,
                category,
            },
            update: {
                category,
            },
        });

        const record = await prisma.shelbyServiceRecord.create({
            data: {
                vehicleId: vehicle.id,
                serviceDate: date ? new Date(date) : null,
                mileage: mileage ? Number(mileage) : null,
                shop: shop || null,
                currency: currency || "USD",
                notes: notes || null,
                lineItems: {
                    create: {
                        description,
                        componentId: component.id,
                        cost: cost ? Number(cost) : null,
                    },
                },
            },
            include: {
                lineItems: { include: { component: true } },
            },
        });

        // Auto-update vehicle mileage if this reading is higher
        if (mileage && Number(mileage) > vehicle.mileage) {
            await prisma.shelbyVehicle.update({
                where: { id: vehicle.id },
                data: { mileage: Number(mileage) },
            });
        }

        return NextResponse.json(record);
    } catch (e) {
        return NextResponse.json(
            {
                error:
                    e instanceof Error ? e.message : "Failed to create record",
            },
            { status: 500 },
        );
    }
}
