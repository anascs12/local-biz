/**
 * Request validation schemas — SPEC §21.4 / §22.3.
 *
 * "No route ever accepts or forwards raw transaction rows; the Zod schema for
 * AIContext structurally prevents it."
 *
 * Every object is `.strict()`, so an unknown key anywhere — `customer`,
 * `transactions`, a stray column name — fails validation rather than being
 * silently passed through to the model. That is the structural guarantee: the
 * only shape that parses is the §16 schema.
 */

import { z } from "zod";
import { MAX_MESSAGES } from "./config";

const finite = z.number().finite();
const finiteOrNull = finite.nullable();

const productSummarySchema = z
  .object({
    name: z.string(),
    category: z.string(),
    unitsSold: finite,
    revenue: finite,
    profit: finiteOrNull,
    marginPct: finiteOrNull,
    trendPct: finiteOrNull,
    badges: z.array(z.string()),
  })
  .strict();

const categorySummarySchema = z
  .object({
    name: z.string(),
    revenue: finite,
    profit: finiteOrNull,
    marginPct: finiteOrNull,
    unitsSold: finite,
    contributionPct: finite,
    trendPct: finiteOrNull,
  })
  .strict();

export const aiContextSchema = z
  .object({
    business: z
      .object({
        datasetName: z.string(),
        isDemo: z.boolean(),
        currency: z.literal("PKR"),
        dateRange: z
          .object({ start: z.string(), end: z.string(), days: finite })
          .strict(),
        appliedFilters: z
          .object({
            categories: z.union([z.array(z.string()), z.literal("all")]),
            datePreset: z.string(),
          })
          .strict(),
      })
      .strict(),

    dataQuality: z
      .object({
        hasCostData: z.boolean(),
        costCoveragePct: finite,
        hasOrderIds: z.boolean(),
        hasCategories: z.boolean(),
        totalTransactions: finite,
        skippedRows: finite,
        distinctDays: finite,
        trendReliability: z.enum(["good", "limited", "insufficient"]),
      })
      .strict(),

    totals: z
      .object({
        revenue: finite,
        // Absent entirely when hasCostData is false (§12.5.4).
        cost: finite.optional(),
        profit: finite.optional(),
        profitMarginPct: finiteOrNull.optional(),
        orders: finite,
        unitsSold: finite,
        averageOrderValue: finite,
        growthRatePct: finiteOrNull,
      })
      .strict(),

    timeSeries: z
      .object({
        granularity: z.enum(["daily", "weekly", "monthly"]),
        points: z
          .array(
            z
              .object({
                period: z.string(),
                revenue: finite,
                profit: finiteOrNull,
                orders: finite,
              })
              .strict(),
          )
          .max(24), // §16
      })
      .strict(),

    topProducts: z.array(productSummarySchema).max(8),
    bottomProducts: z.array(productSummarySchema).max(5),
    mostProfitable: z.array(productSummarySchema).max(5).optional(),
    needsAttention: z.array(productSummarySchema).max(5).optional(),
    decliningProducts: z.array(productSummarySchema).max(5),
    growingProducts: z.array(productSummarySchema).max(5),

    categories: z.array(categorySummarySchema),

    patterns: z
      .object({
        weekendUpliftPct: finiteOrNull,
        bestDayOfWeek: z.string().nullable(),
        worstDayOfWeek: z.string().nullable(),
        bestPeriod: z.object({ period: z.string(), revenue: finite }).strict().nullable(),
        worstPeriod: z.object({ period: z.string(), revenue: finite }).strict().nullable(),
      })
      .strict(),

    anomalies: z.array(
      z
        .object({
          type: z.enum([
            "revenue_spike",
            "revenue_drop",
            "consecutive_decline",
            "margin_outlier",
          ]),
          description: z.string(),
          metric: z.string(),
        })
        .strict(),
    ),
  })
  .strict();

export const chatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(4000),
  })
  .strict();

/** POST /api/analyst — §15.3 */
export const analystRequestSchema = z
  .object({
    context: aiContextSchema,
    messages: z.array(chatMessageSchema).min(1).max(MAX_MESSAGES),
  })
  .strict();

/** POST /api/report — §15.3 */
export const reportRequestSchema = z.object({ context: aiContextSchema }).strict();

/** POST /api/insights — §15.3 */
export const insightsRequestSchema = z.object({ context: aiContextSchema }).strict();

/** §19 — the insight object the model must return. */
export const insightSchema = z
  .object({
    icon: z.enum(["trend-up", "trend-down", "alert", "star", "calendar"]),
    headline: z.string().min(1).max(90),
    detail: z.string().min(1).max(140),
    metric: z.string().min(1),
    severity: z.enum(["positive", "neutral", "warning"]),
  })
  .strict();

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type Insight = z.infer<typeof insightSchema>;
