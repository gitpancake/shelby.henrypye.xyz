import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (_request, { session }) => {
  const vehicle = await prisma.shelbyVehicle.findFirst({
    where: { userId: session.uid },
  });
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
});
