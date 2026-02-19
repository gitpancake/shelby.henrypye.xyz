"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunDiagnosticButton() {
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function handleRun() {
        setRunning(true);
        setError(null);

        try {
            const res = await fetch("/api/diagnostics/run", {
                method: "POST",
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Diagnostic failed");
            }

            router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setRunning(false);
        }
    }

    return (
        <div className="space-y-3">
            <button
                onClick={handleRun}
                disabled={running}
                className="w-full rounded-xl border border-neutral-800/60 bg-[#060606] px-4 py-3 font-mono text-xs tracking-[0.2em] uppercase text-neutral-300 transition-all hover:border-neutral-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {running ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                        Analyzing vehicle data...
                    </span>
                ) : (
                    "Run Diagnostic"
                )}
            </button>

            {error && (
                <p className="text-[11px] font-mono text-red-400 text-center">
                    {error}
                </p>
            )}
        </div>
    );
}
