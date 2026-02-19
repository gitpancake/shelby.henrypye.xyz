import { prisma } from "./prisma";

/**
 * Estimates a date for a given mileage by interpolating between known
 * odometer readings and dated service records.
 *
 * Returns null if there's not enough data to estimate.
 */
export async function estimateDateFromMileage(
    vehicleId: string,
    targetMileage: number,
): Promise<Date | null> {
    // Gather all dated mileage datapoints
    const odometerReadings = await prisma.shelbyOdometerReading.findMany({
        where: { vehicleId },
        select: { date: true, mileage: true },
    });

    const serviceRecords = await prisma.shelbyServiceRecord.findMany({
        where: {
            vehicleId,
            serviceDate: { not: null },
            mileage: { not: null },
        },
        select: { serviceDate: true, mileage: true },
    });

    const points: { date: Date; mileage: number }[] = [];

    for (const r of odometerReadings) {
        points.push({ date: r.date, mileage: r.mileage });
    }

    for (const r of serviceRecords) {
        if (r.serviceDate && r.mileage) {
            points.push({ date: r.serviceDate, mileage: r.mileage });
        }
    }

    if (points.length < 2) return null;

    // Sort by mileage
    points.sort((a, b) => a.mileage - b.mileage);

    // Deduplicate by mileage (keep first occurrence)
    const unique: typeof points = [];
    const seen = new Set<number>();
    for (const p of points) {
        if (!seen.has(p.mileage)) {
            seen.add(p.mileage);
            unique.push(p);
        }
    }

    if (unique.length < 2) return null;

    // Find the two closest points that bracket the target mileage
    let lower = unique[0];
    let upper = unique[unique.length - 1];

    for (const p of unique) {
        if (p.mileage <= targetMileage) lower = p;
    }
    for (let i = unique.length - 1; i >= 0; i--) {
        if (unique[i].mileage >= targetMileage) upper = unique[i];
    }

    // If target is outside the range, extrapolate from the two nearest points
    if (lower === upper) {
        // Target is at or beyond one end — use the two endpoints for extrapolation
        if (targetMileage <= unique[0].mileage) {
            lower = unique[0];
            upper = unique[1];
        } else {
            lower = unique[unique.length - 2];
            upper = unique[unique.length - 1];
        }
    }

    const mileageRange = upper.mileage - lower.mileage;
    if (mileageRange === 0) return null;

    const timeRange = upper.date.getTime() - lower.date.getTime();
    const fraction = (targetMileage - lower.mileage) / mileageRange;
    const estimatedTime = lower.date.getTime() + timeRange * fraction;

    return new Date(estimatedTime);
}
