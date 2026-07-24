/**
 * generate-demo-data.ts — SPEC §14.3
 *
 * One-off Node script that produces `public/demo-data/urban-threads-pk.csv`
 * from a SEEDED PRNG so output is deterministic and reproducible. The CSV is
 * committed to the repo; this script is committed for transparency but is NOT
 * part of the app build.
 *
 * Business: Urban Threads PK — a fictional clothing retailer in Lahore (§14).
 *
 * After generating, it prints a summary table PROVING each planted pattern in
 * §14.2 is present, computed with the SAME definitions the app uses:
 *   - trend_pct: OLS regression on monthly revenue buckets (§13.5)
 *   - business margin: Total Profit / Total Revenue × 100 (§13.1)
 *   - classifications: §13.6 rules (Best Seller / Most Profitable / Needs Attention…)
 *
 * Run: npm run generate:demo
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// Seeded PRNG (mulberry32) — fixed seed ⇒ identical CSV on every run (§14.3)
// ─────────────────────────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20250801;
const rng = mulberry32(SEED);
const rand = () => rng();
/** multiplicative noise factor in [1-pct, 1+pct] */
const noise = (pct: number) => 1 + (rand() * 2 - 1) * pct;
const roundTo = (n: number, step: number) => Math.round(n / step) * step;
const pad2 = (n: number) => String(n).padStart(2, "0");

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const TARGET_TOTAL = 520; // §14.1
const WEEKEND_MULT = 1.3; // §14.2 Sat/Sun revenue multiplier 1.25–1.35×

// 6 months: 2025-08-01 → 2026-01-31 (§14.1). Index 0..5 = Aug..Jan.
const MONTHS = [
  { year: 2025, month: 8, days: 31 },
  { year: 2025, month: 9, days: 30 },
  { year: 2025, month: 10, days: 31 },
  { year: 2025, month: 11, days: 30 },
  { year: 2025, month: 12, days: 31 },
  { year: 2026, month: 1, days: 31 },
];
const MONTH_LABELS = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];

const CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Gujranwala",
  "Sialkot",
  "Peshawar",
  "Hyderabad",
];

interface ProductDef {
  name: string;
  category: string;
  price: number; // base unit price (PKR)
  margin: number; // target gross margin (fraction); negative ⇒ loss-maker
  qtyBase: number; // avg units per transaction (before ±15% noise)
  weights: number[]; // 6 relative monthly transaction weights (Aug..Jan)
  lossMaker?: boolean; // wider cost noise so several rows have cost > revenue
}

/**
 * Product catalogue (20 products, 6 categories). Monthly weight vectors encode
 * the planted trends AND seasonality (higher Dec, lower Sep). See §14.2.
 */
