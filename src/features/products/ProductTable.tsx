"use client";

/**
 * Product Intelligence table — SPEC §9.5.
 * Product · Category · Units · Revenue · Cost · Profit · Margin · Trend · Badges.
 * Sortable by every numeric column. Cost/Profit/Margin are omitted entirely
 * without cost data (§12.5).
 *
 * The trend sparkline (§9.5) is P1 (§32) and lands with the rest of the P1 pass;
 * the trend percentage and its label ship here.
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
import type { ProductMetrics, TrendLabel } from "@/types/analytics";
import { formatNumber, formatPKR, formatPct } from "@/lib/utils/format";
import { ProductBadgeList } from "./ProductBadges";
import { cn } from "@/lib/utils/cn";

type SortKey = "name" | "category" | "unitsSold" | "revenue" | "cost" | "profit" | "marginPct" | "trendPct";

const TREND_STYLE: Record<TrendLabel, string> = {
  growing: "text-success",
  declining: "text-error",
  stable: "text-text-600",
  insufficient: "text-text-400",
};

const TREND_WORD: Record<TrendLabel, string> = {
  growing: "Growing",
  declining: "Declining",
  stable: "Stable",
  insufficient: "Not enough data",
};

function TrendCell({ product }: { product: ProductMetrics }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5", TREND_STYLE[product.trendLabel])}>
      <span className="nums font-medium">
        {product.trendPct === null ? "—" : formatPct(product.trendPct)}
      </span>
      <span className="text-caption">{TREND_WORD[product.trendLabel]}</span>
    </span>
  );
}

export function ProductTable({
  products,
  hasCostData,
}: {
  products: ProductMetrics[];
  hasCostData: boolean;
}) {
  const [sortKey, setSortKey] = React.useState<SortKey>("revenue");
  const [direction, setDirection] = React.useState<SortDirection>("desc");

  const sorted = React.useMemo(() => {
    const rows = [...products];
    rows.sort((a, b) => {
      if (sortKey === "name" || sortKey === "category") {
        const av = a[sortKey];
        const bv = b[sortKey];
        return direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1; // nulls last regardless of direction
      if (bv === null) return -1;
      return direction === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [products, sortKey, direction]);

  const toggle = (key: SortKey) => {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection(key === "name" || key === "category" ? "asc" : "desc");
    }
  };
  const sortFor = (key: SortKey): SortDirection => (sortKey === key ? direction : null);

  if (products.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-bg-card px-4 py-8 text-center text-small text-text-600">
        No products match this classification.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead sortable sort={sortFor("name")} onSort={() => toggle("name")}>
            Product
          </TableHead>
          <TableHead sortable sort={sortFor("category")} onSort={() => toggle("category")}>
            Category
          </TableHead>
          <TableHead numeric sortable sort={sortFor("unitsSold")} onSort={() => toggle("unitsSold")}>
            Units
          </TableHead>
          <TableHead numeric sortable sort={sortFor("revenue")} onSort={() => toggle("revenue")}>
            Revenue
          </TableHead>
          {hasCostData && (
            <>
              <TableHead numeric sortable sort={sortFor("cost")} onSort={() => toggle("cost")}>
                Cost
              </TableHead>
              <TableHead numeric sortable sort={sortFor("profit")} onSort={() => toggle("profit")}>
                Profit
              </TableHead>
              <TableHead numeric sortable sort={sortFor("marginPct")} onSort={() => toggle("marginPct")}>
                Margin
              </TableHead>
            </>
          )}
          <TableHead sortable sort={sortFor("trendPct")} onSort={() => toggle("trendPct")}>
            Trend
          </TableHead>
          <TableHead>Badges</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((p) => (
          <TableRow key={p.name}>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell className="text-text-600">{p.category}</TableCell>
            <TableCell numeric>{formatNumber(p.unitsSold)}</TableCell>
            <TableCell numeric>{formatPKR(p.revenue)}</TableCell>
            {hasCostData && (
              <>
                <TableCell numeric>{formatPKR(p.cost)}</TableCell>
                <TableCell numeric className={p.profit !== null && p.profit < 0 ? "text-error" : undefined}>
                  {formatPKR(p.profit)}
                </TableCell>
                <TableCell numeric className={p.marginPct !== null && p.marginPct < 0 ? "text-error" : undefined}>
                  {formatPct(p.marginPct)}
                </TableCell>
              </>
            )}
            <TableCell>
              <TrendCell product={p} />
            </TableCell>
            <TableCell>
              <ProductBadgeList badges={p.badges} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
