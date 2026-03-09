"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export function DocumentUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadFile(file: File) {
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed");
        setUploading(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        disabled={uploading}
        className={`w-full rounded-xl border border-dashed py-8 px-4 text-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          dragging
            ? "border-foreground/40 bg-muted/50"
            : "border-border bg-muted/30 hover:border-border hover:bg-muted/40"
        }`}
      >
        <p className="text-xs font-mono text-muted-foreground">
          {uploading
            ? "Uploading..."
            : "Drop a file here or click to upload"}
        </p>
        <p className="text-[10px] font-mono text-muted-foreground mt-1">
          PDF, JPG, PNG
        </p>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={handleChange}
        className="hidden"
      />

      {error && (
        <p className="text-xs font-mono text-red-400">{error}</p>
      )}
    </div>
  );
}
