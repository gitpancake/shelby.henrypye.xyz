"use client";

import { useState } from "react";

interface ServiceHistoryEntry {
    date: string | null;
    mileage: number | null;
    shop: string | null;
    description: string;
    cost: number | null;
}

interface ComponentData {
    name: string;
    category: string;
    timesServiced: number;
    lastDate: string | null;
    lastMileage: number | null;
    daysSince: number | null;
    milesSince: number | null;
    totalCost: number;
    serviceHistory: ServiceHistoryEntry[];
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function ComponentCard({ component }: { component: ComponentData }) {
    const [expanded, setExpanded] = useState(false);
    const c = component;

    let borderClass = "border-border";
    let bgClass = "bg-muted/30";
    if (c.milesSince != null) {
        if (c.milesSince > 30000) {
            borderClass = "border-red-900/30";
            bgClass = "bg-red-500/[0.02]";
        } else if (c.milesSince > 15000) {
            borderClass = "border-amber-900/30";
            bgClass = "bg-amber-500/[0.02]";
        }
    }

    return (
        <div
            className={`rounded-xl border ${borderClass} ${bgClass} overflow-hidden`}
        >
            <div className="px-4 py-3">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-mono text-foreground">{c.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[9px] font-mono tracking-wider uppercase text-muted-foreground">
                                {c.category}
                            </span>
                            <button
                                type="button"
                                onClick={() => setExpanded(!expanded)}
                                className="text-[9px] font-mono text-muted-foreground hover:text-muted-foreground transition-colors"
                            >
                                {c.timesServiced}x serviced{" "}
                                {expanded ? "▾" : "▸"}
                            </button>
                            {c.totalCost > 0 && (
                                <span className="text-[9px] font-mono text-muted-foreground">
                                    ${c.totalCost.toFixed(0)} total
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        {c.lastDate && (
                            <p className="text-[10px] font-mono text-muted-foreground">
                                {formatDate(c.lastDate)}
                            </p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5 justify-end">
                            {c.milesSince != null && (
                                <span
                                    className={`text-[10px] font-mono tabular-nums ${
                                        c.milesSince > 30000
                                            ? "text-red-400/80"
                                            : c.milesSince > 15000
                                              ? "text-amber-400/80"
                                              : "text-muted-foreground"
                                    }`}
                                >
                                    {c.milesSince.toLocaleString()} mi ago
                                </span>
                            )}
                            {c.daysSince != null && (
                                <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                                    {c.daysSince}d
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Service History */}
            {expanded && c.serviceHistory.length > 0 && (
                <div className="border-t border-border divide-y divide-border">
                    {c.serviceHistory.map((entry, i) => (
                        <div
                            key={i}
                            className="px-4 py-2 flex items-center justify-between"
                        >
                            <div>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                    {entry.date
                                        ? formatDate(entry.date)
                                        : "Unknown date"}
                                </span>
                                {entry.shop && (
                                    <span className="text-[10px] font-mono text-muted-foreground ml-2">
                                        {entry.shop}
                                    </span>
                                )}
                                {entry.description && (
                                    <span className="text-[10px] font-mono text-muted-foreground ml-2">
                                        {entry.description}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                {entry.mileage != null && (
                                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                                        {entry.mileage.toLocaleString()} mi
                                    </span>
                                )}
                                {entry.cost != null && entry.cost > 0 && (
                                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                                        ${entry.cost.toFixed(2)}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function ComponentHealthSection({
    components,
}: {
    components: ComponentData[];
}) {
    if (components.length === 0) {
        return (
            <p className="text-center text-xs font-mono text-muted-foreground">
                No components tracked yet
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {components.map((c) => (
                <ComponentCard key={c.name} component={c} />
            ))}
        </div>
    );
}
