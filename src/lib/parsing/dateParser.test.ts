import { describe, it, expect } from "vitest";
import { detectDateFormat, parseDate, excelSerialToDate } from "./dateParser";

// SPEC §11.2 / §26
function iso(d: Date | null): string | null {
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("detectDateFormat + parseDate", () => {
  it("parses ISO YYYY-MM-DD", () => {
    const info = detectDateFormat(["2025-03-14", "2025-08-01"])!;
    expect(info.format).toBe("iso");
    expect(iso(parseDate("2025-03-14", info))).toBe("2025-03-14");
  });

  it("disambiguates DD/MM when a first component exceeds 12", () => {
    const info = detectDateFormat(["14/03/2025", "05/06/2025"])!;
    expect(info.format).toBe("numeric");
    expect(info.dayFirst).toBe(true);
    expect(info.ambiguous).toBe(false);
    expect(iso(parseDate("14/03/2025", info))).toBe("2025-03-14");
  });

  it("disambiguates MM/DD when a second component exceeds 12", () => {
    const info = detectDateFormat(["03/14/2025", "06/05/2025"])!;
    expect(info.dayFirst).toBe(false);
    expect(iso(parseDate("03/14/2025", info))).toBe("2025-03-14");
  });

  it("defaults to DD/MM and flags ambiguous when neither component is decisive", () => {
    const info = detectDateFormat(["05/06/2025", "07/08/2025"])!;
    expect(info.dayFirst).toBe(true);
    expect(info.ambiguous).toBe(true);
    expect(iso(parseDate("05/06/2025", info))).toBe("2025-06-05");
  });

  it("parses DD-MM-YYYY and DD-MMM-YYYY", () => {
    const dash = detectDateFormat(["14-03-2025", "22-11-2025"])!;
    expect(iso(parseDate("14-03-2025", dash))).toBe("2025-03-14");
    const month = detectDateFormat(["14-Mar-2025", "01-Aug-2025"])!;
    expect(month.format).toBe("monthName");
    expect(iso(parseDate("14-Mar-2025", month))).toBe("2025-03-14");
  });

  it("converts Excel serial numbers", () => {
    expect(iso(excelSerialToDate(45658))).toBe("2025-01-01");
    const info = detectDateFormat(["45658", "45659"])!;
    expect(info.format).toBe("excel");
    expect(iso(parseDate("45658", info))).toBe("2025-01-01");
  });

  it("rejects garbage and overflow dates", () => {
    const info = detectDateFormat(["2025-01-05"])!;
    expect(parseDate("not-a-date", info)).toBeNull();
    expect(parseDate("2025-02-30", info)).toBeNull(); // round-trip guard
  });
});
