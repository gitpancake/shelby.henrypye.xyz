import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

const BUCKET = "shelby-documents";

export async function POST() {
    try {
        // Delete in order: notes → line items → service records → odometer readings → documents → components
        await prisma.shelbyNote.deleteMany();
        await prisma.shelbyServiceLineItem.deleteMany();
        await prisma.shelbyServiceRecord.deleteMany();
        await prisma.shelbyOdometerReading.deleteMany();
        await prisma.shelbyDiagnosticReport.deleteMany();

        // Get all document filenames to delete from storage
        const documents = await prisma.shelbyDocument.findMany({
            select: { storedFilename: true },
        });

        await prisma.shelbyDocument.deleteMany();
        await prisma.shelbyComponent.deleteMany();

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
}
