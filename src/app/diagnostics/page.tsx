import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { GradientDivider } from "@/components/GradientDivider";
import { ComponentHealthSection } from "./ComponentHealthSection";
import { RunDiagnosticButton } from "./RunDiagnosticButton";
import type { DiagnosticResult } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

export default async function DiagnosticsPage() {
    const vehicle = await prisma.shelbyVehicle.findFirst();
    if (!vehicle) redirect("/setup");

    const [records, components, latestReport] = await Promise.all([
        prisma.shelbyServiceRecord.findMany({
            where: { vehicleId: vehicle.id },
            orderBy: { serviceDate: "desc" },
            include: {
                lineItems: { include: { component: true } },
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
        prisma.shelbyDiagnosticReport.findFirst({
            where: { vehicleId: vehicle.id },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    // Summary stats
    const totalRecords = records.length;
    const totalComponents = components.length;
    const spentByCurrency: Record<string, number> = {};
    for (const r of records) {
        const cost = r.lineItems.reduce((s, li) => s + (li.cost ?? 0), 0);
        if (cost > 0) {
            spentByCurrency[r.currency] =
                (spentByCurrency[r.currency] ?? 0) + cost;
        }
    }
    const earliestDate =
        records.length > 0 ? records[records.length - 1].serviceDate : null;
    const latestDate = records.length > 0 ? records[0].serviceDate : null;

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

    componentHealth.sort((a, b) => {
        if (a.milesSince == null && b.milesSince == null) return 0;
        if (a.milesSince == null) return 1;
        if (b.milesSince == null) return -1;
        return b.milesSince - a.milesSince;
    });

    const formatDate = (d: Date | string) =>
        new Date(d).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });

    const report = latestReport
        ? (latestReport.content as unknown as DiagnosticResult)
        : null;

    return (
        <PageShell>
            <GradientDivider label="Diagnostics" />

            {/* Summary Stats */}
            <div className="mt-8 grid grid-cols-2 gap-px rounded-xl overflow-hidden border border-neutral-800/60 bg-neutral-800/40">
                {[
                    { label: "Records", value: totalRecords.toString() },
                    { label: "Components", value: totalComponents.toString() },
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

            <div
                className={`mt-2 grid gap-px rounded-xl overflow-hidden border border-neutral-800/60 bg-neutral-800/40 ${Object.keys(spentByCurrency).length === 2 ? "grid-cols-2" : "grid-cols-1"}`}
            >
                {Object.keys(spentByCurrency).length > 0 ? (
                    Object.entries(spentByCurrency).map(([cur, amount]) => (
                        <div
                            key={cur}
                            className="bg-[#060606] px-4 py-4 text-center"
                        >
                            <p className="text-lg font-mono text-white tabular-nums">
                                {cur === "CAD" ? "CA$" : "$"}
                                {amount.toFixed(0)}
                            </p>
                            <p className="text-[9px] font-mono tracking-[0.3em] uppercase text-neutral-600 mt-1">
                                Spent ({cur})
                            </p>
                        </div>
                    ))
                ) : (
                    <div className="bg-[#060606] px-4 py-4 text-center">
                        <p className="text-lg font-mono text-white tabular-nums">
                            $0
                        </p>
                        <p className="text-[9px] font-mono tracking-[0.3em] uppercase text-neutral-600 mt-1">
                            Total Spent
                        </p>
                    </div>
                )}
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

            {/* Run Diagnostic */}
            <div className="mt-8">
                <RunDiagnosticButton />
            </div>

            {/* Latest Report */}
            {report && latestReport && (
                <div className="mt-8 space-y-4">
                    <GradientDivider label="Diagnostic Report" />

                    {/* Urgent */}
                    {report.urgent.length > 0 && (
                        <div className="mt-6 space-y-3">
                            <p className="text-[9px] font-mono tracking-[0.3em] uppercase text-red-400/80">
                                Urgent
                            </p>
                            {report.urgent.map((item, i) => (
                                <div
                                    key={i}
                                    className="rounded-xl border border-red-900/30 bg-red-500/[0.03] px-4 py-3"
                                >
                                    <p className="text-xs font-mono text-red-300">
                                        {item.title}
                                    </p>
                                    {item.component && (
                                        <span className="inline-block mt-1 text-[9px] font-mono tracking-[0.2em] uppercase text-red-400/60">
                                            {item.component}
                                        </span>
                                    )}
                                    <p className="text-[11px] leading-relaxed text-neutral-400 mt-1.5">
                                        {item.detail}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Upcoming */}
                    {report.upcoming.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-[9px] font-mono tracking-[0.3em] uppercase text-amber-400/80">
                                Upcoming Maintenance
                            </p>
                            {report.upcoming.map((item, i) => (
                                <div
                                    key={i}
                                    className="rounded-xl border border-amber-900/30 bg-amber-500/[0.03] px-4 py-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-mono text-amber-300">
                                            {item.title}
                                        </p>
                                        {item.estimatedMiles && (
                                            <span className="text-[10px] font-mono text-amber-400/60 tabular-nums">
                                                ~
                                                {item.estimatedMiles.toLocaleString()}{" "}
                                                mi
                                            </span>
                                        )}
                                    </div>
                                    {item.component && (
                                        <span className="inline-block mt-1 text-[9px] font-mono tracking-[0.2em] uppercase text-amber-400/60">
                                            {item.component}
                                        </span>
                                    )}
                                    <p className="text-[11px] leading-relaxed text-neutral-400 mt-1.5">
                                        {item.detail}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Monitoring */}
                    {report.monitoring.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-[9px] font-mono tracking-[0.3em] uppercase text-neutral-500">
                                Monitoring
                            </p>
                            {report.monitoring.map((item, i) => (
                                <div
                                    key={i}
                                    className="rounded-xl border border-neutral-800/60 bg-neutral-500/[0.03] px-4 py-3"
                                >
                                    <p className="text-xs font-mono text-neutral-300">
                                        {item.title}
                                    </p>
                                    <p className="text-[11px] leading-relaxed text-neutral-500 mt-1.5">
                                        {item.detail}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Service Provider Notes */}
                    {report.serviceProviderNotes && (
                        <div className="space-y-3">
                            <p className="text-[9px] font-mono tracking-[0.3em] uppercase text-cyan-400/80">
                                Service Provider Notes
                            </p>
                            <div className="rounded-xl border border-cyan-900/20 bg-cyan-500/[0.02] px-4 py-3">
                                <p className="text-[11px] leading-relaxed text-neutral-300 whitespace-pre-line">
                                    {report.serviceProviderNotes}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Summary */}
                    {report.summary && (
                        <div className="space-y-3">
                            <p className="text-[9px] font-mono tracking-[0.3em] uppercase text-neutral-500">
                                Overall Assessment
                            </p>
                            <div className="rounded-xl border border-neutral-800/60 bg-[#060606] px-4 py-3">
                                <p className="text-[11px] leading-relaxed text-neutral-400 whitespace-pre-line">
                                    {report.summary}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Report metadata */}
                    <p className="text-[9px] font-mono text-neutral-600 text-center pt-2">
                        Generated {formatDate(latestReport.createdAt)} at{" "}
                        {latestReport.mileage.toLocaleString()} mi
                    </p>
                </div>
            )}

            {/* Component Health */}
            <div className="mt-10">
                <GradientDivider label="Component Health" />
                <div className="mt-6">
                    <ComponentHealthSection components={componentHealth} />
                </div>
            </div>
        </PageShell>
    );
}
