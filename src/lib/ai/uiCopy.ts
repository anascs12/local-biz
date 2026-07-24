/**
 * Client-safe AI copy — SPEC §16.1 / §18.
 *
 * These constants are imported by client components, so they live apart from
 * `prompts.ts`. That module holds the full system prompts, and importing
 * anything from it in a client component drags ~4 KB of server-only prompt text
 * into the browser bundle. Keeping the split means the prompts stay server-side
 * (verified in the build output), even though they are not secret — §28
 * publishes the analyst prompt verbatim in the README.
 */

/** The eight report sections, in order — drives the §9.8 preview card. */
export const REPORT_SECTIONS = [
  "Executive Summary",
  "Sales Performance",
  "Profitability",
  "Product Performance",
  "Category Performance",
  "Key Opportunities",
  "Key Risks",
  "Recommended Actions",
] as const;

/**
 * Suggested questions for the chat empty state — SPEC §16.1.
 * The last two require cost data and are hidden without it.
 */
export const SUGGESTED_QUESTIONS: { text: string; requiresCost: boolean }[] = [
  { text: "Why did my sales change over this period?", requiresCost: false },
  { text: "Which products should I focus on?", requiresCost: false },
  { text: "What are my most profitable products?", requiresCost: true },
  { text: "Which category is performing best?", requiresCost: false },
  { text: "What should I improve next month?", requiresCost: false },
  { text: "Give me five actionable recommendations.", requiresCost: false },
  { text: "Why is revenue increasing but profit decreasing?", requiresCost: true },
  { text: "Which products may need a pricing review?", requiresCost: true },
];

/** The 6 chips shown in the empty state (§9.7), filtered by cost availability. */
export function suggestedQuestions(hasCostData: boolean): string[] {
  return SUGGESTED_QUESTIONS.filter((q) => hasCostData || !q.requiresCost)
    .slice(0, 6)
    .map((q) => q.text);
}
