import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runDiagnostic } from "@/lib/anthropic";
import type { Prisma } from "@prisma/client";

export async function POST() {
    try {
        const vehicle = await prisma.shelbyVehicle.findFirst();
        if (!vehicle) {
            return NextResponse.json(
                { error: "No vehicle found" },
                { status: 404 },
            );
        }

        // Fetch all vehicle data
        const [records, components, odometerReadings] = await Promise.all([
            prisma.shelbyServiceRecord.findMany({
                where: { vehicleId: vehicle.id },
                orderBy: { serviceDate: "asc" },
                include: {
                    lineItems: { include: { component: true } },
                    serviceNotes: true,
                },
            }),
            prisma.shelbyComponent.findMany({
                where: { vehicleId: vehicle.id },
                include: {
                    lineItems: {
                        include: {
                            serviceRecord: {
                                select: {
                                    serviceDate: true,
                                    mileage: true,
                                    shop: true,
                                },
                            },
                        },
                        orderBy: { createdAt: "asc" },
                    },
                },
                orderBy: [{ category: "asc" }, { name: "asc" }],
            }),
            prisma.shelbyOdometerReading.findMany({
                where: { vehicleId: vehicle.id },
                orderBy: { date: "asc" },
            }),
        ]);

        // Build comprehensive text summary for AI analysis
        const lines: string[] = [];

        lines.push("=== VEHICLE INFORMATION ===");
        lines.push(
            `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`,
        );
        lines.push(`Current Mileage: ${vehicle.mileage.toLocaleString()} mi`);
        if (vehicle.driveType) lines.push(`Drivetrain: ${vehicle.driveType}`);
        if (vehicle.engineModel)
            lines.push(
                `Engine: ${vehicle.engineModel}${vehicle.displacementL ? ` (${vehicle.displacementL}L)` : ""}${vehicle.engineCylinders ? ` ${vehicle.engineCylinders}-cyl` : ""}`,
            );
        if (vehicle.fuelType) lines.push(`Fuel: ${vehicle.fuelType}`);
        lines.push("");

        lines.push("=== ODOMETER HISTORY ===");
        for (const reading of odometerReadings) {
            const date = new Date(reading.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
            lines.push(
                `${date}: ${reading.mileage.toLocaleString()} mi (${reading.source})`,
            );
        }
        lines.push("");

        lines.push("=== SERVICE HISTORY ===");
        for (const record of records) {
            const date = new Date(record.serviceDate).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", year: "numeric" },
            );
            lines.push(
                `--- ${date}${record.mileage ? ` @ ${record.mileage.toLocaleString()} mi` : ""}${record.shop ? ` — ${record.shop}` : ""} ---`,
            );
            if (record.notes) lines.push(`Notes: ${record.notes}`);

            for (const li of record.lineItems) {
                const cost = li.cost != null ? ` ($${li.cost.toFixed(2)})` : "";
                lines.push(
                    `  - ${li.description} [${li.component.name} / ${li.component.category ?? "Other"}]${cost}`,
                );
            }

            for (const note of record.serviceNotes) {
                lines.push(`  [${note.type}] ${note.title}: ${note.content}`);
            }
            lines.push("");
        }

        lines.push("=== COMPONENT SUMMARY ===");
        for (const comp of components) {
            const serviceCount = comp.lineItems.length;
            const latest = comp.lineItems[comp.lineItems.length - 1];
            const lastDate = latest
                ? new Date(latest.serviceRecord.serviceDate).toLocaleDateString(
                      "en-US",
                      {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                      },
                  )
                : "never";
            const lastMileage = latest?.serviceRecord.mileage;

            lines.push(
                `${comp.name} (${comp.category ?? "Other"}): serviced ${serviceCount}x, last ${lastDate}${lastMileage ? ` @ ${lastMileage.toLocaleString()} mi` : ""}`,
            );
            for (const li of comp.lineItems) {
                const date = new Date(
                    li.serviceRecord.serviceDate,
                ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                });
                lines.push(
                    `    ${date}${li.serviceRecord.mileage ? ` @ ${li.serviceRecord.mileage.toLocaleString()} mi` : ""}: ${li.description}`,
                );
            }
        }

        const vehicleData = lines.join("\n");

        // Run AI diagnostic
        const result = await runDiagnostic(vehicleData);

        // Store the report
        const report = await prisma.shelbyDiagnosticReport.create({
            data: {
                vehicleId: vehicle.id,
                mileage: vehicle.mileage,
                content: result as unknown as Prisma.InputJsonValue,
            },
        });

        return NextResponse.json({
            id: report.id,
            mileage: report.mileage,
            content: report.content,
            createdAt: report.createdAt.toISOString(),
        });
    } catch (e) {
        console.error("Diagnostic error:", e);
        return NextResponse.json(
            {
                error:
                    e instanceof Error
                        ? e.message
                        : "Diagnostic analysis failed",
            },
            { status: 500 },
        );
    }
}
