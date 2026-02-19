import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { GradientDivider } from "@/components/GradientDivider";
import { ComponentHealthSection } from "./ComponentHealthSection";

export const dynamic = "force-dynamic";

export default async function DiagnosticsPage() {
    const vehicle = await prisma.shelbyVehicle.findFirst();
    if (!vehicle) redirect("/setup");

    const [records, components, notes] = await Promise.all([
        prisma.shelbyServiceRecord.findMany({
            where: { vehicleId: vehicle.id },
            orderBy: { serviceDate: "desc" },
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
                    orderBy: { createdAt: "desc" },
                },
            },
            orderBy: [{ category: "asc" }, { name: "asc" }],
        }),
        prisma.shelbyNote.findMany({
            where: {
                serviceRecord: { vehicleId: vehicle.id },
            },
            include: {
                serviceRecord: {
                    select: { serviceDate: true, mileage: true, shop: true },
                },
            },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    // Summary stats
    const totalRecords = records.length;
    const totalComponents = components.length;
    const totalSpent = records.reduce(
        (sum, r) => sum + r.lineItems.reduce((s, li) => s + (li.cost ?? 0), 0),
        0,
    );
    const earliestDate =
        records.length > 0 ? records[records.length - 1].serviceDate : null;
    const latestDate = records.length > 0 ? records[0].serviceDate : null;

    // Concerns, recommendations, measurements
    const concerns = notes.filter((n) => n.type === "CONCERN");
    const recommendations = notes.filter((n) => n.type === "RECOMMENDATION");
    const measurements = notes.filter((n) => n.type === "MEASUREMENT");

    // Component health data
    const now = new Date();
    const componentHealth = components.map((c) => {
        const latestLineItem = c.lineItems[0];
        const lastDate = latestLineItem?.serviceRecord.serviceDate ?? null;
        const lastMileage = latestLineItem?.serviceRecord.mileage ?? null;
        const daysSince = lastDate
            ? Math.floor(
                  (now.getTime() - new Date(lastDate).getTime()) /
                      (1000 * 60 * 60 * 24),
              )
            : null;
        const milesSince =
            lastMileage != null ? vehicle.mileage - lastMileage : null;
        const totalCost = c.lineItems.reduce((s, li) => s + (li.cost ?? 0), 0);

        const serviceHistory = c.lineItems.map((li) => ({
            date: new Date(li.serviceRecord.serviceDate).toISOString(),
            mileage: li.serviceRecord.mileage,
            shop: li.serviceRecord.shop,
            description: li.description,
            cost: li.cost,
        }));

        return {
            name: c.name,
            category: c.category ?? "Other",
            timesServiced: c.lineItems.length,
            lastDate: lastDate ? new Date(lastDate).toISOString() : null,
            lastMileage,
            daysSince,
            milesSince,
            totalCost,
            serviceHistory,
        };
    });

    // Sort by miles since last service (highest first), nulls at end
    componentHealth.sort((a, b) => {
        if (a.milesSince == null && b.milesSince == null) return 0;
        if (a.milesSince == null) return 1;
        if (b.milesSince == null) return -1;
        return b.milesSince - a.milesSince;
    });

    const formatDate = (d: Date) =>
        new Date(d).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });

    return (
        <PageShell>
            <GradientDivider label="Diagnostics" />

            {/* Summary Stats */}
            <div className="mt-8 grid grid-cols-3 gap-px rounded-xl overflow-hidden border border-neutral-800/60 bg-neutral-800/40">
                {[
                    { label: "Records", value: totalRecords.toString() },
                    { label: "Components", value: totalComponents.toString() },
                    {
                        label: "Total Spent",
                        value:
                            totalSpent > 0 ? `$${totalSpent.toFixed(0)}` : "$0",
                    },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-[#060606] px-4 py-4 text-center"
                    >
                        <p className="text-lg font-mono text-white tabular-nums">
                            {stat.value}
                        </p>
                        <p className="text-[9px] font-mono tracking-[0.3em] uppercase text-neutral-600 mt-1">
                            {stat.label}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-px rounded-xl overflow-hidden border border-neutral-800/60 bg-neutral-800/40">
                {[
                    {
                        label: "Odometer",
                        value: `${vehicle.mileage.toLocaleString()} mi`,
                    },
                    {
                        label: "Earliest Record",
                        value: earliestDate ? formatDate(earliestDate) : "—",
                    },
                    {
                        label: "Latest Record",
                        value: latestDate ? formatDate(latestDate) : "—",
                    },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-[#060606] px-4 py-3 text-center"
                    >
                        <p className="text-sm font-mono text-white tabular-nums">
                            {stat.value}
                        </p>
                        <p className="text-[9px] font-mono tracking-[0.3em] uppercase text-neutral-600 mt-1">
                            {stat.label}
                        </p>
                    </div>
                ))}
            </div>

            {/* Attention Required */}
            {(concerns.length > 0 || recommendations.length > 0) && (
                <div className="mt-10">
                    <GradientDivider label="Attention Required" />
                    <div className="mt-6 space-y-3">
                        {concerns.map((note) => (
                            <div
                                key={note.id}
                                className="rounded-xl border border-red-900/30 bg-red-500/[0.03] px-4 py-3"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-red-400/80">
                                        Concern
                                    </span>
                                    <span className="text-[10px] font-mono text-neutral-500">
                                        {formatDate(
                                            note.serviceRecord.serviceDate,
                                        )}
                                        {note.serviceRecord.mileage && (
                                            <>
                                                {" "}
                                                &middot;{" "}
                                                {note.serviceRecord.mileage.toLocaleString()}{" "}
                                                mi
                                            </>
                                        )}
                                        {note.serviceRecord.shop && (
                                            <>
                                                {" "}
                                                &middot;{" "}
                                                {note.serviceRecord.shop}
                                            </>
                                        )}
                                    </span>
                                </div>
                                <p className="text-xs font-mono text-neutral-300">
                                    {note.title}
                                </p>
                                <p className="text-[11px] leading-relaxed text-neutral-500 mt-1 whitespace-pre-line">
                                    {note.content}
                                </p>
                            </div>
                        ))}

                        {recommendations.map((note) => (
                            <div
                                key={note.id}
                                className="rounded-xl border border-amber-900/30 bg-amber-500/[0.03] px-4 py-3"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-amber-400/80">
                                        Recommendation
                                    </span>
                                    <span className="text-[10px] font-mono text-neutral-500">
                                        {formatDate(
                                            note.serviceRecord.serviceDate,
                                        )}
                                        {note.serviceRecord.mileage && (
                                            <>
                                                {" "}
                                                &middot;{" "}
                                                {note.serviceRecord.mileage.toLocaleString()}{" "}
                                                mi
                                            </>
                                        )}
                                    </span>
                                </div>
                                <p className="text-xs font-mono text-neutral-300">
                                    {note.title}
                                </p>
                                <p className="text-[11px] leading-relaxed text-neutral-500 mt-1 whitespace-pre-line">
                                    {note.content}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Component Health */}
            <div className="mt-10">
                <GradientDivider label="Component Health" />
                <div className="mt-6">
                    <ComponentHealthSection components={componentHealth} />
                </div>
            </div>

            {/* Measurements Log */}
            {measurements.length > 0 && (
                <div className="mt-10">
                    <GradientDivider label="Measurements" />
                    <div className="mt-6 space-y-2">
                        {measurements.map((note) => (
                            <div
                                key={note.id}
                                className="rounded-xl border border-cyan-900/20 bg-cyan-500/[0.02] px-4 py-3"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-cyan-400/80">
                                        Measurement
                                    </span>
                                    <span className="text-[10px] font-mono text-neutral-500">
                                        {formatDate(
                                            note.serviceRecord.serviceDate,
                                        )}
                                        {note.serviceRecord.mileage && (
                                            <>
                                                {" "}
                                                &middot;{" "}
                                                {note.serviceRecord.mileage.toLocaleString()}{" "}
                                                mi
                                            </>
                                        )}
                                    </span>
                                </div>
                                <p className="text-xs font-mono text-neutral-300">
                                    {note.title}
                                </p>
                                <p className="text-[11px] leading-relaxed text-neutral-500 mt-1 whitespace-pre-line">
                                    {note.content}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </PageShell>
    );
}
