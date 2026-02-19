"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
    "Fluids",
    "Engine",
    "Brakes",
    "Cooling",
    "Transmission",
    "Drivetrain",
    "Suspension",
    "Steering",
    "Electrical",
    "Exhaust",
    "Filters",
    "Ignition",
    "Body",
    "Tires",
    "HVAC",
];

export function AddServiceForm() {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const [date, setDate] = useState("");
    const [description, setDescription] = useState("");
    const [componentName, setComponentName] = useState("");
    const [category, setCategory] = useState("Engine");
    const [cost, setCost] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [mileage, setMileage] = useState("");
    const [shop, setShop] = useState("");
    const [notes, setNotes] = useState("");

    function reset() {
        setDate("");
        setDescription("");
        setComponentName("");
        setCategory("Engine");
        setCost("");
        setCurrency("USD");
        setMileage("");
        setShop("");
        setNotes("");
        setError(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        if (!date && !mileage) {
            setError("Provide at least a date or mileage");
            setSaving(false);
            return;
        }

        try {
            const res = await fetch("/api/service-records", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date,
                    description,
                    componentName,
                    category,
                    cost: cost || null,
                    currency,
                    mileage: mileage || null,
                    shop: shop || null,
                    notes: notes || null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save");
            }

            reset();
            setOpen(false);
            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Something went wrong",
            );
        } finally {
            setSaving(false);
        }
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="w-full rounded-xl border border-dashed border-neutral-800/60 bg-transparent px-4 py-3 font-mono text-xs tracking-[0.2em] uppercase text-neutral-500 transition-all hover:border-neutral-700 hover:text-neutral-300"
            >
                + Log Service
            </button>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-neutral-800/60 bg-white/[0.01] p-4 space-y-3"
        >
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[9px] font-mono tracking-[0.3em] uppercase text-neutral-600 mb-1">
                        Date
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-lg border border-neutral-800/60 bg-[#060606] px-3 py-2 font-mono text-xs text-white [color-scheme:dark]"
                    />
                </div>
                <div>
                    <label className="block text-[9px] font-mono tracking-[0.3em] uppercase text-neutral-600 mb-1">
                        Cost
                    </label>
                    <div className="flex gap-1.5">
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                            placeholder="0.00"
                            className="flex-1 rounded-lg border border-neutral-800/60 bg-[#060606] px-3 py-2 font-mono text-xs text-white placeholder:text-neutral-700"
                        />
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="rounded-lg border border-neutral-800/60 bg-[#060606] px-2 py-2 font-mono text-xs text-white"
                        >
                            <option value="USD">USD</option>
                            <option value="CAD">CAD</option>
                        </select>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-[9px] font-mono tracking-[0.3em] uppercase text-neutral-600 mb-1">
                    Description *
                </label>
                <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Alternator installation"
                    className="w-full rounded-lg border border-neutral-800/60 bg-[#060606] px-3 py-2 font-mono text-xs text-white placeholder:text-neutral-700"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[9px] font-mono tracking-[0.3em] uppercase text-neutral-600 mb-1">
                        Component *
                    </label>
                    <input
                        type="text"
                        required
                        value={componentName}
                        onChange={(e) => setComponentName(e.target.value)}
                        placeholder="e.g. Alternator"
                        className="w-full rounded-lg border border-neutral-800/60 bg-[#060606] px-3 py-2 font-mono text-xs text-white placeholder:text-neutral-700"
                    />
                </div>
                <div>
                    <label className="block text-[9px] font-mono tracking-[0.3em] uppercase text-neutral-600 mb-1">
                        Category *
                    </label>
                    <select
                        required
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-lg border border-neutral-800/60 bg-[#060606] px-3 py-2 font-mono text-xs text-white"
                    >
                        {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[9px] font-mono tracking-[0.3em] uppercase text-neutral-600 mb-1">
                        Mileage
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={mileage}
                        onChange={(e) => setMileage(e.target.value)}
                        placeholder="Odometer reading"
                        className="w-full rounded-lg border border-neutral-800/60 bg-[#060606] px-3 py-2 font-mono text-xs text-white placeholder:text-neutral-700"
                    />
                </div>
                <div>
                    <label className="block text-[9px] font-mono tracking-[0.3em] uppercase text-neutral-600 mb-1">
                        Shop / Provider
                    </label>
                    <input
                        type="text"
                        value={shop}
                        onChange={(e) => setShop(e.target.value)}
                        placeholder="e.g. Local mechanic"
                        className="w-full rounded-lg border border-neutral-800/60 bg-[#060606] px-3 py-2 font-mono text-xs text-white placeholder:text-neutral-700"
                    />
                </div>
            </div>

            <div>
                <label className="block text-[9px] font-mono tracking-[0.3em] uppercase text-neutral-600 mb-1">
                    Notes
                </label>
                <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional details"
                    className="w-full rounded-lg border border-neutral-800/60 bg-[#060606] px-3 py-2 font-mono text-xs text-white placeholder:text-neutral-700"
                />
            </div>

            {error && (
                <p className="text-[11px] font-mono text-red-400">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
                <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg border border-neutral-800/60 bg-white/[0.03] px-4 py-2 font-mono text-xs tracking-[0.2em] uppercase text-neutral-300 transition-all hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                >
                    {saving ? "..." : "Save"}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        reset();
                        setOpen(false);
                    }}
                    className="rounded-lg border border-neutral-800/60 px-4 py-2 font-mono text-xs tracking-[0.2em] uppercase text-neutral-600 transition-all hover:text-neutral-400"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
