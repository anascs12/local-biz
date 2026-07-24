"use client";

/**
 * AI Business Report — SPEC §9.8 / §18.
 * Report generation is scoped to the current global filters, and that scope is
 * printed in the report header.
 */

import { RequireDataset } from "@/components/layout/RequireDataset";
import { ReportView } from "@/features/ai/ReportView";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDataset } from "@/hooks/useDataset";
import { useFilters } from "@/hooks/useFilters";

function ReportContent() {
  const { dataset } = useDataset();
  const { filters } = useFilters();
  const analytics = useAnalytics();
  if (!dataset || !analytics) return null;

  return <ReportView dataset={dataset} window={analytics.window} filters={filters} />;
}

export default function ReportPage() {
  return (
    <RequireDataset>
      <ReportContent />
    </RequireDataset>
  );
}
