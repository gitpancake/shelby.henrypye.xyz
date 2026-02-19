"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";

interface DocumentCardProps {
    doc: {
        id: string;
        originalFilename: string;
        fileSize: number;
        status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
        errorMessage: string | null;
        uploadedAt: string;
        processedAt: string | null;
        _count: { serviceRecords: number };
    };
}

export function DocumentCard({ doc }: DocumentCardProps) {
    const router = useRouter();
    const [localStatus, setLocalStatus] = useState(doc.status);
    const [error, setError] = useState("");

    const poll = useCallback(async () => {
        try {
            const res = await fetch("/api/documents");
            if (!res.ok) return;
            const docs = await res.json();
            const updated = docs.find((d: { id: string }) => d.id === doc.id);
            if (updated && updated.status !== "PROCESSING") {
                setLocalStatus(updated.status);
                router.refresh();
            }
        } catch {
            // ignore polling errors
        }
    }, [doc.id, router]);

    // Poll while processing
    useEffect(() => {
        if (localStatus !== "PROCESSING") return;
        const interval = setInterval(poll, 3000);
        return () => clearInterval(interval);
    }, [localStatus, poll]);

    async function handleProcess() {
        setError("");
        setLocalStatus("PROCESSING");

        try {
            const res = await fetch(`/api/documents/${doc.id}/process`, {
                method: "POST",
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Processing failed");
                setLocalStatus("FAILED");
                return;
            }

            router.refresh();
        } catch {
            setError("Processing failed");
            setLocalStatus("FAILED");
        }
    }

    const sizeKB = Math.round(doc.fileSize / 1024);
    const date = new Date(doc.uploadedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    return (
        <div className="rounded-xl border border-neutral-800/60 bg-white/[0.01] p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono text-white truncate">
                        {doc.originalFilename}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-mono text-neutral-600">
                            {sizeKB} KB
                        </span>
                        <span className="text-[10px] font-mono text-neutral-600">
                            {date}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={localStatus} />
                </div>
            </div>

            {localStatus === "COMPLETED" && doc._count.serviceRecords > 0 && (
                <div className="mt-3 flex items-center justify-between">
                    <p className="text-[10px] font-mono text-neutral-500">
                        {doc._count.serviceRecords} service record
                        {doc._count.serviceRecords !== 1 ? "s" : ""} extracted
                    </p>
                    <button
                        type="button"
                        onClick={handleProcess}
                        className="rounded-md border border-neutral-800 px-2 py-1 text-[9px] font-mono tracking-wider uppercase text-neutral-600 transition-colors hover:bg-white/5 hover:text-neutral-400"
                    >
                        Reprocess
                    </button>
                </div>
            )}

            {localStatus === "PROCESSING" && (
                <p className="text-[10px] font-mono text-neutral-500 mt-3 animate-pulse">
                    Analyzing document with AI...
                </p>
            )}

            {(localStatus === "PENDING" || localStatus === "FAILED") && (
                <button
                    type="button"
                    onClick={handleProcess}
                    className="mt-3 w-full rounded-lg bg-white/5 border border-neutral-800 px-3 py-2 text-[10px] font-mono tracking-wider uppercase text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                    Extract Records
                </button>
            )}

            {doc.errorMessage && localStatus === "FAILED" && (
                <p className="text-[10px] font-mono text-red-400/80 mt-2">
                    {doc.errorMessage}
                </p>
            )}

            {error && (
                <p className="text-[10px] font-mono text-red-400/80 mt-2">
                    {error}
                </p>
            )}
        </div>
    );
}
