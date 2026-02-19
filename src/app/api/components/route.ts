import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const vehicle = await prisma.shelbyVehicle.findFirst();
  if (!vehicle) {
    return NextResponse.json([], { status: 200 });
  }

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

  const result = components.map((c) => {
    const latest = c.lineItems[0]?.serviceRecord;
    return {
      id: c.id,
      name: c.name,
      category: c.category,
      timesServiced: c.lineItems.length,
      lastServiceDate: latest?.serviceDate ?? null,
      lastServiceMileage: latest?.mileage ?? null,
    };
  });

  return NextResponse.json(result);
}
