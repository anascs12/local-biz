/**
 * Expected format guide — SPEC §9.2 stage 1 / §10.1.
 *
 * Generated from FIELD_SPECS, so what we tell the user we accept is literally
 * the alias list the column mapper matches against — the docs cannot drift from
 * the behaviour.
 */

import { Badge } from "@/components/ui/Badge";
import { FIELD_SPECS } from "@/lib/parsing/schema";

export function SchemaReference() {
  return (
    <details className="rounded-lg border border-border bg-bg-card">
      <summary className="cursor-pointer px-4 py-3 text-small font-medium text-text-600 hover:text-text-900">
        See required format
      </summary>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full border-collapse text-small">
          <thead>
            <tr className="[&_th]:border-b [&_th]:border-border">
              <th className="px-4 py-2 text-left font-medium text-text-600">Field</th>
              <th className="px-4 py-2 text-left font-medium text-text-600">Required</th>
              <th className="px-4 py-2 text-left font-medium text-text-600">
                Column names we recognise
              </th>
              <th className="px-4 py-2 text-left font-medium text-text-600">Example</th>
            </tr>
          </thead>
          <tbody>
            {FIELD_SPECS.map((f) => (
              <tr key={f.field} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-medium text-text-900">{f.label}</td>
                <td className="px-4 py-2">
                  {f.required ? (
                    <Badge tone="primary">Required</Badge>
                  ) : (
                    <Badge tone="neutral">Optional</Badge>
                  )}
                </td>
                <td className="px-4 py-2 text-text-600">{f.aliases.join(", ")}</td>
                <td className="nums px-4 py-2 text-text-600">{f.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-3 text-caption text-text-400">
          Your column names don&apos;t have to match exactly — we detect them automatically and let
          you correct anything we get wrong.
        </p>
      </div>
    </details>
  );
}
