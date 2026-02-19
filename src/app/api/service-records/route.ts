import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const vehicle = await prisma.shelbyVehicle.findFirst();
  if (!vehicle) {
    return NextResponse.json([], { status: 200 });
  }

  const records = await prisma.shelbyServiceRecord.findMany({
    where: { vehicleId: vehicle.id },
    orderBy: { serviceDate: "desc" },
    include: {
      lineItems: {
        include: { component: true },
      },
      document: {
        select: { originalFilename: true },
      },
    },
  });

  return NextResponse.json(records);
}
