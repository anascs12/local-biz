"use client";

/**
 * Upload stage 3 — SPEC §9.2 / §12.3 / §12.4 / §12.5.
 *
 * Summary strip (total / valid / skipped), a grouped list of issues each
 * expandable to up to 10 example row numbers, the exact-duplicates checkbox
 * (default OFF — repeat sales are genuinely common, §10.4), and a prominent
 * card when profit analysis will be unavailable (§12.5).
 */

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Dataset } from "@/types/dataset";
import type { ValidationIssue } from "@/types/validation";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-small font-medium uppercase tracking-wide text-text-400">{label}</span>
      <span
        className={cn(
          "nums text-h1",
          tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-text-900",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  return (
    <details className="border-b border-border last:border-0">
      <summary
        className={cn(
          "cursor-pointer px-4 py-2.5 text-small",
          issue.severity === "error" ? "text-text-900" : "text-text-600",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "mr-2 inline-block h-2 w-2 rounded-full align-middle",
            issue.severity === "error" ? "bg-error" : "bg-warning",
          )}
        />
        {issue.message}
      </summary>
      {issue.exampleRows.length > 0 && (
        <p className="px-4 pb-3 text-caption text-text-400">
          For example, {issue.exampleRows.length === 1 ? "row" : "rows"}{" "}
          <span className="nums">{issue.exampleRows.join(", ")}</span>
          {issue.count > issue.exampleRows.length &&
            ` (and ${formatNumber(issue.count - issue.exampleRows.length)} more)`}
        </p>
      )}
    </details>
  );
}

export function ValidationReport({
  dataset,
  totalRows,
  duplicateCount,
  removeDuplicates,
  onToggleDuplicates,
  onContinue,
  onBack,
}: {
  dataset: Dataset;
  totalRows: number;
  duplicateCount: number;
  removeDuplicates: boolean;
  onToggleDuplicates: (next: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-h2 text-text-900">Here&apos;s what we read</h2>
        <p className="text-small text-text-600">
          Check the summary below, then continue to your dashboard.
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-3 gap-4">
          <SummaryStat label="Rows in file" value={formatNumber(totalRows)} />
          <SummaryStat label="Imported" value={formatNumber(dataset.validRowCount)} tone="success" />
          <SummaryStat
            label="Skipped"
            value={formatNumber(dataset.skippedRowCount)}
            tone={dataset.skippedRowCount > 0 ? "warning" : undefined}
          />
        </div>
      </Card>

      {/* §12.5 — profit analysis unavailable, explained, never estimated */}
      {!dataset.hasCostData && (
        <Card className="border-warning/30 bg-[#FFFBEB]">
          <h3 className="text-h3 text-text-900">Profit analysis won&apos;t be available</h3>
          <p className="mt-1 text-small text-text-600">
            Your file doesn&apos;t include a cost column with enough coverage, so we can&apos;t work
            out profit or margin. We never estimate or guess these figures. Revenue, orders, units
            and trends all work as normal. To unlock profit, add a column with what each sale cost
            you and upload again.
          </p>
        </Card>
      )}

      {dataset.issues.length > 0 && (
        <Card padded={false}>
          <h3 className="px-4 pt-4 text-h3 text-text-900">Things we noticed</h3>
          <div className="mt-2">
            {dataset.issues.map((issue) => (
              <IssueRow key={issue.code} issue={issue} />
            ))}
          </div>
        </Card>
      )}

      {duplicateCount > 0 && (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-bg-card px-4 py-3">
          <input
            type="checkbox"
            checked={removeDuplicates}
            onChange={(e) => onToggleDuplicates(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#0F766E]"
          />
          <span className="text-small text-text-600">
            <span className="font-medium text-text-900">Remove exact duplicates</span> —{" "}
            {formatNumber(duplicateCount)} rows are identical to another row. This is often normal
            for repeat sales, so they are kept by default.
          </span>
        </label>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onContinue} disabled={dataset.validRowCount === 0}>
          Continue to dashboard
        </Button>
        <Button variant="secondary" onClick={onBack}>
          Back to columns
        </Button>
      </div>
    </div>
  );
}
