"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";

export default function SetupPage() {
  const router = useRouter();
  const [vin, setVin] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [mileage, setMileage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin: vin.trim().toUpperCase(),
          licensePlate: licensePlate.trim().toUpperCase(),
          mileage: parseInt(mileage, 10),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save vehicle");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <PageShell>
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Add Your Vehicle
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll look up the details from your VIN
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="vin"
              className="block text-xs font-medium text-muted-foreground mb-1.5"
            >
              VIN
            </label>
            <input
              id="vin"
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              required
              autoFocus
              maxLength={17}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring uppercase font-mono tracking-wider"
              placeholder="e.g. JT3HN86R0Y0231567"
            />
          </div>

          <div>
            <label
              htmlFor="plate"
              className="block text-xs font-medium text-muted-foreground mb-1.5"
            >
              License Plate
            </label>
            <input
              id="plate"
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring uppercase font-mono tracking-wider"
              placeholder="e.g. 8ABC123"
            />
          </div>

          <div>
            <label
              htmlFor="mileage"
              className="block text-xs font-medium text-muted-foreground mb-1.5"
            >
              Current Mileage
            </label>
            <input
              id="mileage"
              type="number"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              required
              min={0}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring font-mono"
              placeholder="e.g. 185000"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Looking up VIN..." : "Add Vehicle"}
          </button>
        </form>
      </div>
    </div>
    </PageShell>
  );
}
