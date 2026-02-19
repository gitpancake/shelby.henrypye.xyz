import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const body = await request.json();
    const { currency } = body;

    if (!currency || !["USD", "CAD"].includes(currency)) {
        return NextResponse.json(
            { error: "Currency must be USD or CAD" },
            { status: 400 },
        );
    }

    try {
        const record = await prisma.shelbyServiceRecord.update({
            where: { id },
            data: { currency },
        });

        return NextResponse.json(record);
    } catch {
        return NextResponse.json(
            { error: "Record not found" },
            { status: 404 },
        );
    }
}
