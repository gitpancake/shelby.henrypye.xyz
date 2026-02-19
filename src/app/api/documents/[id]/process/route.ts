import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUploadBuffer } from "@/lib/files";
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
        const fileBuffer = await getUploadBuffer(doc.storedFilename);
        const result = await extractServiceRecords(fileBuffer, doc.mimeType);

        await prisma.$transaction(
            async (tx) => {
                // If reprocessing, delete old records first (cascade: notes → line items → records → odometer readings)
                const existingRecords = await tx.shelbyServiceRecord.findMany({
                    where: { documentId: doc.id },
                    select: { id: true },
                });

                if (existingRecords.length > 0) {
                    const recordIds = existingRecords.map((r) => r.id);

                    await tx.shelbyNote.deleteMany({
                        where: { serviceRecordId: { in: recordIds } },
                    });

                    await tx.shelbyServiceLineItem.deleteMany({
                        where: { serviceRecordId: { in: recordIds } },
                    });

                    await tx.shelbyServiceRecord.deleteMany({
                        where: { documentId: doc.id },
                    });
                }

                await tx.shelbyOdometerReading.deleteMany({
                    where: { documentId: doc.id },
                });

                // Insert or overwrite extraction results
                for (const record of result.records) {
                    const extractedDate = new Date(record.serviceDate);
                    let serviceRecord;

                    // Try to find an existing record with same date + shop from a different document
                    let existingMatch = null;
                    if (record.shop) {
                        const candidates =
                            await tx.shelbyServiceRecord.findMany({
                                where: {
                                    vehicleId: doc.vehicleId,
                                    serviceDate: extractedDate,
                                    documentId: { not: doc.id },
                                },
                                select: { id: true, shop: true },
                            });

                        existingMatch =
                            candidates.find(
                                (c) =>
                                    c.shop?.trim().toLowerCase() ===
                                    record.shop!.trim().toLowerCase(),
                            ) ?? null;
                    }

                    if (existingMatch) {
                        // Overwrite: delete old notes + line items, update the record
                        await tx.shelbyNote.deleteMany({
                            where: { serviceRecordId: existingMatch.id },
                        });
                        await tx.shelbyServiceLineItem.deleteMany({
                            where: { serviceRecordId: existingMatch.id },
                        });

                        serviceRecord = await tx.shelbyServiceRecord.update({
                            where: { id: existingMatch.id },
                            data: {
                                documentId: doc.id,
                                mileage: record.mileage,
                                shop: record.shop,
                                currency: record.currency || "USD",
                                notes: record.notes,
                            },
                        });
                    } else {
                        // Create new record
                        serviceRecord = await tx.shelbyServiceRecord.create({
                            data: {
                                vehicleId: doc.vehicleId,
                                documentId: doc.id,
                                serviceDate: extractedDate,
                                mileage: record.mileage,
                                shop: record.shop,
                                currency: record.currency || "USD",
                                notes: record.notes,
                            },
                        });
                    }

                    if (record.serviceNotes) {
                        for (const note of record.serviceNotes) {
                            await tx.shelbyNote.create({
                                data: {
                                    serviceRecordId: serviceRecord.id,
                                    type: note.type,
                                    title: note.title,
                                    content: note.content,
                                },
                            });
                        }
                    }

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

                // Insert odometer readings
                if (result.odometerReadings) {
                    for (const reading of result.odometerReadings) {
                        await tx.shelbyOdometerReading.create({
                            data: {
                                vehicleId: doc.vehicleId,
                                documentId: doc.id,
                                date: new Date(reading.date),
                                mileage: reading.mileage,
                                source: doc.originalFilename,
                            },
                        });
                    }
                }

                // Update vehicle mileage to the most recent reading
                const latestOdometer = await tx.shelbyOdometerReading.findFirst(
                    {
                        where: { vehicleId: doc.vehicleId },
                        orderBy: { date: "desc" },
                        select: { mileage: true },
                    },
                );

                const latestService = await tx.shelbyServiceRecord.findFirst({
                    where: {
                        vehicleId: doc.vehicleId,
                        mileage: { not: null },
                    },
                    orderBy: { serviceDate: "desc" },
                    select: { mileage: true },
                });

                const maxMileage = Math.max(
                    latestOdometer?.mileage ?? 0,
                    latestService?.mileage ?? 0,
                );

                if (maxMileage > 0) {
                    await tx.shelbyVehicle.update({
                        where: { id: doc.vehicleId },
                        data: { mileage: maxMileage },
                    });
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
