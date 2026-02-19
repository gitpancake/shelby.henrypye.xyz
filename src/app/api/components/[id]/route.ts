import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    try {
        // Delete line items first, then the component
        await prisma.shelbyServiceLineItem.deleteMany({
            where: { componentId: id },
        });

        await prisma.shelbyComponent.delete({
            where: { id },
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json(
            { error: "Component not found" },
            { status: 404 },
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const body = await request.json();
    const { mergeIntoId } = body;

    if (!mergeIntoId) {
        return NextResponse.json(
            { error: "mergeIntoId required" },
            { status: 400 },
        );
    }

    try {
        // Move all line items from this component to the target
        await prisma.shelbyServiceLineItem.updateMany({
            where: { componentId: id },
            data: { componentId: mergeIntoId },
        });

        // Delete the now-empty component
        await prisma.shelbyComponent.delete({
            where: { id },
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json(
            { error: "Merge failed" },
            { status: 500 },
        );
    }
}
