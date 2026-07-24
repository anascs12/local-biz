import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ANALYST_SYSTEM_PROMPT } from "./prompts";

/**
 * The README is the project report and makes factual claims about the shipped
 * code. These guards fail the build rather than let it drift into being wrong —
 * most importantly the system prompt, which is quoted verbatim.
 */
const README = readFileSync(join(process.cwd(), "README.md"), "utf8").replace(/\r\n/g, "\n");

describe("README", () => {
  it("quotes the analyst system prompt VERBATIM (requirement d)", () => {
    expect(README).toContain(ANALYST_SYSTEM_PROMPT);
  });

  it("covers every required section (a–g)", () => {
    const required: [string, RegExp][] = [
      ["a. app name + what it does", /^# LocalBiz AI/m],
      ["a. the problem", /## .*The Problem/],
      ["a. who it's for", /Who it's for/i],
      ["b. live URL", /https:\/\/localbiz-ai-alpha\.vercel\.app/],
      ["c. features list", /## .*Features/],
      ["d. AI feature", /## .*The AI Feature/],
      ["d. system prompt", /## System Prompt/],
      ["e. tools/services/models", /## .*Tools, Services & Models/],
      ["f. screenshots", /## .*Screenshots/],
      ["g. how to run", /## .*Running Locally/],
    ];
    for (const [label, pattern] of required) {
      expect(README, `README missing: ${label}`).toMatch(pattern);
    }
  });

  it("names the exact AI model used (requirement e)", () => {
    expect(README).toContain("claude-sonnet-4-6");
    expect(README).toContain("@anthropic-ai/sdk");
    expect(README).toMatch(/Claude Sonnet/);
  });

  it("references at least 3 screenshots (requirement f)", () => {
    const images = README.match(/!\[[^\]]*\]\(docs\/screenshots\/[^)]+\)/g) ?? [];
    expect(images.length).toBeGreaterThanOrEqual(3);
  });

  it("contains no API key", () => {
    expect(README).not.toMatch(/sk-ant-[A-Za-z0-9_-]{20,}/);
  });

  it("does not claim a database it does not have", () => {
    expect(README).toMatch(/No database/i);
    expect(README).not.toMatch(/supabase/i);
  });

  it("keeps the Limitations honest", () => {
    const limitations = README.slice(README.indexOf("## ⚠️ Limitations"));
    for (const claim of [
      /no user accounts/i,
      /never estimated/i,
      /10 MB/i,
      /100,000 rows/i,
      /in-memory/i,
      /not accounting software/i,
    ]) {
      expect(limitations, `Limitations missing: ${claim}`).toMatch(claim);
    }
  });
});
