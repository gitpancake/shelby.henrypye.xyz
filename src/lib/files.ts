import { readFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { supabase } from "./supabase";

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");
const BUCKET = "shelby-documents";

export interface StoredFile {
    storedFilename: string;
    originalFilename: string;
    fileSize: number;
    mimeType: string;
}

export async function saveUploadedFile(file: File): Promise<StoredFile> {
    const ext = file.name.split(".").pop() || "pdf";
    const storedFilename = `${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storedFilename, buffer, {
            contentType: file.type || "application/pdf",
            upsert: false,
        });

    if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
    }

    return {
        storedFilename,
        originalFilename: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/pdf",
    };
}

export async function getUploadBuffer(storedFilename: string): Promise<Buffer> {
    // Try local first (for files uploaded before Supabase migration)
    const localPath = join(UPLOADS_DIR, storedFilename);
    if (existsSync(localPath)) {
        return readFile(localPath);
    }

    // Download from Supabase Storage
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(storedFilename);

    if (error || !data) {
        throw new Error(
            `Storage download failed: ${error?.message || "No data"}`,
        );
    }

    return Buffer.from(await data.arrayBuffer());
}
