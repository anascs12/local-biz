import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Light guards on the README. It is intentionally short, so this only checks
 * the things that would actually mislead a reader if they drifted: leaked
 * secrets, a dead demo link, and the honesty of the Limitations section.
 */
const README = readFileSync(join(process.cwd(), "README.md"), "utf8").replace(/\r\n/g, "\n");

describe("README", () => {
  it("contains no API key", () => {
    expect(README).not.toMatch(/sk-ant-[A-Za-z0-9_-]{20,}/);
  });

  it("links the live demo, not a placeholder", () => {
    expect(README).toMatch(/https:\/\/localbiz-ai-alpha\.vercel\.app/);
    expect(README).not.toContain("YOUR_DEPLOYED_URL");
  });

  it("names the model actually used", () => {
    expect(README).toContain("claude-sonnet-4-6");
  });

  it("does not claim a database it does not have", () => {
    expect(README).toMatch(/No database/i);
    expect(README).not.toMatch(/supabase|postgres/i);
  });

  it("keeps the Limitations honest", () => {
    const limitations = README.slice(README.indexOf("## Limitations"));
    for (const claim of [
      /no accounts/i,
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
