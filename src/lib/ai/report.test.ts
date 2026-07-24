import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { loadDemoDataset } from "@/lib/demo/loadDemo";
import { DEFAULT_FILTERS } from "@/context/FilterContext";
import { buildAIContext } from "./context";
import { POST } from "@/app/api/report/route";
import { resetRateLimits, rateLimit } from "@/lib/utils/rateLimit";
import { RATE_LIMIT } from "./config";
import { ANALYST_SYSTEM_PROMPT, REPORT_SYSTEM_PROMPT } from "./prompts";
import { REPORT_SECTIONS } from "./uiCopy";

// SPEC §18 / §15.3 / §26
const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-a-real-key";
afterAll(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY;
});

const context = buildAIContext(loadDemoDataset(), DEFAULT_FILTERS);

let ip = 0;
function post(body: unknown, addr = `10.1.0.${++ip}`): Promise<Response> {
  return POST(
    new Request("http://localhost/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": addr },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => resetRateLimits());

describe("REPORT_SYSTEM_PROMPT (§18)", () => {
  it("is the analyst prompt plus the report instructions", () => {
    // §18: "the analyst prompt above plus the report instruction block below"
    expect(REPORT_SYSTEM_PROMPT.startsWith(ANALYST_SYSTEM_PROMPT)).toBe(true);
    expect(REPORT_SYSTEM_PROMPT.length).toBeGreaterThan(ANALYST_SYSTEM_PROMPT.length);
  });

  it("keeps the groundedness rules that make the report trustworthy (§17)", () => {
    // §17 is hard-wrapped, so compare against whitespace-normalized text.
    const flat = REPORT_SYSTEM_PROMPT.replace(/\s+/g, " ");
    expect(flat).toContain("Never invent numbers");
    expect(flat).toContain("Never estimate, assume, or infer cost, profit, or margin");
    expect(flat).toContain("Base every insight strictly on the provided context object");
  });

  it("names all eight sections, in order, as level-2 headings", () => {
    let cursor = -1;
    for (const section of REPORT_SECTIONS) {
      const at = REPORT_SYSTEM_PROMPT.indexOf(`## ${section}`);
      expect(at, `missing section: ${section}`).toBeGreaterThan(-1);
      expect(at, `section out of order: ${section}`).toBeGreaterThan(cursor);
      cursor = at;
    }
    expect(REPORT_SECTIONS).toHaveLength(8);
  });

  it("specifies the metric-backed recommendation format (§18)", () => {
    expect(REPORT_SYSTEM_PROMPT).toContain("*Reason:*");
    expect(REPORT_SYSTEM_PROMPT).toContain("*Supporting metric:*");
  });

  it("forbids estimating profit when cost data is missing (§12.5)", () => {
    expect(REPORT_SYSTEM_PROMPT).toContain(
      "only a short statement that profit analysis is unavailable without cost data",
    );
    expect(REPORT_SYSTEM_PROMPT).toContain("Do not estimate.");
  });
});

describe("POST /api/report — guards (§15.3)", () => {
  it("accepts a well-formed context shape", async () => {
    // Reaches the provider call with a fake key; the stream closes on auth
    // failure, so we assert it passed validation rather than 4xx'd.
    const res = await post({ context });
    expect([200, 502]).toContain(res.status);
  });

  it("rejects a payload over 32 KB", async () => {
    const bloated = { context, filler: "x".repeat(40_000) };
    expect((await post(bloated)).status).toBe(413);
  });

  it("rejects unknown top-level fields (§21.4)", async () => {
    const res = await post({ context, transactions: [{ customer: "Ahmed" }] });
    expect(res.status).toBe(400);
  });

  it("rejects a missing context", async () => {
    expect((await post({})).status).toBe(400);
  });

  it("shares the rate limiter with the analyst route (§22.5)", async () => {
    const addr = "203.0.113.42";
    for (let i = 0; i < RATE_LIMIT.requests; i++) {
      rateLimit(`ai:${addr}`, RATE_LIMIT.requests, RATE_LIMIT.windowMs);
    }
    const res = await post({ context }, addr);
    expect(res.status).toBe(429);
    expect(await res.text()).toMatch(/limit for this hour/i);
  });

  it("returns a plain sentence, never a provider body", async () => {
    const text = await (await post({})).text();
    expect(text).not.toMatch(/zod|invalid_type|anthropic|api_key|at .*:\d+:\d+/i);
  });
});
