"use client";

interface OdometerEntry {
    date: string;
    mileage: number;
    source: string;
}

export function OdometerTimeline({ entries }: { entries: OdometerEntry[] }) {
    if (entries.length === 0) {
        return (
            <p className="text-center text-xs font-mono text-neutral-600">
                No odometer readings yet
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {entries.map((entry, i) => {
                const date = new Date(entry.date);
                const formatted = date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                });

                // Calculate miles since previous reading (entries are newest-first)
                const prev = entries[i + 1];
                const delta = prev ? entry.mileage - prev.mileage : null;

                return (
                    <div
                        key={`${entry.date}-${entry.mileage}`}
                        className="rounded-xl border border-neutral-800/60 bg-white/[0.01] px-4 py-3 flex items-center justify-between"
                    >
                        <div>
                            <p className="text-sm font-mono text-white tabular-nums">
                                {entry.mileage.toLocaleString()}
                                <span className="text-[10px] text-neutral-600 ml-1.5 tracking-wider">
                                    MI
                                </span>
                            </p>
                            <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                                {formatted}
                            </p>
                        </div>
                        <div className="text-right">
                            {delta !== null && delta > 0 && (
                                <p className="text-[10px] font-mono text-neutral-600 tabular-nums">
                                    +{delta.toLocaleString()} mi
                                </p>
                            )}
                            <p className="text-[9px] font-mono text-neutral-700 mt-0.5">
                                {entry.source}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
