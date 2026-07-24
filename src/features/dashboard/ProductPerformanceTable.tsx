"use client";

/**
 * Product performance table — SPEC §9.3.
 * Sortable, 10 rows visible. Numeric columns right-aligned with tabular figures
 * (§20.5). Profit/Margin columns are omitted entirely when there is no cost
 * data (§12.5).
 */

import * as React from "react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type SortDirection,
} from "@/components/ui/Table";
import type { ProductMetrics } from "@/types/analytics";
import { formatNumber, formatPKR, formatPct } from "@/lib/utils/format";
import { ProductBadgeList } from "@/features/products/ProductBadges";

type SortKey = "name" | "unitsSold" | "revenue" | "profit" | "marginPct";

const VISIBLE_ROWS = 10;

export function ProductPerformanceTable({
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
      if (sortKey === "name") {
        return direction === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      // Nulls always sort last, whichever direction is active.
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return direction === "asc" ? av - bv : bv - av;
    });
    return rows.slice(0, VISIBLE_ROWS);
  }, [products, sortKey, direction]);

  const toggle = (key: SortKey) => {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection(key === "name" ? "asc" : "desc");
    }
  };

  const sortFor = (key: SortKey): SortDirection => (sortKey === key ? direction : null);

  return (
    <Card padded={false}>
      <div className="flex items-center justify-between gap-3 p-card-pad-mobile md:p-card-pad">
        <CardTitle>Product performance</CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-caption text-text-400">
            Top {Math.min(VISIBLE_ROWS, products.length)} of {formatNumber(products.length)}
          </span>
          <Link href="/products" className="text-small font-medium text-primary-600 hover:text-primary-700">
            View all
          </Link>
        </div>
      </div>
      <Table contained={false} containerClassName="px-0">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead sortable sort={sortFor("name")} onSort={() => toggle("name")}>
              Product
            </TableHead>
            <TableHead>Category</TableHead>
            <TableHead numeric sortable sort={sortFor("unitsSold")} onSort={() => toggle("unitsSold")}>
              Units
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
                  <TableCell numeric className={p.profit !== null && p.profit < 0 ? "text-error" : undefined}>
                    {formatPKR(p.profit)}
                  </TableCell>
                  <TableCell numeric className={p.marginPct !== null && p.marginPct < 0 ? "text-error" : undefined}>
                    {formatPct(p.marginPct)}
                  </TableCell>
                </>
              )}
              <TableCell>
                <ProductBadgeList badges={p.badges} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
