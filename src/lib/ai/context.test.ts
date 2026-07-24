import { describe, it, expect } from "vitest";
import { loadDemoDataset } from "@/lib/demo/loadDemo";
import { DEFAULT_FILTERS } from "@/context/FilterContext";
import { buildAIContext, contextByteSize } from "./context";
import { aiContextSchema, analystRequestSchema } from "./schemas";
import { CONTEXT_MAX_BYTES, CONTEXT_TARGET_BYTES, MAX_CONTEXT_BYTES, MAX_MESSAGES } from "./config";
import { computeAnalytics } from "@/lib/analytics";
import type { Dataset } from "@/types/dataset";
import type { Transaction } from "@/types/transaction";
import { deriveProfit } from "@/lib/parsing/normalize";

// SPEC §16 / §26
const dataset = loadDemoDataset();
const context = buildAIContext(dataset, DEFAULT_FILTERS);

/** Recursively collect every key name in an object graph. */
function allKeys(value: unknown, acc = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const v of value) allKeys(v, acc);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      acc.add(k);
      allKeys(v, acc);
    }
  }
  return acc;
}

describe("buildAIContext — schema and grounding (§16)", () => {
  it("validates against the Zod schema", () => {
    const result = aiContextSchema.safeParse(context);
    if (!result.success) console.error(result.error.issues);
    expect(result.success).toBe(true);
  });

  it("carries the same figures the dashboard shows (§15.1)", () => {
    const a = computeAnalytics(dataset, DEFAULT_FILTERS);
    expect(context.totals.revenue).toBeCloseTo(Math.round(a.kpis.totalRevenue * 100) / 100, 2);
    expect(context.totals.orders).toBe(a.kpis.totalOrders);
    expect(context.totals.unitsSold).toBe(a.kpis.unitsSold);
    expect(context.business.currency).toBe("PKR");
    expect(context.business.isDemo).toBe(true);
  });

  it("includes the planted patterns the AI is meant to find (§14.2)", () => {
    expect(context.topProducts[0].name).toBe("Classic Blue Shirt");
    expect(context.needsAttention?.some((p) => p.name === "Classic Blue Shirt")).toBe(true);
    expect(context.mostProfitable?.some((p) => p.name === "Silk Dupatta")).toBe(true);
    expect(context.growingProducts.length).toBeGreaterThan(0);
    expect(context.decliningProducts.length).toBeGreaterThan(0);
    expect(context.anomalies.length).toBeGreaterThan(0);
  });

  it("caps the time series at 24 points (§16)", () => {
    expect(context.timeSeries.points.length).toBeLessThanOrEqual(24);
    // A 6-month window buckets monthly.
    expect(context.timeSeries.granularity).toBe("monthly");
  });
});

// ── §26: "this is the most important test in the suite" ─────────────────────
describe("PRIVACY REGRESSION — no personal data reaches the AI (§16 / §23)", () => {
  it("the demo dataset really does contain customer data", () => {
    // Guard the guard: if this ever stops being true, the test below is vacuous.
    const withCustomer = dataset.transactions.filter((t) => t.customer !== null);
    expect(withCustomer.length).toBeGreaterThan(0);
  });

  it("contains no customer, city, or row-identifier field anywhere", () => {
    const keys = allKeys(context);
    for (const banned of [
      "customer",
      "customer_name",
      "customer_city",
      "city",
      "order_id",
      "transaction_id",
      "transactions",
      "discount",
      "quantity",
      "date",
    ]) {
      expect(keys.has(banned)).toBe(false);
    }
  });

  it("does not leak a single customer value into the serialized payload", () => {
    const serialized = JSON.stringify(context);
    const customers = new Set(
      dataset.transactions.map((t) => t.customer).filter((c): c is string => c !== null),
    );
    expect(customers.size).toBeGreaterThan(0);
    for (const value of customers) {
      expect(serialized).not.toContain(value);
    }
  });

  it("does not leak any order id", () => {
    const serialized = JSON.stringify(context);
    const ids = dataset.transactions
      .map((t) => t.order_id)
      .filter((i): i is string => i !== null)
      .slice(0, 50);
    for (const id of ids) {
      expect(serialized).not.toContain(id);
    }
  });

  it("sends product and category names (business data), which ARE allowed", () => {
    const serialized = JSON.stringify(context);
    expect(serialized).toContain("Classic Blue Shirt");
    expect(serialized).toContain("Accessories");
  });
});

