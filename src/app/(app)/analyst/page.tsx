"use client";

/**
 * AI Business Analyst — SPEC §9.7.
 * The dashboard and analytics stay fully functional if the AI fails (§24), so
 * this page owns its own error surface and never blocks anything else.
 */

import { RequireDataset } from "@/components/layout/RequireDataset";
import { ChatPanel } from "@/features/ai/ChatPanel";
import { useDataset } from "@/hooks/useDataset";

function AnalystContent() {
  const { dataset } = useDataset();
  if (!dataset) return null;
  return <ChatPanel hasCostData={dataset.hasCostData} />;
}

export default function AnalystPage() {
  return (
    <RequireDataset>
      <AnalystContent />
    </RequireDataset>
  );
}
