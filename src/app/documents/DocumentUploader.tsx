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
            ? "border-white/40 bg-white/[0.03]"
            : "border-neutral-800 bg-white/[0.01] hover:border-neutral-700 hover:bg-white/[0.02]"
        }`}
      >
        <p className="text-xs font-mono text-neutral-500">
          {uploading
            ? "Uploading..."
            : "Drop a file here or click to upload"}
        </p>
        <p className="text-[10px] font-mono text-neutral-700 mt-1">
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