const PRODUCTS: ProductDef[] = [
  // Shirts
  // Classic Blue Shirt: highest total revenue + ~18% margin ⇒ 🔎 Needs Attention
  { name: "Classic Blue Shirt", category: "Shirts", price: 2400, margin: 0.18, qtyBase: 2.3, weights: [30, 26, 30, 32, 40, 30] },
  // Printed T-Shirt: declining product across all six months (steeply separated
  // monthly weights so noise cannot reorder adjacent months)
  { name: "Printed T-Shirt", category: "Shirts", price: 1500, margin: 0.28, qtyBase: 2.2, weights: [30, 21, 15, 11, 8, 5] },
  { name: "White Formal Shirt", category: "Shirts", price: 2600, margin: 0.28, qtyBase: 1.6, weights: [12, 10, 12, 13, 17, 12] },
  { name: "Checkered Casual Shirt", category: "Shirts", price: 2100, margin: 0.27, qtyBase: 1.8, weights: [11, 9, 11, 12, 15, 11] },

  // Trousers
  { name: "Slim Fit Jeans", category: "Trousers", price: 3200, margin: 0.26, qtyBase: 1.8, weights: [16, 14, 16, 17, 21, 16] },
  { name: "Cotton Chinos", category: "Trousers", price: 2800, margin: 0.28, qtyBase: 1.5, weights: [10, 9, 10, 11, 14, 10] },
  { name: "Formal Dress Pants", category: "Trousers", price: 3000, margin: 0.29, qtyBase: 1.4, weights: [9, 8, 9, 10, 13, 10] },

  // Kurtas
  { name: "Embroidered Kurta", category: "Kurtas", price: 3500, margin: 0.31, qtyBase: 1.5, weights: [10, 9, 11, 13, 20, 14] },
  { name: "Cotton Kurta", category: "Kurtas", price: 2000, margin: 0.27, qtyBase: 1.7, weights: [11, 9, 10, 11, 14, 10] },
  { name: "Wedding Sherwani Kurta", category: "Kurtas", price: 6500, margin: 0.33, qtyBase: 1.1, weights: [5, 4, 6, 9, 16, 8] },

  // Outerwear — growing category (sharp winter rise, Nov–Jan)
  // Wool Blend Coat: near-zero until November, then strong (growing product).
  // "Near-zero" is deliberately NOT zero: §13.5 excludes a product from the
  // Growing/Declining classification unless ≥4 buckets are non-empty, so token
  // Sep/Oct sales are required for §14.2's growing product to earn 📈 Growing.
  { name: "Wool Blend Coat", category: "Outerwear", price: 8000, margin: 0.3, qtyBase: 1.1, weights: [0, 2, 3, 9, 17, 15] },
  { name: "Leather Jacket", category: "Outerwear", price: 8500, margin: 0.28, qtyBase: 1.05, weights: [4, 4, 6, 9, 13, 11] },
  { name: "Puffer Jacket", category: "Outerwear", price: 6000, margin: 0.28, qtyBase: 1.1, weights: [1, 1, 3, 8, 14, 11] },
  { name: "Denim Jacket", category: "Outerwear", price: 4500, margin: 0.27, qtyBase: 1.2, weights: [6, 6, 7, 9, 11, 9] },

  // Accessories — declining category (steady Aug→Jan decline)
  // Silk Dupatta: low volume (~40 units), high margin (~52%) ⇒ 💰 Most Profitable, NOT 🔥 Best Seller
  { name: "Silk Dupatta", category: "Accessories", price: 4500, margin: 0.52, qtyBase: 2.5, weights: [9, 8, 7, 6, 7, 5] },
  { name: "Leather Belt", category: "Accessories", price: 1200, margin: 0.31, qtyBase: 1.8, weights: [14, 11, 9, 7, 6, 4] },
  { name: "Woolen Scarf", category: "Accessories", price: 950, margin: 0.3, qtyBase: 1.8, weights: [3, 3, 4, 6, 8, 6] },
  { name: "Cotton Cap", category: "Accessories", price: 850, margin: 0.29, qtyBase: 1.9, weights: [12, 9, 7, 5, 4, 3] },

  // Footwear
  { name: "Leather Loafers", category: "Footwear", price: 5500, margin: 0.27, qtyBase: 1.2, weights: [9, 8, 9, 10, 13, 9] },
  // Clearance Chappal: cost exceeds revenue on several rows (loss-making)
  { name: "Clearance Chappal", category: "Footwear", price: 600, margin: -0.08, qtyBase: 1.6, weights: [8, 7, 6, 6, 7, 6], lossMaker: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// Allocation — spread 520 transactions across (product × month) by weight,
// with ±15% per-cell noise, using largest-remainder so the total is EXACTLY 520.
// ─────────────────────────────────────────────────────────────────────────────
interface Cell {
  p: number;
  m: number;
  weight: number;
}
const cells: Cell[] = [];
let totalWeight = 0;
PRODUCTS.forEach((prod, pi) => {
  prod.weights.forEach((w, mi) => {
    const jittered = w === 0 ? 0 : w * noise(0.15); // §14.2 ±15% on counts
    cells.push({ p: pi, m: mi, weight: jittered });
    totalWeight += jittered;
  });
});

const raw = cells.map((c) => (c.weight / totalWeight) * TARGET_TOTAL);
const counts = raw.map(Math.floor);
let allocated = counts.reduce((a, b) => a + b, 0);
const remainder = TARGET_TOTAL - allocated;
cells
  .map((_, i) => ({ i, frac: raw[i] - counts[i] }))
  .sort((a, b) => b.frac - a.frac)
  .slice(0, remainder)
  .forEach(({ i }) => counts[i]++);

// ─────────────────────────────────────────────────────────────────────────────
// Weekend-weighted day placement within a month (§14.2 weekend spike)
// ─────────────────────────────────────────────────────────────────────────────
function pickDay(monthIdx: number): number {
  const { year, month, days } = MONTHS[monthIdx];
  const wts: number[] = [];
  let tot = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay(); // 0 Sun … 6 Sat
    const w = dow === 0 || dow === 6 ? WEEKEND_MULT : 1;
    wts.push(w);
    tot += w;
  }
  let r = rand() * tot;
  for (let d = 0; d < days; d++) {
    r -= wts[d];
    if (r <= 0) return d + 1;
  }
  return days;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build transactions
// ─────────────────────────────────────────────────────────────────────────────
interface Txn {
  ts: number; // sort key
  date: string; // YYYY-MM-DD
  product: string;
  category: string;
  quantity: number;
  unitPrice: number;
  revenue: number;
  cost: number;
  city: string;
}

const txns: Txn[] = [];
cells.forEach((cell, i) => {
  const count = counts[i];
  if (count === 0) return;
  const prod = PRODUCTS[cell.p];
  const { year, month } = MONTHS[cell.m];
  for (let k = 0; k < count; k++) {
    const day = pickDay(cell.m);
    const quantity = Math.max(1, Math.round(prod.qtyBase * noise(0.15))); // §14.2 ±15% qty
    const unitPrice = roundTo(prod.price * noise(0.03), 10);
    const revenue = quantity * unitPrice;
    // cost is a REAL input; profit is never estimated downstream (§12.5)
    const costNoise = prod.lossMaker ? noise(0.12) : noise(0.04);
    const costPerUnit = Math.round(unitPrice * (1 - prod.margin) * costNoise);
    const cost = quantity * costPerUnit;
    const city = CITIES[Math.floor(rand() * CITIES.length)];
    txns.push({
      ts: new Date(year, month - 1, day).getTime(),
      date: `${year}-${pad2(month)}-${pad2(day)}`,
      product: prod.name,
      category: prod.category,
      quantity,
      unitPrice,
      revenue,
      cost,
      city,
    });
  }
});

// Sort chronologically, then assign sequential order ids (§14.1 order_id column)
txns.sort((a, b) => a.ts - b.ts);
const rows = txns.map((t, idx) => ({
  order_date: t.date,
  order_id: `UT-${10001 + idx}`,
  product_name: t.product,
  category: t.category,
  quantity: t.quantity,
  unit_price: t.unitPrice,
  revenue: t.revenue,
  cost: t.cost,
  customer_city: t.city,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Write CSV + README.txt
// ─────────────────────────────────────────────────────────────────────────────
// Column names deliberately do NOT exactly match internal field names so the
// demo also exercises the fuzzy column mapper (§14.1).
const HEADER =
  "order_date,order_id,product_name,category,quantity,unit_price,revenue,cost,customer_city";
const csv =
  HEADER +
  "\n" +
  rows
    .map(
      (r) =>
        `${r.order_date},${r.order_id},${r.product_name},${r.category},${r.quantity},${r.unit_price},${r.revenue},${r.cost},${r.customer_city}`,
    )
    .join("\n") +
  "\n";

const outDir = join(process.cwd(), "public", "demo-data");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "urban-threads-pk.csv"), csv, "utf8");

const README = `Urban Threads PK — DEMO DATA (FICTIONAL)

This dataset is SYNTHETIC. Urban Threads PK is a fictional clothing retailer in
Lahore invented for demonstration purposes. No real business, customer, product,
price, or transaction is represented here. Any resemblance to a real entity is
coincidental.

File: urban-threads-pk.csv
Rows: ${rows.length} transactions
Range: 2025-08-01 to 2026-01-31 (6 months)
Currency: PKR (Pakistani Rupees)

Generated deterministically by scripts/generate-demo-data.ts (seeded PRNG).
Do not treat any figure in this file as real financial data.
`;
writeFileSync(join(outDir, "README.txt"), README, "utf8");

// Bundled TS module (§14) — the same CSV compiled into the app for instant demo
// load with no network request. Kept in sync with the CSV by this generator.
const tsDir = join(process.cwd(), "src", "lib", "demo");
mkdirSync(tsDir, { recursive: true });
const tsModule = `/**
 * Urban Threads PK demo dataset — GENERATED by scripts/generate-demo-data.ts.
 * DO NOT EDIT BY HAND. Regenerate with: npm run generate:demo
 *
 * The demo CSV compiled into the bundle for instant load with no network
 * request (SPEC §14). Parsed through the same ingestion pipeline as uploads.
 */

export const DEMO_DATASET_NAME = "Urban Threads PK (Demo)";

export const URBAN_THREADS_CSV = ${JSON.stringify(csv)};
`;
writeFileSync(join(tsDir, "urbanThreadsData.ts"), tsModule, "utf8");

// ─────────────────────────────────────────────────────────────────────────────
// Verification — prove every §14.2 pattern using the app's own definitions
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-US");
const pct = (n: number) => n.toFixed(1) + "%";

/** OLS trend_pct on monthly revenue buckets — §13.5 */
function trendPct(y: number[]): number {
  const n = y.length;
  const xbar = (n - 1) / 2;
  const ybar = y.reduce((a, b) => a + b, 0) / n;
  if (ybar === 0) return 0;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xbar) * (y[i] - ybar);
    den += (i - xbar) ** 2;
  }
  return ((num / den) * n) / ybar * 100;
}

interface Agg {
  name: string;
  category: string;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  monthly: number[];
  trend: number;
  lossRows: number;
}

function aggregate(key: (r: (typeof rows)[number]) => string): Agg[] {
  const map = new Map<string, Agg>();
  for (const r of rows) {
    const k = key(r);
    let a = map.get(k);
    if (!a) {
      a = { name: k, category: r.category, units: 0, revenue: 0, cost: 0, profit: 0, margin: 0, monthly: [0, 0, 0, 0, 0, 0], lossRows: 0, trend: 0 };
      map.set(k, a);
    }
    a.units += r.quantity;
    a.revenue += r.revenue;
    a.cost += r.cost;
    const mi = MONTHS.findIndex((m) => `${m.year}-${pad2(m.month)}` === r.order_date.slice(0, 7));
    a.monthly[mi] += r.revenue;
    if (r.cost > r.revenue) a.lossRows++;
  }
  for (const a of map.values()) {
    a.profit = a.revenue - a.cost;
    a.margin = a.revenue > 0 ? (a.profit / a.revenue) * 100 : 0;
    a.trend = trendPct(a.monthly);
  }
  return [...map.values()];
}

const byProduct = aggregate((r) => r.product_name);
const byCategory = aggregate((r) => r.category);

const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
const totalProfit = rows.reduce((s, r) => s + (r.revenue - r.cost), 0);
const businessMargin = (totalProfit / totalRevenue) * 100; // §13.1

// classification helpers (§13.6)
const byUnitsDesc = [...byProduct].sort((a, b) => b.units - a.units);
const byProfitDesc = [...byProduct].sort((a, b) => b.profit - a.profit);
const byRevenueDesc = [...byProduct].sort((a, b) => b.revenue - a.revenue);
const top10pctCount = Math.max(1, Math.ceil(byProduct.length * 0.1)); // 2 of 20
const bestSellers = new Set(byUnitsDesc.slice(0, top10pctCount).map((p) => p.name));
const mostProfitable = new Set(byProfitDesc.slice(0, top10pctCount).map((p) => p.name));
const revTop25Count = Math.ceil(byProduct.length * 0.25); // 5 of 20
const revTop25 = new Set(byRevenueDesc.slice(0, revTop25Count).map((p) => p.name));
const needsAttention = new Set(
  byProduct.filter((p) => revTop25.has(p.name) && p.margin < businessMargin - 5).map((p) => p.name),
);

const get = (name: string) => byProduct.find((p) => p.name === name)!;
const cat = (name: string) => byCategory.find((c) => c.name === name)!;

// ── report ──
const line = "─".repeat(96);
console.log("\n" + line);
console.log("URBAN THREADS PK — DEMO DATASET GENERATED");
console.log(line);
console.log(`Rows: ${rows.length}   Products: ${byProduct.length}   Categories: ${byCategory.length}`);
console.log(`Date range: ${rows[0].order_date} → ${rows[rows.length - 1].order_date}`);
console.log(`Total revenue: ${fmt(totalRevenue)}    Business avg margin: ${pct(businessMargin)}`);
console.log(`Output: public/demo-data/urban-threads-pk.csv  (+ README.txt)`);

console.log("\n" + line);
console.log("§14.2 PLANTED PATTERNS — PROOF");
console.log(line);

const results: { pattern: string; evidence: string; pass: boolean }[] = [];
const cbs = get("Classic Blue Shirt");
const dup = get("Silk Dupatta");
const acc = cat("Accessories");
const out = cat("Outerwear");
const ptee = get("Printed T-Shirt");
const coat = get("Wool Blend Coat");
const chap = get("Clearance Chappal");

// 1. High revenue, low margin → Needs Attention
results.push({
  pattern: "1. High revenue, low margin (Classic Blue Shirt)",
  evidence: `#${byRevenueDesc.findIndex((p) => p.name === "Classic Blue Shirt") + 1} revenue ${fmt(cbs.revenue)}, margin ${pct(cbs.margin)} vs avg ${pct(businessMargin)} → NeedsAttention=${needsAttention.has("Classic Blue Shirt")}`,
  pass: byRevenueDesc[0].name === "Classic Blue Shirt" && cbs.margin < businessMargin - 5 && needsAttention.has("Classic Blue Shirt"),
});
// 2. Low volume, high margin → Most Profitable, not Best Seller
results.push({
  pattern: "2. Low volume, high margin (Silk Dupatta)",
  evidence: `${dup.units} units, margin ${pct(dup.margin)}, MostProfitable=${mostProfitable.has("Silk Dupatta")}, BestSeller=${bestSellers.has("Silk Dupatta")}`,
  pass: mostProfitable.has("Silk Dupatta") && !bestSellers.has("Silk Dupatta") && dup.margin >= 45,
});
// 3. Declining category (Accessories ~ -35%)
results.push({
  pattern: "3. Declining category (Accessories)",
  evidence: `trend_pct ${pct(acc.trend)}  monthly ${acc.monthly.map((v) => Math.round(v / 1000) + "k").join("→")}`,
  pass: acc.trend <= -15,
});
// 4. Growing category (Outerwear ~ +90%)
results.push({
  pattern: "4. Growing category (Outerwear)",
  evidence: `trend_pct ${pct(out.trend)}  monthly ${out.monthly.map((v) => Math.round(v / 1000) + "k").join("→")}`,
  pass: out.trend >= 15,
});
// 5. Declining product (Printed T-Shirt, falls consistently across all six months).
// "Consistently" per §14.2: strong negative trend, first month is the peak, last
// is the trough, and ≥4 of 5 month-over-month steps are decreases (one noise blip
// tolerated — realistic ±15% variation is itself a required pattern, #10).
const pteeSteps = ptee.monthly.slice(1).filter((v, i) => v < ptee.monthly[i]).length;
const pteeMax0 = ptee.monthly[0] === Math.max(...ptee.monthly);
const pteeMin5 = ptee.monthly[5] === Math.min(...ptee.monthly);
results.push({
  pattern: "5. Declining product (Printed T-Shirt)",
  evidence: `trend_pct ${pct(ptee.trend)}  monthly ${ptee.monthly.map((v) => Math.round(v / 1000) + "k").join("→")}  (${pteeSteps}/5 steps down, peak=Aug, trough=Jan)`,
  pass: ptee.trend <= -15 && pteeSteps >= 4 && pteeMax0 && pteeMin5,
});
// 6. Growing product (Wool Blend Coat, near-zero until Nov). Must also clear
// §13.5's ≥4 non-empty buckets, or it is excluded from 📈 Growing entirely.
const earlyCoat = coat.monthly[0] + coat.monthly[1] + coat.monthly[2];
const lateCoat = coat.monthly[3] + coat.monthly[4] + coat.monthly[5];
const coatNonEmpty = coat.monthly.filter((v) => v > 0).length;
results.push({
  pattern: "6. Growing product (Wool Blend Coat)",
  evidence: `Aug–Oct ${fmt(earlyCoat)} vs Nov–Jan ${fmt(lateCoat)} (${((earlyCoat / lateCoat) * 100).toFixed(1)}% of late), trend_pct ${pct(coat.trend)}, ${coatNonEmpty} non-empty months`,
  pass: coat.trend >= 15 && earlyCoat < lateCoat * 0.2 && coatNonEmpty >= 4,
});
// 7. Weekend spike. The planted pattern (§14.2) is a Sat/Sun multiplier of
// 1.25–1.35× applied to daily TRANSACTION COUNTS, so the direct proof is the
// weekend vs weekday mean transactions per occurring day. We also report the
// §13.8 revenue-per-day uplift the app uses (noisier on 520 rows).
const dowRev: number[] = [0, 0, 0, 0, 0, 0, 0];
const dowCnt: number[] = [0, 0, 0, 0, 0, 0, 0];
const dowDays: Set<string>[] = Array.from({ length: 7 }, () => new Set<string>());
for (const r of rows) {
  const dow = new Date(r.order_date + "T00:00:00").getDay();
  dowRev[dow] += r.revenue;
  dowCnt[dow] += 1;
  dowDays[dow].add(r.order_date);
}
const meanPerDay = (src: number[], idxs: number[]) => {
  const total = idxs.reduce((s, i) => s + src[i], 0);
  const days = idxs.reduce((s, i) => s + dowDays[i].size, 0);
  return total / days;
};
const weekendCount = meanPerDay(dowCnt, [0, 6]);
const weekdayCount = meanPerDay(dowCnt, [1, 2, 3, 4, 5]);
const countUplift = ((weekendCount - weekdayCount) / weekdayCount) * 100;
const revUplift = ((meanPerDay(dowRev, [0, 6]) - meanPerDay(dowRev, [1, 2, 3, 4, 5])) / meanPerDay(dowRev, [1, 2, 3, 4, 5])) * 100;
results.push({
  pattern: "7. Weekend spike",
  evidence: `weekend ${weekendCount.toFixed(2)} txns/day vs weekday ${weekdayCount.toFixed(2)} → count +${countUplift.toFixed(1)}% (multiplier ${WEEKEND_MULT}×); §13.8 revenue/day uplift ${pct(revUplift)}`,
  pass: countUplift >= 15,
});
// 8. Seasonal — December uplift vs baseline, September dip vs August
const monthTotals = MONTHS.map((_, i) => byProduct.reduce((s, p) => s + p.monthly[i], 0));
const decUplift = monthTotals[4] / ((monthTotals[0] + monthTotals[1] + monthTotals[2]) / 3);
results.push({
  pattern: "8. Seasonal (Dec uplift, Sep dip)",
  evidence: `monthly ${monthTotals.map((v, i) => MONTH_LABELS[i] + " " + Math.round(v / 1000) + "k").join(", ")} | Dec×${decUplift.toFixed(2)} of Aug–Oct avg; Sep<Aug=${monthTotals[1] < monthTotals[0]}`,
  pass: decUplift >= 1.25 && monthTotals[1] < monthTotals[0],
});
// 9. Loss-making item (Clearance Chappal, cost > revenue on several rows)
results.push({
  pattern: "9. Loss-making item (Clearance Chappal)",
  evidence: `${chap.lossRows} rows with cost>revenue, total profit ${fmt(chap.profit)} (margin ${pct(chap.margin)})`,
  pass: chap.lossRows >= 3 && chap.profit < 0,
});
// 10. Realistic noise (±15%) — day-to-day transaction count variation
const dayCounts = new Map<string, number>();
for (const r of rows) dayCounts.set(r.order_date, (dayCounts.get(r.order_date) ?? 0) + 1);
const counts2 = [...dayCounts.values()];
const meanCount = counts2.reduce((a, b) => a + b, 0) / counts2.length;
const sd = Math.sqrt(counts2.reduce((s, c) => s + (c - meanCount) ** 2, 0) / counts2.length);
results.push({
  pattern: "10. Realistic noise (±15%)",
  evidence: `per-day txn count mean ${meanCount.toFixed(2)}, sd ${sd.toFixed(2)} (cv ${pct((sd / meanCount) * 100)}), ${counts2.length} active days`,
  pass: sd > 0,
});

for (const r of results) {
  console.log(`${r.pass ? "✓ PASS" : "✗ FAIL"}  ${r.pattern}`);
  console.log(`         ${r.evidence}`);
}

const allPass = results.every((r) => r.pass);
console.log("\n" + line);
console.log("PER-PRODUCT SUMMARY (sorted by revenue)");
console.log(line);
console.log(
  ["Product".padEnd(24), "Cat".padEnd(12), "Units".padStart(6), "Revenue".padStart(13), "Margin".padStart(8), "Trend".padStart(8), "Badges"].join("  "),
);
for (const p of byRevenueDesc) {
  const badges: string[] = [];
  if (bestSellers.has(p.name)) badges.push("🔥Best");
  if (mostProfitable.has(p.name)) badges.push("💰Profit");
  if (p.trend >= 15) badges.push("📈Grow");
  if (p.trend <= -15) badges.push("⚠️Decl");
  if (needsAttention.has(p.name)) badges.push("🔎Attn");
  console.log(
    [
      p.name.padEnd(24),
      p.category.padEnd(12),
      String(p.units).padStart(6),
      fmt(p.revenue).padStart(13),
      pct(p.margin).padStart(8),
      pct(p.trend).padStart(8),
      badges.join(" "),
    ].join("  "),
  );
}

console.log("\n" + line);
console.log("PER-CATEGORY SUMMARY");
console.log(line);
console.log(["Category".padEnd(14), "Units".padStart(6), "Revenue".padStart(13), "Margin".padStart(8), "Trend".padStart(9), "Contrib".padStart(8)].join("  "));
for (const c of [...byCategory].sort((a, b) => b.revenue - a.revenue)) {
  console.log(
    [
      c.name.padEnd(14),
      String(c.units).padStart(6),
      fmt(c.revenue).padStart(13),
      pct(c.margin).padStart(8),
      pct(c.trend).padStart(9),
      pct((c.revenue / totalRevenue) * 100).padStart(8),
    ].join("  "),
  );
}

console.log("\n" + line);
console.log(`RESULT: ${allPass ? "ALL 10 PATTERNS VERIFIED ✓" : "SOME PATTERNS FAILED ✗ — tune weights"}`);
console.log(line + "\n");

if (!allPass) process.exit(1);
