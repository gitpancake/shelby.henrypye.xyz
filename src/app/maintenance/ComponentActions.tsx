"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ComponentInfo {
    id: string;
    name: string;
    category: string;
}

export function ComponentActions({
    component,
    allComponents,
}: {
    component: ComponentInfo;
    allComponents: ComponentInfo[];
}) {
    const [showActions, setShowActions] = useState(false);
    const [merging, setMerging] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const mergeTargets = allComponents.filter((c) => c.id !== component.id);

    async function handleDelete() {
        if (!confirm(`Delete "${component.name}" and its service history?`))
            return;

        setLoading(true);
        await fetch(`/api/components/${component.id}`, { method: "DELETE" });
        setLoading(false);
        router.refresh();
    }

    async function handleMerge(targetId: string) {
        const target = mergeTargets.find((c) => c.id === targetId);
        if (
            !target ||
            !confirm(
                `Merge "${component.name}" into "${target.name}"? Service history will be moved.`,
            )
        )
            return;

        setLoading(true);
        await fetch(`/api/components/${component.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mergeIntoId: targetId }),
        });
        setLoading(false);
        router.refresh();
    }

    if (!showActions) {
        return (
            <button
                onClick={() => setShowActions(true)}
                className="text-[9px] font-mono text-neutral-700 hover:text-neutral-400 transition-colors"
            >
                ...
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2">
            {!merging ? (
                <>
                    <button
                        onClick={() => setMerging(true)}
                        disabled={loading || mergeTargets.length === 0}
                        className="text-[9px] font-mono tracking-[0.2em] uppercase text-amber-400/60 hover:text-amber-400 transition-colors disabled:opacity-30"
                    >
                        Merge
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="text-[9px] font-mono tracking-[0.2em] uppercase text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                        {loading ? "..." : "Delete"}
                    </button>
                    <button
                        onClick={() => setShowActions(false)}
                        className="text-[9px] font-mono text-neutral-700 hover:text-neutral-400 transition-colors"
                    >
                        Cancel
                    </button>
                </>
            ) : (
                <>
                    <select
                        onChange={(e) => {
                            if (e.target.value) handleMerge(e.target.value);
                        }}
                        disabled={loading}
                        className="rounded border border-neutral-800/60 bg-[#060606] px-2 py-1 font-mono text-[10px] text-white"
                        defaultValue=""
                    >
                        <option value="" disabled>
                            Merge into...
                        </option>
                        {mergeTargets.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => setMerging(false)}
                        className="text-[9px] font-mono text-neutral-700 hover:text-neutral-400 transition-colors"
                    >
                        Cancel
                    </button>
                </>
            )}
        </div>
    );
}
