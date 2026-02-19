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

    const note = await prisma.shelbyNote.update({
        where: { id },
        data: { resolvedByRecordId: serviceRecordId },
    });

    return NextResponse.json(note);
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    const note = await prisma.shelbyNote.update({
        where: { id },
        data: { resolvedByRecordId: null },
    });

    return NextResponse.json(note);
}
