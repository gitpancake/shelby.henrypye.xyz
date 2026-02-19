"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteRecordButton({ recordId }: { recordId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleDelete() {
        if (!confirm("Delete this service record?")) return;

        setLoading(true);
        await fetch(`/api/service-records/${recordId}`, { method: "DELETE" });
        setLoading(false);
        router.refresh();
    }

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="text-[9px] font-mono tracking-[0.2em] uppercase text-red-400/40 hover:text-red-400 transition-colors disabled:opacity-50"
        >
            {loading ? "..." : "Delete"}
        </button>
    );
}
