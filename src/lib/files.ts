import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

export interface StoredFile {
  storedFilename: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
}

export async function saveUploadedFile(file: File): Promise<StoredFile> {
  await mkdir(UPLOADS_DIR, { recursive: true });

  const ext = file.name.split(".").pop() || "pdf";
  const storedFilename = `${randomUUID()}.${ext}`;
  const filePath = join(UPLOADS_DIR, storedFilename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return {
    storedFilename,
    originalFilename: file.name,
    fileSize: file.size,
    mimeType: file.type || "application/pdf",
  };
}

export function getUploadPath(storedFilename: string): string {
  return join(UPLOADS_DIR, storedFilename);
}
