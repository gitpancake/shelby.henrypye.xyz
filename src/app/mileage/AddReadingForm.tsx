"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddReadingForm() {
    const router = useRouter();
    const [date, setDate] = useState("");
    const [mileage, setMileage] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSaving(true);

        try {
            const res = await fetch("/api/odometer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date, mileage: Number(mileage) }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to save");
                return;
            }

            setDate("");
            setMileage("");
            router.refresh();
        } catch {
            setError("Failed to save");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="rounded-xl border border-neutral-800/60 bg-white/[0.01] p-4">
            <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-neutral-600 mb-3">
                Add Reading
            </p>
            <div className="flex items-end gap-3">
                <div className="flex-1">
                    <label className="block text-[9px] font-mono tracking-wider uppercase text-neutral-700 mb-1">
                        Date
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className="w-full rounded-lg border border-neutral-800 bg-black/50 px-3 py-2 text-xs font-mono text-white placeholder-neutral-700 focus:border-neutral-600 focus:outline-none"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-[9px] font-mono tracking-wider uppercase text-neutral-700 mb-1">
                        Mileage
                    </label>
                    <input
                        type="number"
                        value={mileage}
                        onChange={(e) => setMileage(e.target.value)}
                        required
                        placeholder="0"
                        className="w-full rounded-lg border border-neutral-800 bg-black/50 px-3 py-2 text-xs font-mono text-white placeholder-neutral-700 focus:border-neutral-600 focus:outline-none"
                    />
                </div>
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-white/5 border border-neutral-800 px-4 py-2 text-[10px] font-mono tracking-wider uppercase text-neutral-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                    {saving ? "..." : "Add"}
                </button>
            </div>
            {error && (
                <p className="text-[10px] font-mono text-red-400/80 mt-2">
                    {error}
                </p>
            )}
        </form>
    );
}
