import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/files";

export async function GET() {
  const vehicle = await prisma.shelbyVehicle.findFirst();
  if (!vehicle) {
    return NextResponse.json([], { status: 200 });
  }

  const documents = await prisma.shelbyDocument.findMany({
    where: { vehicleId: vehicle.id },
    orderBy: { uploadedAt: "desc" },
    include: {
      _count: { select: { serviceRecords: true } },
    },
  });

  return NextResponse.json(documents);
}

export async function POST(request: NextRequest) {
  const vehicle = await prisma.shelbyVehicle.findFirst();
  if (!vehicle) {
    return NextResponse.json({ error: "No vehicle configured" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const stored = await saveUploadedFile(file);

  const document = await prisma.shelbyDocument.create({
    data: {
      vehicleId: vehicle.id,
      originalFilename: stored.originalFilename,
      storedFilename: stored.storedFilename,
      fileSize: stored.fileSize,
      mimeType: stored.mimeType,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
