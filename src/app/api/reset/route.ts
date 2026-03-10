import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { withAuth, assertCanWrite } from "@/lib/auth";

const BUCKET = "shelby-documents";

export const POST = withAuth(async (_request, { session }) => {
    const forbidden = assertCanWrite(session);
    if (forbidden) return forbidden;

    try {
        const vehicle = await prisma.shelbyVehicle.findFirst({
            where: { teamId: session.activeTeamId },
        });
        if (!vehicle) {
            return NextResponse.json({ ok: true });
        }

        // Delete in order: notes → line items → service records → odometer readings → documents → components
        const recordIds = (
            await prisma.shelbyServiceRecord.findMany({
                where: { vehicleId: vehicle.id },
                select: { id: true },
            })
        ).map((r) => r.id);

        if (recordIds.length > 0) {
            await prisma.shelbyNote.deleteMany({
                where: { serviceRecordId: { in: recordIds } },
            });
            await prisma.shelbyServiceLineItem.deleteMany({
                where: { serviceRecordId: { in: recordIds } },
            });
            await prisma.shelbyServiceRecord.deleteMany({
                where: { vehicleId: vehicle.id },
            });
        }

        await prisma.shelbyOdometerReading.deleteMany({
            where: { vehicleId: vehicle.id },
        });
        await prisma.shelbyDiagnosticReport.deleteMany({
            where: { vehicleId: vehicle.id },
        });

        // Get all document filenames to delete from storage
        const documents = await prisma.shelbyDocument.findMany({
            where: { vehicleId: vehicle.id },
            select: { storedFilename: true },
        });

        await prisma.shelbyDocument.deleteMany({
            where: { vehicleId: vehicle.id },
        });
        await prisma.shelbyComponent.deleteMany({
            where: { vehicleId: vehicle.id },
        });

        // Delete files from Supabase Storage
        if (documents.length > 0) {
            const filenames = documents.map((d) => d.storedFilename);
            await supabase.storage.from(BUCKET).remove(filenames);
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "Reset failed" },
            { status: 500 },
        );
    }
});
