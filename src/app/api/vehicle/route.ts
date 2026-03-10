import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decodeVin } from "@/lib/nhtsa";
import { withAuth, assertCanWrite } from "@/lib/auth";

export const GET = withAuth(async (request, { session }) => {
  const vehicle = await prisma.shelbyVehicle.findFirst({
    where: { teamId: session.activeTeamId },
  });
  if (!vehicle) {
    return NextResponse.json(null, { status: 404 });
  }
  return NextResponse.json(vehicle);
});

export const POST = withAuth(async (request, { session }) => {
  const forbidden = assertCanWrite(session);
  if (forbidden) return forbidden;

  const existing = await prisma.shelbyVehicle.findFirst({
    where: { teamId: session.activeTeamId },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Vehicle already exists" },
      { status: 409 }
    );
  }

  const { vin, licensePlate, mileage } = await request.json();

  if (!vin || !licensePlate || mileage == null) {
    return NextResponse.json(
      { error: "VIN, license plate, and mileage are required" },
      { status: 400 }
    );
  }

  let vinData;
  try {
    vinData = await decodeVin(vin);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "VIN decode failed" },
      { status: 422 }
    );
  }

  const vehicle = await prisma.shelbyVehicle.create({
    data: {
      userId: session.uid,
      teamId: session.activeTeamId,
      vin: vin.toUpperCase(),
      licensePlate,
      mileage: parseInt(mileage, 10),
      ...vinData,
    },
  });

  return NextResponse.json(vehicle, { status: 201 });
});
