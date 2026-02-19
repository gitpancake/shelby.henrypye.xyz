"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResetButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Reset failed");
        return;
      }
      router.refresh();
    } catch {
      alert("Reset failed");
    } finally {
      setResetting(false);
      setConfirming(false);
    }
  }

  if (resetting) {
    return (
      <p className="text-[10px] font-mono text-neutral-600 animate-pulse text-center">
        Wiping all data...
      </p>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center justify-center gap-3">
        <span className="text-[10px] font-mono text-red-400/80">
          Delete all documents, records &amp; components?
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-red-800/60 px-2 py-1 text-[9px] font-mono tracking-wider uppercase text-red-400 transition-colors hover:bg-red-500/10"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-md border border-neutral-800 px-2 py-1 text-[9px] font-mono tracking-wider uppercase text-neutral-600 transition-colors hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="w-full rounded-lg border border-neutral-800/40 px-3 py-2 text-[10px] font-mono tracking-wider uppercase text-neutral-600 transition-colors hover:border-red-800/40 hover:text-red-400/80"
    >
      Reset All Data
    </button>
  );
}
