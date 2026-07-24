import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ANALYST_SYSTEM_PROMPT } from "./prompts";
import { REPORT_SECTIONS } from "./uiCopy";

/**
 * SPEC §28 / §31(d) — "the full system prompt in a code block", "reproduced
 * verbatim in the README".
 *
 * The README makes a factual claim about the shipped code. Rather than trust
 * that the two stay in sync by hand, this test fails the build if the prompt is
 * ever edited in one place and not the other.
 */
// Normalize line endings: .gitattributes stores LF, but a Windows working copy
// may check out CRLF. The prompt text is still compared verbatim.
const README = readFileSync(join(process.cwd(), "README.md"), "utf8").replace(/\r\n/g, "\n");

describe("README (§28)", () => {
  it("contains the analyst system prompt VERBATIM", () => {
    expect(README).toContain(ANALYST_SYSTEM_PROMPT);
  });

  it("has every section §28 requires, in order", () => {
    const required = [
      "# LocalBiz AI",
      "## What It Does",
      "## The Problem",
      "## Who It Helps",
      "## Live Demo",
      "## Features",
      "## AI Feature",
      "## Tech Stack",
      "## How It Works",
      "## Data Format",
      "## Screenshots",
      "## How to Run Locally",
      "## Environment Variables",
      "## Deployment",
      "## Project Structure",
      "## Future Improvements",
      "## Limitations",
      "## License",
    ];
    let cursor = -1;
    for (const heading of required) {
      const at = README.indexOf(heading);
      expect(at, `missing README section: ${heading}`).toBeGreaterThan(-1);
      expect(at, `README section out of order: ${heading}`).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it("names the AI model explicitly (§31e)", () => {
    expect(README).toContain("Claude Sonnet");
    expect(README).toContain("claude-sonnet-4-6");
    expect(README).toContain("@anthropic-ai/sdk");
  });

  it("states the no-database decision rather than implying a database (§28)", () => {
    expect(README).toMatch(/No Supabase and no PostgreSQL/i);
    expect(README).not.toMatch(/\bsupabase\b(?!\sand no)/i);
  });

  it("keeps the Limitations section genuinely honest (§28)", () => {
    const limitations = README.slice(README.indexOf("## Limitations"));
    for (const claim of [
      /no user accounts/i,
      /no database/i,
      /never estimated/i,
      /four time buckets/i,
      /10 MB/i,
      /100,000 rows/i,
      /English only/i,
      /third-party API and can fail/i,
      /in-memory/i,
      /not accounting software/i,
    ]) {
      expect(limitations, `Limitations missing: ${claim}`).toMatch(claim);
    }
  });

  it("does not claim screenshots exist while they are still missing", () => {
    // Honest placeholder — this assertion flips once the images are committed.
    expect(README).toMatch(/Not yet captured/i);
  });

  it("contains no real API key", () => {
    expect(README).not.toMatch(/sk-ant-[A-Za-z0-9_-]{20,}/);
  });

  it("documents the eight report sections consistently with the prompt", () => {
    expect(REPORT_SECTIONS).toHaveLength(8);
    expect(README).toMatch(/eight-section/i);
  });
});
