import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const { serviceRecordId } = await request.json();

    if (!serviceRecordId) {
        return NextResponse.json(
            { error: "serviceRecordId required" },
            { status: 400 },
        );
    }

    const component = await prisma.shelbyComponent.findUnique({ where: { id } });
    if (!component) {
        return NextResponse.json(
            { error: "Component not found" },
            { status: 404 },
        );
    }

    // Check if this component is already linked to this service record
    const existing = await prisma.shelbyServiceLineItem.findFirst({
        where: { serviceRecordId, componentId: id },
    });

    if (existing) {
        return NextResponse.json(
            { error: "Already linked to this service record" },
            { status: 409 },
        );
    }

    const lineItem = await prisma.shelbyServiceLineItem.create({
        data: {
            serviceRecordId,
            componentId: id,
            description: `${component.name} (manually linked)`,
        },
    });

    return NextResponse.json(lineItem, { status: 201 });
}
