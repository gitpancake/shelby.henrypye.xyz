"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GuessDateButton({ recordId }: { recordId: string }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function handleGuess() {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/service-records/${recordId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guessDate: true }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to estimate");
            }

            router.refresh();
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Failed to estimate date",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <span className="inline-flex items-center gap-1.5">
            <button
                onClick={handleGuess}
                disabled={loading}
                className="text-[9px] font-mono tracking-[0.2em] uppercase text-amber-400/60 hover:text-amber-400 transition-colors disabled:opacity-50"
            >
                {loading ? "..." : "Guess date"}
            </button>
            {error && (
                <span className="text-[9px] font-mono text-red-400/60">
                    {error}
                </span>
            )}
        </span>
    );
}
