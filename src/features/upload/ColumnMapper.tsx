"use client";

/**
 * Upload stage 2 — SPEC §9.2 / §11.1 / §11.2.
 *
 * One row per internal field: name, required/optional badge, a <select> of the
 * file's headers with the auto-detected match preselected, and a 3-value
 * preview. Confidence < 0.8 is flagged amber with "Please confirm"; required
 * fields left unmapped show red. Continue is disabled until all four required
 * fields are mapped.
 *
 * The date-order notice (§11.2) is shown whenever day/month order was ambiguous
 * — silent date misparsing is the highest-severity failure mode in this product,
 * so the assumption is stated and correctable.
 */

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { FIELD_SPECS, REQUIRED_FIELDS, type InternalField } from "@/lib/parsing/schema";
import type { ColumnMapping, MappingConfidence, RawRow } from "@/lib/parsing/columnMapper";
import { previewValues } from "@/lib/parsing/columnMapper";

const CONFIRM_THRESHOLD = 0.8; // §11.1

export function ColumnMapper({
  headers,
  rows,
  mapping,
  confidence,
  onChange,
  onContinue,
  onBack,
  dateAmbiguous,
  dayFirst,
  onToggleDayFirst,
}: {
  headers: string[];
  rows: RawRow[];
  mapping: ColumnMapping;
  confidence: MappingConfidence;
  onChange: (field: InternalField, header: string | null) => void;
  onContinue: () => void;
  onBack: () => void;
  dateAmbiguous: boolean;
  dayFirst: boolean;
  onToggleDayFirst: () => void;
}) {
  const missingRequired = REQUIRED_FIELDS.filter((f) => !mapping[f]);
  const canContinue = missingRequired.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-h2 text-text-900">Check the columns we found</h2>
        <p className="text-small text-text-600">
          We matched your column names to the fields we need. Correct anything that looks wrong.
        </p>
      </div>

      {dateAmbiguous && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warning/30 bg-[#FFFBEB] px-4 py-3 text-small text-text-600"
        >
          <span>
            Dates were read as{" "}
            <strong className="font-medium text-text-900">
              {dayFirst ? "day/month/year" : "month/day/year"}
            </strong>
            .
          </span>
          <button
            type="button"
            onClick={onToggleDayFirst}
            className="font-medium text-primary-600 underline hover:text-primary-700"
          >
            Switch to {dayFirst ? "month/day/year" : "day/month/year"}
          </button>
        </div>
      )}

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-small">
            <thead>
              <tr className="[&_th]:border-b [&_th]:border-border">
                <th className="px-4 py-2.5 text-left font-medium text-text-600">Field</th>
                <th className="px-4 py-2.5 text-left font-medium text-text-600">Your column</th>
                <th className="px-4 py-2.5 text-left font-medium text-text-600">Preview</th>
              </tr>
            </thead>
            <tbody>
              {FIELD_SPECS.map((spec) => {
                const selected = mapping[spec.field];
                const score = confidence[spec.field];
                const unmappedRequired = spec.required && !selected;
                const lowConfidence = !!selected && score > 0 && score < CONFIRM_THRESHOLD;
                const preview = selected ? previewValues(rows, selected, 3) : [];

                return (
                  <tr key={spec.field} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-text-900">{spec.label}</span>
                        {spec.required ? (
                          <Badge tone="primary" className="w-fit">Required</Badge>
                        ) : (
                          <Badge tone="neutral" className="w-fit">Optional</Badge>
                        )}
                      </div>
                    </td>
                    <td className="min-w-[220px] px-4 py-3 align-top">
                      <Select
                        aria-label={`Column for ${spec.label}`}
                        value={selected ?? ""}
                        invalid={unmappedRequired}
                        warn={lowConfidence}
                        onChange={(e) => onChange(spec.field, e.target.value || null)}
                      >
                        <option value="">— Not mapped —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </Select>
                      {unmappedRequired && (
                        <p className="mt-1 text-caption text-error">
                          Required — please choose the column that holds your{" "}
                          {spec.label.toLowerCase()}.
                        </p>
                      )}
                      {lowConfidence && (
                        <p className="mt-1 text-caption text-warning">Please confirm</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-text-600">
                      {preview.length > 0 ? (
                        <ul className="nums flex flex-col gap-0.5">
                          {preview.map((v, i) => (
                            <li key={i} className="truncate">{v}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-text-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onContinue} disabled={!canContinue}>
          Continue
        </Button>
        <Button variant="secondary" onClick={onBack}>
          Choose a different file
        </Button>
        {!canContinue && (
          <p className="text-small text-text-400">
            Map {missingRequired.map((f) => FIELD_SPECS.find((s) => s.field === f)!.label).join(", ")}{" "}
            to continue.
          </p>
        )}
      </div>
    </div>
  );
}
