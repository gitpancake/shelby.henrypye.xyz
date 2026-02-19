import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { GradientDivider } from "@/components/GradientDivider";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const vehicle = await prisma.shelbyVehicle.findFirst();
  if (!vehicle) redirect("/setup");

  const components = await prisma.shelbyComponent.findMany({
    where: { vehicleId: vehicle.id },
    include: {
      lineItems: {
        include: {
          serviceRecord: {
            select: { serviceDate: true, mileage: true },
          },
        },
        orderBy: { serviceRecord: { serviceDate: "desc" } },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  // Group by category
  const grouped: Record<
    string,
    {
      id: string;
      name: string;
      timesServiced: number;
      lastDate: string | null;
      lastMileage: number | null;
    }[]
  > = {};

  for (const c of components) {
    const cat = c.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    const latest = c.lineItems[0]?.serviceRecord;
    grouped[cat].push({
      id: c.id,
      name: c.name,
      timesServiced: c.lineItems.length,
      lastDate: latest?.serviceDate
        ? new Date(latest.serviceDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null,
      lastMileage: latest?.mileage ?? null,
    });
  }

  const categories = Object.keys(grouped).sort();

  return (
    <PageShell>
      <GradientDivider label="Component Tracker" />

      <div className="mt-8 space-y-8">
        {categories.length === 0 && (
          <p className="text-center text-xs font-mono text-neutral-600">
            No tracked components yet. Upload and process documents to populate.
          </p>
        )}

        {categories.map((category) => (
          <div key={category}>
            <h2 className="text-[10px] font-mono tracking-[0.3em] text-neutral-500 uppercase mb-3">
              {category}
            </h2>

            <div className="rounded-xl border border-neutral-800/60 bg-white/[0.01] divide-y divide-neutral-800/40">
              {grouped[category].map((comp) => (
                <div
                  key={comp.id}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-mono text-white">
                      {comp.name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] font-mono text-neutral-600">
                        {comp.timesServiced}x serviced
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {comp.lastDate && (
                      <p className="text-xs font-mono text-neutral-400">
                        {comp.lastDate}
                      </p>
                    )}
                    {comp.lastMileage && (
                      <p className="text-[10px] font-mono text-neutral-600">
                        {comp.lastMileage.toLocaleString()} mi
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
