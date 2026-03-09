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
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-muted-foreground mb-3">
                Add Reading
            </p>
            <div className="flex items-end gap-3">
                <div className="flex-1">
                    <label className="block text-[9px] font-mono tracking-wider uppercase text-muted-foreground mb-1">
                        Date
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs font-mono text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-[9px] font-mono tracking-wider uppercase text-muted-foreground mb-1">
                        Mileage
                    </label>
                    <input
                        type="number"
                        value={mileage}
                        onChange={(e) => setMileage(e.target.value)}
                        required
                        placeholder="0"
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs font-mono text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none"
                    />
                </div>
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-muted border border-border px-4 py-2 text-[10px] font-mono tracking-wider uppercase text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
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
