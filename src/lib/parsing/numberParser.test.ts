import { describe, it, expect } from "vitest";
import { parseNumber } from "./numberParser";

// SPEC §11.3 / §26
describe("parseNumber", () => {
  it("strips currency symbols and thousands separators", () => {
    expect(parseNumber("Rs. 1,200")).toBe(1200);
    expect(parseNumber("PKR 3,300")).toBe(3300);
    expect(parseNumber("₨ 850")).toBe(850);
    expect(parseNumber("$45")).toBe(45);
    expect(parseNumber("1,234,567")).toBe(1234567);
  });

  it("handles decimals", () => {
    expect(parseNumber("1200.50")).toBe(1200.5);
    expect(parseNumber(".5")).toBe(0.5);
  });

  it("handles parenthesized negatives", () => {
    expect(parseNumber("(500)")).toBe(-500);
    expect(parseNumber("(1,200)")).toBe(-1200);
  });

  it("handles leading signs and native numbers", () => {
    expect(parseNumber("-1200")).toBe(-1200);
    expect(parseNumber(1234)).toBe(1234);
    expect(parseNumber(-3.5)).toBe(-3.5);
  });

  it("rejects non-numeric and empty input", () => {
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("   ")).toBeNull();
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
    expect(parseNumber("12.")).toBeNull();
    expect(parseNumber(Infinity)).toBeNull();
  });
});
