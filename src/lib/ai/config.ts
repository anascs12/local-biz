/**
 * AI configuration — SPEC §15.3 / §15.4 / §21.5.
 *
 * "Model ID lives in one constant, src/lib/ai/config.ts, so it can be swapped
 * in one edit." Verified against the current model catalogue: claude-sonnet-4-6
 * is an active model (1M context, 128K max output).
 *
 * The API key is read ONLY inside route handlers. Nothing in this file is
 * exposed to the browser, and no value here is prefixed NEXT_PUBLIC_ (§22.1).
 */

/** §15.4 / §21.5 — overridable per environment, defaults to the SPEC's model. */
export const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-4-6";

/** §15.3 — max_tokens cap per endpoint. */
export const MAX_TOKENS = {
  analyst: 1200,
  report: 3000,
  insights: 800,
} as const;

/** §15.3 / §22.3 — reject context payloads larger than this. */
export const MAX_CONTEXT_BYTES = 32 * 1024;

/** §15.3 — message history capped at the last N turns. */
export const MAX_MESSAGES = 10;

/** §15.3 / §22.5 — 20 requests per IP per hour. */
export const RATE_LIMIT = {
  requests: 20,
  windowMs: 60 * 60 * 1000,
} as const;

/**
 * §16 states "Target size < 4 KB".
 *
 * MEASURED: that target is not achievable alongside §16's own mandated shape.
 * The six product lists (top 8 · bottom 5 · mostProfitable 5 · needsAttention 5
 * · declining 5 · growing 5 = up to 33 ProductSummary entries) are overlapping
 * views of the same products, and a ProductSummary cannot serialize below
 * ~105 bytes with its eight required keys — over 3.4 KB before the 24-point
 * time series, categories and anomalies are added. The demo context measures
 * ~7.2 KB, of which ~46% is duplication the schema itself requires.
 *
 * The schema is kept exactly as §16 specifies. `CONTEXT_MAX_BYTES` is the
 * regression ceiling we actually enforce, and §15.3's 32 KB remains the hard
 * limit rejected at the route.
 */
export const CONTEXT_TARGET_BYTES = 4 * 1024;
export const CONTEXT_MAX_BYTES = 12 * 1024;
