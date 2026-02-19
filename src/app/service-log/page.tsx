import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { GradientDivider } from "@/components/GradientDivider";
import { AddServiceForm } from "./AddServiceForm";
import { CurrencyToggle } from "./CurrencyToggle";
import { GuessDateButton } from "./GuessDateButton";
import { DeleteRecordButton } from "./DeleteRecordButton";

export const dynamic = "force-dynamic";

const NOTE_STYLES = {
    INSPECTION: { label: "Inspection", color: "text-blue-400/80" },
    MEASUREMENT: { label: "Measurement", color: "text-cyan-400/80" },
    RECOMMENDATION: { label: "Recommendation", color: "text-amber-400/80" },
    CONCERN: { label: "Concern", color: "text-red-400/80" },
    OBSERVATION: { label: "Observation", color: "text-purple-400/80" },
} as const;

export default async function ServiceLogPage() {
    const vehicle = await prisma.shelbyVehicle.findFirst();
    if (!vehicle) redirect("/setup");

    const records = await prisma.shelbyServiceRecord.findMany({
        where: { vehicleId: vehicle.id },
        orderBy: { serviceDate: "desc" },
        include: {
            lineItems: {
                include: { component: true },
            },
            serviceNotes: {
                orderBy: { type: "asc" },
            },
            document: {
                select: { originalFilename: true },
            },
        },
    });

    return (
        <PageShell>
            <GradientDivider label="Service Log" />

            <div className="mt-8">
                <AddServiceForm />
            </div>

            <div className="mt-4 space-y-4">
                {records.length === 0 && (
                    <p className="text-center text-xs font-mono text-neutral-600">
                        No service records yet. Upload documents or log a
                        service manually.
                    </p>
                )}

                {records.map((record) => {
                    const formatted = record.serviceDate
                        ? new Date(record.serviceDate).toLocaleDateString(
                              "en-US",
                              {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                              },
                          )
                        : record.mileage
                          ? `@ ${record.mileage.toLocaleString()} mi`
                          : "Unknown";
                    const totalCost = record.lineItems.reduce(
                        (sum, li) => sum + (li.cost ?? 0),
                        0,
                    );

                    return (
                        <div
                            key={record.id}
                            className="rounded-xl border border-neutral-800/60 bg-white/[0.01] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-4 pt-4 pb-3 flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-lg font-mono text-white tabular-nums">
                                            {formatted}
                                        </p>
                                        {!record.serviceDate &&
                                            record.mileage && (
                                                <GuessDateButton
                                                    recordId={record.id}
                                                />
                                            )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        {record.mileage &&
                                            record.serviceDate && (
                                                <span className="text-[10px] font-mono tracking-wider text-neutral-500">
                                                    {record.mileage.toLocaleString()}{" "}
                                                    MI
                                                </span>
                                            )}
                                        {record.shop && (
                                            <span className="text-[10px] font-mono tracking-wider text-neutral-500">
                                                {record.shop}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {totalCost > 0 && (
                                    <span className="text-sm font-mono text-neutral-400">
                                        {record.currency === "CAD"
                                            ? "CA$"
                                            : "$"}
                                        {totalCost.toFixed(2)}
                                    </span>
                                )}
                            </div>

                            {/* Line items */}
                            {record.lineItems.length > 0 && (
                                <div className="border-t border-neutral-800/40 divide-y divide-neutral-800/30">
                                    {record.lineItems.map((li) => (
                                        <div
                                            key={li.id}
                                            className="px-4 py-2.5 flex items-center justify-between"
                                        >
                                            <div>
                                                <span className="text-xs font-mono text-neutral-300">
                                                    {li.component.name}
                                                </span>
                                                {li.description !==
                                                    li.component.name && (
                                                    <span className="text-[10px] text-neutral-600 ml-2">
                                                        {li.description}
                                                    </span>
                                                )}
                                            </div>
                                            {li.cost != null && li.cost > 0 && (
                                                <span className="text-[10px] font-mono text-neutral-500">
                                                    {record.currency === "CAD"
                                                        ? "CA$"
                                                        : "$"}
                                                    {li.cost.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Notes */}
                            {record.serviceNotes.length > 0 && (
                                <div className="border-t border-neutral-800/40 px-4 py-3 space-y-3">
                                    {record.serviceNotes.map((note) => {
                                        const style =
                                            NOTE_STYLES[note.type] ??
                                            NOTE_STYLES.OBSERVATION;
                                        return (
                                            <div key={note.id}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span
                                                        className={`text-[9px] font-mono tracking-[0.2em] uppercase ${style.color}`}
                                                    >
                                                        {style.label}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-neutral-400">
                                                        {note.title}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] leading-relaxed text-neutral-500 whitespace-pre-line">
                                                    {note.content}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Footer */}
                            <div className="px-4 py-2 border-t border-neutral-800/40 bg-white/[0.01] flex items-center justify-between">
                                <span className="text-[9px] font-mono text-neutral-700 tracking-wider">
                                    {record.document
                                        ? `Source: ${record.document.originalFilename}`
                                        : "Manual entry"}
                                </span>
                                <div className="flex items-center gap-3">
                                    <CurrencyToggle
                                        recordId={record.id}
                                        currency={record.currency}
                                    />
                                    <DeleteRecordButton recordId={record.id} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </PageShell>
    );
}
