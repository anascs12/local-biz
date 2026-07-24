"use client";

/**
 * Header — SPEC §6 navigation rule / §14.
 *
 * "The current dataset name and row count sit in the header at all times, with a
 * 'Change data' action. The user must never be uncertain about which dataset
 * they are looking at."
 *
 * While the demo dataset is active every screen shows the "Demo data —
 * fictional" badge (§14).
 */

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useDataset } from "@/hooks/useDataset";
import { formatNumber } from "@/lib/utils/format";

export function Header() {
  const { dataset, isDemo } = useDataset();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-bg-card/95 px-4 backdrop-blur md:px-6">
      <Link href="/" className="text-h3 text-text-900 lg:hidden">
        LocalBiz<span className="text-primary-600"> AI</span>
      </Link>

      {dataset ? (
        <>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-small font-medium text-text-900">{dataset.name}</h1>
              {isDemo && (
                <Badge tone="warning" className="shrink-0">
                  Demo data — fictional
                </Badge>
              )}
            </div>
            <p className="text-caption text-text-400">
              {formatNumber(dataset.validRowCount)} transactions
              {dataset.skippedRowCount > 0 && ` · ${formatNumber(dataset.skippedRowCount)} skipped`}
            </p>
          </div>
          <Link href="/upload" className="shrink-0">
            <Button variant="secondary" size="sm">
              Change data
            </Button>
          </Link>
        </>
      ) : (
        <div className="flex-1" />
      )}
    </header>
  );
}
