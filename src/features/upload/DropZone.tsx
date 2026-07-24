"use client";

/**
 * Upload stage 1 — SPEC §9.2.
 * Dashed 2px border card, 280px tall, drag-drop or click to browse, with the
 * limits stated up front and the privacy promise directly under the zone (§23).
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { SchemaReference } from "./SchemaReference";

export function DropZone({
  onFile,
  busy,
  error,
}: {
  onFile: (file: File) => void;
  busy: boolean;
  error: string | null;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex h-[280px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 text-center transition-colors",
          dragging ? "border-primary-600 bg-primary-50" : "border-border bg-bg-card",
          busy && "opacity-60",
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
            <path
              d="M12 16V4m0 0L8 8m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="text-h3 text-text-900 hover:text-primary-700 disabled:cursor-not-allowed"
        >
          {busy ? "Reading your file…" : "Drag your file here or click to browse"}
        </button>
        <p className="text-small text-text-400">
          CSV, XLSX or XLS · up to 10 MB · up to 100,000 rows
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files);
            // Allow re-selecting the same file after an error.
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p role="alert" aria-live="polite" className="rounded-md border border-error/30 bg-[#FEF2F2] px-4 py-3 text-small text-error">
          {error}
        </p>
      )}

      {/* §23 privacy promise, stated where the file is chosen */}
      <p className="text-small text-text-600">
        Your file is processed entirely in your browser. It is never uploaded to a server. Please do
        not include customer names, phone numbers, or addresses.
      </p>

      <SchemaReference />
    </div>
  );
}
