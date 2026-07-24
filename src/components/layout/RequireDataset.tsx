"use client";

/**
 * RequireDataset — SPEC §8 / §21.3 / §6.3.
 *
 * "All data routes are guarded by a RequireDataset wrapper that renders the
 * empty state if no dataset is in context."
 *
 * While the sessionStorage snapshot is being restored we show a skeleton rather
 * than the empty state, so a page refresh does not flash "No data loaded yet"
 * before the dataset comes back (§21.2).
 */

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDataset } from "@/hooks/useDataset";

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}

export function RequireDataset({ children }: { children: React.ReactNode }) {
  const { hasDataset, hydrating, loadDataset } = useDataset();
  const [loading, setLoading] = React.useState(false);

  if (hydrating) return <LoadingSkeleton />;

  if (!hasDataset) {
    return (
      <EmptyState
        title="No data loaded yet"
        description="Load the sample business to explore the dashboard, or bring your own sales file."
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
            <path
              d="M3 3v18h18M7 15l4-4 3 3 5-6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
        action={
          <>
            <Button
              loading={loading}
              onClick={async () => {
                setLoading(true);
                // Loaded on demand so the bundled demo CSV never ships in the
                // shared chunk (§25 bundle budget).
                const { loadDemoDataset } = await import("@/lib/demo/loadDemo");
                loadDataset(loadDemoDataset());
                setLoading(false);
              }}
            >
              Try the demo
            </Button>
            <Link href="/upload">
              <Button variant="secondary">Upload your data</Button>
            </Link>
          </>
        }
      />
    );
  }

  return <>{children}</>;
}
