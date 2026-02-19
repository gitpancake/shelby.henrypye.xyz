import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { GradientDivider } from "@/components/GradientDivider";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const vehicle = await prisma.shelbyVehicle.findFirst();

    if (!vehicle) redirect("/setup");

    const engineStr = [
        vehicle.engineModel,
        vehicle.displacementL && `${vehicle.displacementL}L`,
        vehicle.engineCylinders && `${vehicle.engineCylinders}-cyl`,
    ]
        .filter(Boolean)
        .join(" / ");

    const driveStr = vehicle.driveType
        ?.replace(/\/4-Wheel Drive/i, "")
        .replace(/\/4x4/i, "")
        .trim();

    const specs = [
        { label: "ENGINE", value: engineStr },
        { label: "DRIVETRAIN", value: driveStr },
        { label: "FUEL", value: vehicle.fuelType },
        { label: "TRIM", value: vehicle.trim },
    ].filter((s) => s.value) as { label: string; value: string }[];

    // Service summary
    const [recordCount, componentCount, latestRecord] = await Promise.all([
        prisma.shelbyServiceRecord.count({ where: { vehicleId: vehicle.id } }),
        prisma.shelbyComponent.count({ where: { vehicleId: vehicle.id } }),
        prisma.shelbyServiceRecord.findFirst({
            where: { vehicleId: vehicle.id },
            orderBy: { serviceDate: "desc" },
            select: { serviceDate: true, mileage: true, shop: true },
        }),
    ]);

    return (
        <PageShell>
            {/* Header */}
            <div className="mb-10">
                <GradientDivider label="Vehicle System Online" />

                <h1 className="text-3xl font-light tracking-tight text-white text-center mt-4">
                    {vehicle.year}{" "}
                    <span className="font-semibold">{vehicle.make}</span>{" "}
                    {vehicle.model}
                </h1>

                {vehicle.trim && (
                    <p className="text-center mt-1 text-xs font-mono tracking-[0.2em] text-neutral-500 uppercase">
                        {vehicle.trim}
                    </p>
                )}
            </div>

            {/* Mileage hero */}
            <div className="relative mb-8 py-8 text-center">
                <div className="absolute inset-0 rounded-2xl border border-neutral-800/60 bg-gradient-to-b from-white/[0.02] to-transparent" />
                <div className="relative">
                    <p className="text-[10px] font-mono tracking-[0.3em] text-neutral-600 uppercase mb-2">
                        Odometer
                    </p>
                    <p className="text-5xl font-extralight tracking-tight text-white font-mono tabular-nums">
                        {vehicle.mileage.toLocaleString()}
                    </p>
                    <p className="text-xs font-mono text-neutral-600 mt-1">
                        miles
                    </p>
                </div>
            </div>

            {/* Spec grid */}
            <div className="grid grid-cols-2 gap-px bg-neutral-800/40 rounded-xl overflow-hidden mb-8">
                {specs.map((s) => (
                    <div key={s.label} className="bg-[#060606] p-4">
                        <p className="text-[10px] font-mono tracking-[0.2em] text-neutral-600 uppercase mb-1.5">
                            {s.label}
                        </p>
                        <p className="text-sm font-mono text-white leading-snug">
                            {s.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Identity block */}
            <div className="rounded-xl border border-neutral-800/60 bg-white/[0.01] divide-y divide-neutral-800/60 mb-8">
                <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-600 uppercase">
                        VIN
                    </span>
                    <span className="text-xs font-mono text-neutral-300 tracking-wider">
                        {vehicle.vin}
                    </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-600 uppercase">
                        Plate
                    </span>
                    <span className="text-xs font-mono text-neutral-300 tracking-wider">
                        {vehicle.licensePlate}
                    </span>
                </div>
                {vehicle.bodyClass && (
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-600 uppercase">
                            Class
                        </span>
                        <span className="text-xs font-mono text-neutral-300">
                            {vehicle.bodyClass.split("/")[0].trim()}
                        </span>
                    </div>
                )}
                {vehicle.plantCountry && (
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-600 uppercase">
                            Origin
                        </span>
                        <span className="text-xs font-mono text-neutral-300 tracking-wider">
                            {vehicle.plantCountry}
                        </span>
                    </div>
                )}
            </div>

            {/* Service summary */}
            <GradientDivider label="Service History" />

            <div className="mt-6 grid grid-cols-3 gap-px bg-neutral-800/40 rounded-xl overflow-hidden">
                <Link
                    href="/service-log"
                    className="bg-[#060606] p-4 text-center transition-colors hover:bg-white/[0.02]"
                >
                    <p className="text-2xl font-extralight font-mono text-white tabular-nums">
                        {recordCount}
                    </p>
                    <p className="text-[10px] font-mono tracking-[0.2em] text-neutral-600 uppercase mt-1">
                        Records
                    </p>
                </Link>
                <Link
                    href="/maintenance"
                    className="bg-[#060606] p-4 text-center transition-colors hover:bg-white/[0.02]"
                >
                    <p className="text-2xl font-extralight font-mono text-white tabular-nums">
                        {componentCount}
                    </p>
                    <p className="text-[10px] font-mono tracking-[0.2em] text-neutral-600 uppercase mt-1">
                        Components
                    </p>
                </Link>
                <Link
                    href="/documents"
                    className="bg-[#060606] p-4 text-center transition-colors hover:bg-white/[0.02]"
                >
                    <p className="text-[10px] font-mono tracking-[0.2em] text-neutral-600 uppercase mb-2">
                        Last Service
                    </p>
                    {latestRecord ? (
                        <>
                            <p className="text-xs font-mono text-white">
                                {latestRecord.serviceDate
                                    ? new Date(
                                          latestRecord.serviceDate,
                                      ).toLocaleDateString("en-US", {
                                          month: "short",
                                          year: "numeric",
                                      })
                                    : "Unknown date"}
                            </p>
                            {latestRecord.mileage && (
                                <p className="text-[10px] font-mono text-neutral-600 mt-0.5">
                                    {latestRecord.mileage.toLocaleString()} mi
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-xs font-mono text-neutral-600">--</p>
                    )}
                </Link>
            </div>

            {/* Footer */}
            <div className="mt-8">
                <GradientDivider label="Shelby" />
            </div>
        </PageShell>
    );
}
