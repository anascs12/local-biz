import { describe, it, expect } from "vitest";
import { loadDemoDataset, DEMO_DATASET_NAME } from "./loadDemo";
import { serializeDataset, deserializeDataset } from "@/lib/utils/datasetSnapshot";

// SPEC §14 / §21.2 / §30
describe("loadDemoDataset", () => {
  it("loads the bundled demo through the real ingestion pipeline", () => {
    const ds = loadDemoDataset();
    expect(ds.name).toBe(DEMO_DATASET_NAME);
    expect(ds.isDemo).toBe(true);
    expect(ds.validRowCount).toBe(520);
    expect(ds.skippedRowCount).toBe(0);
    expect(ds.hasCostData).toBe(true);
    expect(ds.hasOrderIds).toBe(true);
    expect(ds.hasCategories).toBe(true);
    expect(ds.transactions).toHaveLength(520);
  });

  it("memoizes so repeat demo clicks are instant", () => {
    expect(loadDemoDataset()).toBe(loadDemoDataset());
  });
});

describe("dataset snapshot round-trip (§21.2)", () => {
  it("revives Date objects so a refresh does not corrupt the dataset", () => {
    const ds = loadDemoDataset();
    const revived = deserializeDataset(serializeDataset(ds));

    expect(revived).not.toBeNull();
    expect(revived!.validRowCount).toBe(ds.validRowCount);
    expect(revived!.transactions).toHaveLength(ds.transactions.length);

    // Dates must come back as real Date objects, not ISO strings.
    expect(revived!.transactions[0].date).toBeInstanceOf(Date);
    expect(revived!.dateRange.start).toBeInstanceOf(Date);
    expect(revived!.transactions[0].date.getTime()).toBe(ds.transactions[0].date.getTime());
    expect(revived!.dateRange.start.getTime()).toBe(ds.dateRange.start.getTime());
    expect(revived!.dateRange.end.getTime()).toBe(ds.dateRange.end.getTime());

    // Numeric fidelity is preserved (grounded figures must survive persistence).
    const sum = (rows: { revenue: number }[]) => rows.reduce((s, r) => s + r.revenue, 0);
    expect(sum(revived!.transactions)).toBe(sum(ds.transactions));
  });

  it("rejects corrupt snapshots instead of throwing", () => {
    expect(deserializeDataset("not json")).toBeNull();
    expect(deserializeDataset("{}")).toBeNull();
    expect(deserializeDataset(JSON.stringify({ transactions: "nope" }))).toBeNull();
  });
});
