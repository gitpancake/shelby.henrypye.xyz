import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUploadPath } from "@/lib/files";
import { extractServiceRecords } from "@/lib/anthropic";

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    const doc = await prisma.shelbyDocument.findUnique({ where: { id } });
    if (!doc) {
        return NextResponse.json(
            { error: "Document not found" },
            { status: 404 },
        );
    }

    if (doc.status === "PROCESSING") {
        return NextResponse.json(
            { error: "Already processing" },
            { status: 409 },
        );
    }

    await prisma.shelbyDocument.update({
        where: { id },
        data: { status: "PROCESSING", errorMessage: null },
    });

    try {
        const filePath = getUploadPath(doc.storedFilename);
        const result = await extractServiceRecords(filePath, doc.mimeType);

        await prisma.$transaction(
            async (tx) => {
                for (const record of result.records) {
                    const serviceRecord = await tx.shelbyServiceRecord.create({
                        data: {
                            vehicleId: doc.vehicleId,
                            documentId: doc.id,
                            serviceDate: new Date(record.serviceDate),
                            mileage: record.mileage,
                            shop: record.shop,
                            notes: record.notes,
                        },
                    });

                    for (const item of record.lineItems) {
                        const component = await tx.shelbyComponent.upsert({
                            where: {
                                vehicleId_name: {
                                    vehicleId: doc.vehicleId,
                                    name: item.componentName,
                                },
                            },
                            create: {
                                vehicleId: doc.vehicleId,
                                name: item.componentName,
                                category: item.componentCategory,
                            },
                            update: {
                                category: item.componentCategory,
                            },
                        });

                        await tx.shelbyServiceLineItem.create({
                            data: {
                                serviceRecordId: serviceRecord.id,
                                description: item.description,
                                componentId: component.id,
                                cost: item.cost,
                            },
                        });
                    }
                }
            },
            { timeout: 60000 },
        );

        await prisma.shelbyDocument.update({
            where: { id },
            data: { status: "COMPLETED", processedAt: new Date() },
        });

        return NextResponse.json({
            ok: true,
            recordCount: result.records.length,
        });
    } catch (e) {
        await prisma.shelbyDocument.update({
            where: { id },
            data: {
                status: "FAILED",
                errorMessage: e instanceof Error ? e.message : "Unknown error",
            },
        });

        return NextResponse.json(
            { error: e instanceof Error ? e.message : "Processing failed" },
            { status: 500 },
        );
    }
}
