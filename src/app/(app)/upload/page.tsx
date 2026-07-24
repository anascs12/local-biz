"use client";

/**
 * Upload — SPEC §9.2 / §11.
 * Three sequential stages in one route, driven by local state:
 * idle → mapping → validated.
 *
 * NOT wrapped in RequireDataset: this is precisely the page you reach when you
 * have no dataset. Everything runs client-side; no upload endpoint exists (§23).
 *
 * The Web Worker for files over 5,000 rows is P1 (§32) — parsing currently runs
 * on the main thread behind a busy state.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { DropZone } from "@/features/upload/DropZone";
import { ColumnMapper } from "@/features/upload/ColumnMapper";
import { ValidationReport } from "@/features/upload/ValidationReport";
import { useDataset } from "@/hooks/useDataset";
import { detectColumns, type ColumnMapping, type MappingConfidence } from "@/lib/parsing/columnMapper";
import type { ParsedTable } from "@/lib/parsing/csv";
import { parseCsvFile } from "@/lib/parsing/csv";
import { fileExtension, validateFile, validateRowBounds } from "@/lib/validation/fileValidation";
import { FILE_ERRORS } from "@/lib/validation/messages";
import { assembleDataset } from "@/lib/validation/datasetValidation";
import type { InternalField } from "@/lib/parsing/schema";

type Stage = "idle" | "mapping" | "validated";

export default function UploadPage() {
  const router = useRouter();
  const { loadDataset } = useDataset();

  const [stage, setStage] = React.useState<Stage>("idle");
  const [busy, setBusy] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState("");
  const [table, setTable] = React.useState<ParsedTable | null>(null);
  const [mapping, setMapping] = React.useState<ColumnMapping | null>(null);
  const [confidence, setConfidence] = React.useState<MappingConfidence | null>(null);
  const [removeDuplicates, setRemoveDuplicates] = React.useState(false);
  const [dayFirst, setDayFirst] = React.useState<boolean | undefined>(undefined);

  const reset = () => {
    setStage("idle");
    setTable(null);
    setMapping(null);
    setConfidence(null);
    setRemoveDuplicates(false);
    setDayFirst(undefined);
    setFileError(null);
  };

  async function handleFile(file: File) {
    setFileError(null);

    // §12.1 — extension and size, before we attempt to parse.
    const meta = validateFile({ name: file.name, size: file.size });
    if (!meta.ok) {
      setFileError(meta.error!);
      return;
    }

    setBusy(true);
    try {
      const ext = fileExtension(file.name);
      let parsed: ParsedTable;
      if (ext === ".csv") {
        parsed = await parseCsvFile(file);
      } else {
        // SheetJS is the largest dependency — loaded only when an Excel file is
        // actually chosen (§25).
        const { parseExcelFile } = await import("@/lib/parsing/excel");
        parsed = await parseExcelFile(file);
      }

      const bounds = validateRowBounds(parsed.rows.length);
      if (!bounds.ok) {
        setFileError(bounds.error!);
        return;
      }

      const detection = detectColumns(parsed.headers, parsed.rows);
      setFileName(file.name);
      setTable(parsed);
      setMapping(detection.mapping);
      setConfidence(detection.confidence);
      setStage("mapping");
    } catch {
      // Never surface a raw exception (§24).
      setFileError(FILE_ERRORS.parseFailure());
    } finally {
      setBusy(false);
    }
  }

  // Re-assembled whenever the mapping, duplicate handling or date order changes.
  const assembled = React.useMemo(() => {
    if (!table || !mapping || stage !== "validated") return null;
    return assembleDataset(table.rows, mapping, {
      name: fileName,
      isDemo: false,
      removeDuplicates,
      dayFirst,
    });
  }, [table, mapping, stage, fileName, removeDuplicates, dayFirst]);

  // Detected date order, for the §11.2 notice on the mapping screen.
  const dateProbe = React.useMemo(() => {
    if (!table || !mapping) return { ambiguous: false, dayFirst: true };
    const probe = assembleDataset(table.rows, mapping, { name: fileName, dayFirst });
    return {
      ambiguous: probe.meta?.dateFormatAmbiguous ?? false,
      dayFirst: probe.meta?.dayFirst ?? true,
    };
  }, [table, mapping, fileName, dayFirst]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-h1 text-text-900">Upload your data</h1>
        <p className="text-small text-text-600">
          Bring the sales file you already keep — a CSV export or an Excel sheet.
        </p>
      </div>

      {stage === "idle" && <DropZone onFile={handleFile} busy={busy} error={fileError} />}

      {stage === "mapping" && table && mapping && confidence && (
        <ColumnMapper
          headers={table.headers}
          rows={table.rows}
          mapping={mapping}
          confidence={confidence}
          dateAmbiguous={dateProbe.ambiguous}
          dayFirst={dateProbe.dayFirst}
          onToggleDayFirst={() => setDayFirst(!dateProbe.dayFirst)}
          onChange={(field: InternalField, header) =>
            setMapping((m) => (m ? { ...m, [field]: header } : m))
          }
          onContinue={() => setStage("validated")}
          onBack={reset}
        />
      )}

      {stage === "validated" && assembled && (
        <>
          {assembled.dataset ? (
            <ValidationReport
              dataset={assembled.dataset}
              totalRows={table?.rows.length ?? 0}
              duplicateCount={assembled.meta?.duplicateCount ?? 0}
              removeDuplicates={removeDuplicates}
              onToggleDuplicates={setRemoveDuplicates}
              onBack={() => setStage("mapping")}
              onContinue={() => {
                loadDataset(assembled.dataset!);
                router.push("/dashboard");
              }}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <p
                role="alert"
                className="rounded-md border border-error/30 bg-[#FEF2F2] px-4 py-3 text-small text-error"
              >
                {assembled.errors.join(" ")}
              </p>
              <button
                type="button"
                onClick={() => setStage("mapping")}
                className="w-fit text-small font-medium text-primary-600 hover:text-primary-700"
              >
                Back to columns
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
