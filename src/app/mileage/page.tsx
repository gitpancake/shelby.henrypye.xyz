import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { GradientDivider } from "@/components/GradientDivider";
import { OdometerTimeline } from "./OdometerTimeline";
import { AddReadingForm } from "./AddReadingForm";

export const dynamic = "force-dynamic";

export default async function MileagePage() {
    const vehicle = await prisma.shelbyVehicle.findFirst();
    if (!vehicle) redirect("/setup");

    // Get standalone odometer readings
    const odometerReadings = await prisma.shelbyOdometerReading.findMany({
        where: { vehicleId: vehicle.id },
        orderBy: { date: "desc" },
    });

    // Get service records with mileage
    const serviceRecords = await prisma.shelbyServiceRecord.findMany({
        where: { vehicleId: vehicle.id, mileage: { not: null } },
        orderBy: { serviceDate: "desc" },
        include: { document: { select: { originalFilename: true } } },
    });

    // Merge into unified timeline
    const entries: { date: string; mileage: number; source: string }[] = [];

    for (const r of odometerReadings) {
        entries.push({
            date: r.date.toISOString(),
            mileage: r.mileage,
            source: r.source,
        });
    }

    for (const r of serviceRecords) {
        entries.push({
            date: r.serviceDate.toISOString(),
            mileage: r.mileage!,
            source: r.document?.originalFilename ?? "Manual entry",
        });
    }

    // Deduplicate by date+mileage, sort newest first
    const seen = new Set<string>();
    const unique = entries.filter((e) => {
        const key = `${e.date.slice(0, 10)}-${e.mileage}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    unique.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return (
        <PageShell>
            <GradientDivider label="Odometer" />

            <div className="mt-8 space-y-6">
                <AddReadingForm />
                <OdometerTimeline entries={unique} />
            </div>
        </PageShell>
    );
}
