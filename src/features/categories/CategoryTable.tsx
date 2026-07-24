"use client";

/**
 * Category table — SPEC §9.6.
 * Revenue · profit · margin · units · contribution % · growth %.
 */

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type SortDirection,
} from "@/components/ui/Table";
import type { CategoryMetrics, TrendLabel } from "@/types/analytics";
import { formatNumber, formatPKR, formatPct } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type SortKey = "name" | "revenue" | "profit" | "marginPct" | "unitsSold" | "contributionPct" | "trendPct";

const TREND_STYLE: Record<TrendLabel, string> = {
  growing: "text-success",
  declining: "text-error",
  stable: "text-text-600",
  insufficient: "text-text-400",
};

export function CategoryTable({
  categories,
  hasCostData,
}: {
  categories: CategoryMetrics[];
  hasCostData: boolean;
}) {
  const [sortKey, setSortKey] = React.useState<SortKey>("revenue");
  const [direction, setDirection] = React.useState<SortDirection>("desc");

  const sorted = React.useMemo(() => {
    const rows = [...categories];
    rows.sort((a, b) => {
      if (sortKey === "name") {
        return direction === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return direction === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [categories, sortKey, direction]);

  const toggle = (key: SortKey) => {
    if (key === sortKey) setDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDirection(key === "name" ? "asc" : "desc");
    }
  };
  const sortFor = (key: SortKey): SortDirection => (sortKey === key ? direction : null);

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead sortable sort={sortFor("name")} onSort={() => toggle("name")}>
            Category
          </TableHead>
          <TableHead numeric sortable sort={sortFor("revenue")} onSort={() => toggle("revenue")}>
            Revenue
          </TableHead>
          {hasCostData && (
            <>
              <TableHead numeric sortable sort={sortFor("profit")} onSort={() => toggle("profit")}>
                Profit
              </TableHead>
              <TableHead numeric sortable sort={sortFor("marginPct")} onSort={() => toggle("marginPct")}>
                Margin
              </TableHead>
            </>
          )}
          <TableHead numeric sortable sort={sortFor("unitsSold")} onSort={() => toggle("unitsSold")}>
            Units
          </TableHead>
          <TableHead numeric sortable sort={sortFor("contributionPct")} onSort={() => toggle("contributionPct")}>
            Contribution
          </TableHead>
          <TableHead numeric sortable sort={sortFor("trendPct")} onSort={() => toggle("trendPct")}>
            Growth
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((c) => (
          <TableRow key={c.name}>
            <TableCell className="font-medium">{c.name}</TableCell>
            <TableCell numeric>{formatPKR(c.revenue)}</TableCell>
            {hasCostData && (
              <>
                <TableCell numeric className={c.profit !== null && c.profit < 0 ? "text-error" : undefined}>
                  {formatPKR(c.profit)}
                </TableCell>
                <TableCell numeric>{formatPct(c.marginPct)}</TableCell>
              </>
            )}
            <TableCell numeric>{formatNumber(c.unitsSold)}</TableCell>
            <TableCell numeric>{formatPct(c.contributionPct)}</TableCell>
            <TableCell numeric className={cn(TREND_STYLE[c.trendLabel])}>
              {c.trendPct === null ? "—" : formatPct(c.trendPct)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
