import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { GradientDivider } from "@/components/GradientDivider";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const vehicle = await prisma.shelbyVehicle.findFirst({
        where: { teamId: session.activeTeamId },
    });

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

                <h1 className="text-3xl font-light tracking-tight text-foreground text-center mt-4">
                    {vehicle.year}{" "}
                    <span className="font-semibold">{vehicle.make}</span>{" "}
                    {vehicle.model}
                </h1>

                {vehicle.trim && (
                    <p className="text-center mt-1 text-xs font-mono tracking-[0.2em] text-muted-foreground uppercase">
                        {vehicle.trim}
                    </p>
                )}
            </div>

            {/* Mileage hero */}
            <div className="relative mb-8 py-8 text-center">
                <div className="absolute inset-0 rounded-2xl border border-border bg-gradient-to-b from-muted/40 to-transparent" />
                <div className="relative">
                    <p className="text-[10px] font-mono tracking-[0.3em] text-muted-foreground uppercase mb-2">
                        Odometer
                    </p>
                    <p className="text-5xl font-extralight tracking-tight text-foreground font-mono tabular-nums">
                        {vehicle.mileage.toLocaleString()}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                        miles
                    </p>
                </div>
            </div>

            {/* Spec grid */}
            <div className="grid grid-cols-2 gap-px bg-border rounded-xl overflow-hidden mb-8">
                {specs.map((s) => (
                    <div key={s.label} className="bg-background p-4">
                        <p className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase mb-1.5">
                            {s.label}
                        </p>
                        <p className="text-sm font-mono text-foreground leading-snug">
                            {s.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Identity block */}
            <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border mb-8">
                <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase">
                        VIN
                    </span>
                    <span className="text-xs font-mono text-foreground tracking-wider">
                        {vehicle.vin}
                    </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase">
                        Plate
                    </span>
                    <span className="text-xs font-mono text-foreground tracking-wider">
                        {vehicle.licensePlate}
                    </span>
                </div>
                {vehicle.bodyClass && (
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase">
                            Class
                        </span>
                        <span className="text-xs font-mono text-foreground">
                            {vehicle.bodyClass.split("/")[0].trim()}
                        </span>
                    </div>
                )}
                {vehicle.plantCountry && (
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase">
                            Origin
                        </span>
                        <span className="text-xs font-mono text-foreground tracking-wider">
                            {vehicle.plantCountry}
                        </span>
                    </div>
                )}
            </div>

            {/* Service summary */}
            <GradientDivider label="Service History" />

            <div className="mt-6 grid grid-cols-3 gap-px bg-border rounded-xl overflow-hidden">
                <Link
                    href="/service-log"
                    className="bg-background p-4 text-center transition-colors hover:bg-muted/40"
                >
                    <p className="text-2xl font-extralight font-mono text-foreground tabular-nums">
                        {recordCount}
                    </p>
                    <p className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase mt-1">
                        Records
                    </p>
                </Link>
                <Link
                    href="/maintenance"
                    className="bg-background p-4 text-center transition-colors hover:bg-muted/40"
                >
                    <p className="text-2xl font-extralight font-mono text-foreground tabular-nums">
                        {componentCount}
                    </p>
                    <p className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase mt-1">
                        Components
                    </p>
                </Link>
                <Link
                    href="/documents"
                    className="bg-background p-4 text-center transition-colors hover:bg-muted/40"
                >
                    <p className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase mb-2">
                        Last Service
                    </p>
                    {latestRecord ? (
                        <>
                            <p className="text-xs font-mono text-foreground">
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
                                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                    {latestRecord.mileage.toLocaleString()} mi
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-xs font-mono text-muted-foreground">--</p>
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