// ── §12.5 / §26: no-cost-data behaviour ─────────────────────────────────────
describe("no cost data → profit fields ABSENT, not null-but-present (§12.5.4 / §26)", () => {
  const noCost = buildAIContext({ ...dataset, hasCostData: false } as Dataset, DEFAULT_FILTERS);

  it("omits the totals profit keys entirely", () => {
    expect("cost" in noCost.totals).toBe(false);
    expect("profit" in noCost.totals).toBe(false);
    expect("profitMarginPct" in noCost.totals).toBe(false);
    expect(noCost.dataQuality.hasCostData).toBe(false);
    // Revenue is unaffected.
    expect(noCost.totals.revenue).toBeGreaterThan(0);
  });

  it("omits mostProfitable and needsAttention entirely", () => {
    expect("mostProfitable" in noCost).toBe(false);
    expect("needsAttention" in noCost).toBe(false);
  });

  it("still validates against the schema", () => {
    expect(aiContextSchema.safeParse(noCost).success).toBe(true);
  });

  it("carries no profit-bearing badge", () => {
    const badges = [...noCost.topProducts, ...noCost.bottomProducts].flatMap((p) => p.badges);
    expect(badges).not.toContain("Most Profitable");
    expect(badges).not.toContain("Needs Attention");
  });
});

// ── §26: size ───────────────────────────────────────────────────────────────
/**
 * §26 asks for a "< 4 KB" assertion. That target is not reachable with §16's
 * own mandated lists — see the note in config.ts. Rather than weaken the
 * schema or fake the assertion, we assert the achievable regression ceiling
 * and the §15.3 hard limit, and record the real number so any growth is
 * visible in the diff.
 */
describe("context size (§16)", () => {
  it("records the actual size and stays under the regression ceiling", () => {
    const size = contextByteSize(context);
    expect(size).toBeLessThan(CONTEXT_MAX_BYTES);
    expect(size).toBeLessThan(MAX_CONTEXT_BYTES); // §15.3 hard limit
    // Documents the §16 gap explicitly rather than hiding it.
    expect(size).toBeGreaterThan(CONTEXT_TARGET_BYTES);
  });

  it("stays bounded for a 100,000-row dataset (size is independent of row count)", () => {
    const products = 300;
    const categories = 25;
    const transactions: Transaction[] = [];
    for (let i = 0; i < 100_000; i++) {
      const revenue = 500 + (i % 977);
      const cost = Math.round(revenue * 0.72);
      const { profit, profit_margin } = deriveProfit(revenue, cost);
      const d = new Date(2025, 0, 1);
      d.setDate(d.getDate() + (i % 365));
      transactions.push({
        transaction_id: `txn_${i}`,
        date: d,
        product: `Product ${i % products}`,
        category: `Category ${i % categories}`,
        quantity: 1 + (i % 4),
        revenue,
        cost,
        profit,
        profit_margin,
        customer: `Customer ${i % 500}`,
        discount: null,
        order_id: `ORD-${i}`,
      });
    }
    const big: Dataset = {
      name: "big.csv",
      isDemo: false,
      transactions,
      hasCostData: true,
      hasOrderIds: true,
      hasCategories: true,
      dateRange: { start: transactions[0].date, end: transactions[transactions.length - 1].date },
      validRowCount: transactions.length,
      skippedRowCount: 0,
      issues: [],
    };

    const bigContext = buildAIContext(big, DEFAULT_FILTERS);
    expect(aiContextSchema.safeParse(bigContext).success).toBe(true);
    // The point of the §26 test: context size does NOT grow with row count.
    expect(contextByteSize(bigContext)).toBeLessThan(CONTEXT_MAX_BYTES);
    expect(contextByteSize(bigContext)).toBeLessThan(MAX_CONTEXT_BYTES); // §15.3
  }, 60_000);
});

// ── §21.4 / §22.3: the schema structurally rejects raw rows ─────────────────
describe("request schemas reject raw transaction data (§21.4)", () => {
  it("rejects a context carrying an extra transactions array", () => {
    const smuggled = { ...context, transactions: dataset.transactions.slice(0, 2) };
    expect(aiContextSchema.safeParse(smuggled).success).toBe(false);
  });

  it("rejects a product summary carrying a customer field", () => {
    const smuggled = JSON.parse(JSON.stringify(context));
    smuggled.topProducts[0].customer = "Ahmed";
    expect(aiContextSchema.safeParse(smuggled).success).toBe(false);
  });

  it("accepts a well-formed analyst request", () => {
    const ok = analystRequestSchema.safeParse({
      context,
      messages: [{ role: "user", content: "Which products should I focus on?" }],
    });
    expect(ok.success).toBe(true);
  });

  it("rejects more than 10 messages (§15.3)", () => {
    const messages = Array.from({ length: MAX_MESSAGES + 1 }, () => ({
      role: "user" as const,
      content: "hi",
    }));
    expect(analystRequestSchema.safeParse({ context, messages }).success).toBe(false);
  });
});
