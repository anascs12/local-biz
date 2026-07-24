"use client";

/**
 * ContextInspector — SPEC §9.7.
 *
 * "A collapsible 'View the data the AI received' panel at the top of the thread
 * displays the actual context JSON — this is a trust feature and is required,
 * not optional."
 *
 * It shows the EXACT object posted to the route, so a user can verify for
 * themselves that no customer data left their browser (§23) and that every
 * figure the AI cites is one we computed.
 */

import type { AIContext } from "@/types/aiContext";
import { formatNumber } from "@/lib/utils/format";

export function ContextInspector({ context }: { context: AIContext | null }) {
  if (!context) return null;
  const json = JSON.stringify(context, null, 2);
  const bytes = new TextEncoder().encode(json).length;

  return (
    <details className="rounded-lg border border-border bg-bg-card">
      <summary className="cursor-pointer px-4 py-2.5 text-small font-medium text-text-600 hover:text-text-900">
        View the data the AI received
      </summary>
      <div className="border-t border-border px-4 py-3">
        <p className="mb-2 text-caption text-text-400">
          This is the complete payload sent to the AI — {formatNumber(bytes)} bytes of computed
          totals. It contains no customer names, no addresses, and none of your individual
          transactions.
        </p>
        <pre className="max-h-80 overflow-auto rounded-sm bg-bg-app p-3 text-caption leading-relaxed text-text-600">
          {json}
        </pre>
      </div>
    </details>
  );
}
