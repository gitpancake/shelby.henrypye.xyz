import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, assertCanWrite } from "@/lib/auth";

export const DELETE = withAuth(async (_request, { session, params }) => {
    const forbidden = assertCanWrite(session);
    if (forbidden) return forbidden;

    const { id } = params;

    // Verify the component belongs to user's vehicle
    const component = await prisma.shelbyComponent.findFirst({
        where: {
            id,
            vehicle: { is: { teamId: session.activeTeamId } },
        },
    });

    if (!component) {
        return NextResponse.json(
            { error: "Component not found" },
            { status: 404 },
        );
    }

    await prisma.shelbyServiceLineItem.deleteMany({
        where: { componentId: id },
    });

    await prisma.shelbyComponent.delete({
        where: { id },
    });

    return NextResponse.json({ ok: true });
});

export const PATCH = withAuth(async (request, { session, params }) => {
    const forbidden = assertCanWrite(session);
    if (forbidden) return forbidden;

    const { id } = params;
    const body = await request.json();
    const { mergeIntoId } = body;

    if (!mergeIntoId) {
        return NextResponse.json(
            { error: "mergeIntoId required" },
            { status: 400 },
        );
    }

    // Verify both components belong to user's vehicle
    const [source, target] = await Promise.all([
        prisma.shelbyComponent.findFirst({
            where: { id, vehicle: { is: { teamId: session.activeTeamId } } },
        }),
        prisma.shelbyComponent.findFirst({
            where: { id: mergeIntoId, vehicle: { is: { teamId: session.activeTeamId } } },
        }),
    ]);

    if (!source || !target) {
        return NextResponse.json(
            { error: "Component not found" },
            { status: 404 },
        );
    }

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
});
