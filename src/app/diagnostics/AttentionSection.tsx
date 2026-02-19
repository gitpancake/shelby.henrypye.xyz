"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface NoteData {
    id: string;
    type: string;
    title: string;
    content: string;
    serviceRecord: {
        serviceDate: string;
        mileage: number | null;
        shop: string | null;
    };
    resolvedByRecord: {
        id: string;
        serviceDate: string;
        mileage: number | null;
        shop: string | null;
    } | null;
}

interface ServiceRecordOption {
    id: string;
    serviceDate: string;
    mileage: number | null;
    shop: string | null;
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function NoteCard({
    note,
    serviceRecords,
    resolved,
}: {
    note: NoteData;
    serviceRecords: ServiceRecordOption[];
    resolved: boolean;
}) {
    const router = useRouter();
    const [picking, setPicking] = useState(false);
    const [loading, setLoading] = useState(false);

    const isConcern = note.type === "CONCERN";
    const label = isConcern ? "Concern" : "Recommendation";
    const labelColor = isConcern ? "text-red-400/80" : "text-amber-400/80";
    const borderColor = resolved
        ? "border-neutral-800/40"
        : isConcern
          ? "border-red-900/30"
          : "border-amber-900/30";
    const bgColor = resolved
        ? "bg-white/[0.01]"
        : isConcern
          ? "bg-red-500/[0.03]"
          : "bg-amber-500/[0.03]";

    async function handleResolve(serviceRecordId: string) {
        setLoading(true);
        try {
            await fetch(`/api/notes/${note.id}/resolve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serviceRecordId }),
            });
            router.refresh();
        } finally {
            setLoading(false);
            setPicking(false);
        }
    }

    async function handleUnresolve() {
        setLoading(true);
        try {
            await fetch(`/api/notes/${note.id}/resolve`, { method: "DELETE" });
            router.refresh();
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={`rounded-xl border ${borderColor} ${bgColor} px-4 py-3`}>
            <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                    {resolved && (
                        <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-green-400/80">
                            Resolved
                        </span>
                    )}
                    <span className={`text-[9px] font-mono tracking-[0.2em] uppercase ${resolved ? "text-neutral-700" : labelColor}`}>
                        {label}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                        {formatDate(note.serviceRecord.serviceDate)}
                        {note.serviceRecord.mileage && (
                            <> &middot; {note.serviceRecord.mileage.toLocaleString()} mi</>
                        )}
                        {note.serviceRecord.shop && (
                            <> &middot; {note.serviceRecord.shop}</>
                        )}
                    </span>
                </div>

                {!resolved && !picking && (
                    <button
                        type="button"
                        onClick={() => setPicking(true)}
                        disabled={loading}
                        className="shrink-0 rounded-md border border-neutral-800 px-2 py-0.5 text-[9px] font-mono tracking-wider uppercase text-neutral-600 transition-colors hover:bg-white/5 hover:text-neutral-400"
                    >
                        Resolve
                    </button>
                )}

                {resolved && (
                    <button
                        type="button"
                        onClick={handleUnresolve}
                        disabled={loading}
                        className="shrink-0 rounded-md border border-neutral-800/40 px-2 py-0.5 text-[9px] font-mono tracking-wider uppercase text-neutral-700 transition-colors hover:bg-white/5 hover:text-neutral-500"
                    >
                        Unresolve
                    </button>
                )}
            </div>

            <p className={`text-xs font-mono ${resolved ? "text-neutral-500" : "text-neutral-300"}`}>
                {note.title}
            </p>
            <p className={`text-[11px] leading-relaxed mt-1 whitespace-pre-line ${resolved ? "text-neutral-700" : "text-neutral-500"}`}>
                {note.content}
            </p>

            {resolved && note.resolvedByRecord && (
                <p className="text-[9px] font-mono text-green-400/60 mt-2">
                    Resolved by: {formatDate(note.resolvedByRecord.serviceDate)}
                    {note.resolvedByRecord.mileage && (
                        <> &middot; {note.resolvedByRecord.mileage.toLocaleString()} mi</>
                    )}
                    {note.resolvedByRecord.shop && (
                        <> &middot; {note.resolvedByRecord.shop}</>
                    )}
                </p>
            )}

            {picking && (
                <div className="mt-3 rounded-lg border border-neutral-800/60 bg-black/50 overflow-hidden">
                    <p className="px-3 py-2 text-[9px] font-mono tracking-wider uppercase text-neutral-600 border-b border-neutral-800/40">
                        Select the repair that resolved this
                    </p>
                    <div className="max-h-48 overflow-y-auto divide-y divide-neutral-800/30">
                        {serviceRecords.map((r) => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => handleResolve(r.id)}
                                disabled={loading}
                                className="w-full px-3 py-2 text-left transition-colors hover:bg-white/5 disabled:opacity-50"
                            >
                                <span className="text-[10px] font-mono text-neutral-300">
                                    {formatDate(r.serviceDate)}
                                </span>
                                <span className="text-[10px] font-mono text-neutral-600 ml-2">
                                    {r.mileage ? `${r.mileage.toLocaleString()} mi` : ""}
                                    {r.shop ? ` · ${r.shop}` : ""}
                                </span>
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setPicking(false)}
                        className="w-full px-3 py-2 text-[9px] font-mono tracking-wider uppercase text-neutral-700 border-t border-neutral-800/40 transition-colors hover:bg-white/5 hover:text-neutral-500"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}

export function AttentionSection({
    notes,
    serviceRecords,
}: {
    notes: NoteData[];
    serviceRecords: ServiceRecordOption[];
}) {
    const [showResolved, setShowResolved] = useState(false);

    const unresolved = notes.filter((n) => !n.resolvedByRecord);
    const resolved = notes.filter((n) => n.resolvedByRecord);

    if (notes.length === 0) return null;

    return (
        <div className="space-y-3">
            {unresolved.map((note) => (
                <NoteCard
                    key={note.id}
                    note={note}
                    serviceRecords={serviceRecords}
                    resolved={false}
                />
            ))}

            {resolved.length > 0 && (
                <>
                    <button
                        type="button"
                        onClick={() => setShowResolved(!showResolved)}
                        className="w-full rounded-lg border border-neutral-800/40 px-3 py-2 text-[10px] font-mono tracking-wider uppercase text-neutral-600 transition-colors hover:bg-white/5 hover:text-neutral-400"
                    >
                        {showResolved ? "Hide" : "Show"} {resolved.length} resolved item{resolved.length !== 1 ? "s" : ""}
                    </button>

                    {showResolved && (
                        <div className="space-y-2">
                            {resolved.map((note) => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    serviceRecords={serviceRecords}
                                    resolved={true}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
