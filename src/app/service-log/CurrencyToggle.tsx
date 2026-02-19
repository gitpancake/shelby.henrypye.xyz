"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CurrencyToggle({
    recordId,
    currency,
}: {
    recordId: string;
    currency: string;
}) {
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    async function toggle() {
        setSaving(true);
        const newCurrency = currency === "USD" ? "CAD" : "USD";

        await fetch(`/api/service-records/${recordId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currency: newCurrency }),
        });

        setSaving(false);
        router.refresh();
    }

    return (
        <button
            onClick={toggle}
            disabled={saving}
            className="text-[9px] font-mono tracking-[0.2em] uppercase text-neutral-600 hover:text-neutral-400 transition-colors disabled:opacity-50"
            title={`Switch to ${currency === "USD" ? "CAD" : "USD"}`}
        >
            {saving ? "..." : currency}
        </button>
    );
}
