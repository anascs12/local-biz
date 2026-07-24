import { describe, it, expect } from "vitest";
import { datasetReducer, initialDatasetState, newDatasetId } from "./datasetReducer";
import { DEFAULT_FILTERS, filterHash, type Filters } from "./FilterContext";
import { loadDemoDataset } from "@/lib/demo/loadDemo";

// SPEC §21.3 — one piece of global state (dataset + filters)
const demo = loadDemoDataset();

describe("datasetReducer", () => {
  it("starts empty and hydrating", () => {
    expect(initialDatasetState.dataset).toBeNull();
    expect(initialDatasetState.hydrating).toBe(true);
  });

  it("LOAD populates the dataset, sets an id, and ends hydration", () => {
    const s = datasetReducer(initialDatasetState, { type: "LOAD", dataset: demo, id: "a" });
    expect(s.dataset).toBe(demo);
    expect(s.datasetId).toBe("a");
    expect(s.hydrating).toBe(false);
  });

  it("LOAD resets filters (old selections rarely apply to a new dataset)", () => {
    let s = datasetReducer(initialDatasetState, { type: "LOAD", dataset: demo, id: "a" });
    s = datasetReducer(s, { type: "SET_FILTERS", patch: { datePreset: "30d" } });
    expect(s.filters.datePreset).toBe("30d");
    s = datasetReducer(s, { type: "LOAD", dataset: demo, id: "b" });
    expect(s.filters).toEqual(DEFAULT_FILTERS);
    expect(s.datasetId).toBe("b");
  });

  it("SET_FILTERS merges partially and RESET_FILTERS restores defaults", () => {
    let s = datasetReducer(initialDatasetState, { type: "LOAD", dataset: demo, id: "a" });
    s = datasetReducer(s, { type: "SET_FILTERS", patch: { categories: ["Shirts"] } });
    expect(s.filters.categories).toEqual(["Shirts"]);
    expect(s.filters.datePreset).toBe("all"); // untouched
    s = datasetReducer(s, { type: "RESET_FILTERS" });
    expect(s.filters).toEqual(DEFAULT_FILTERS);
  });

  it("CLEAR empties the dataset", () => {
    let s = datasetReducer(initialDatasetState, { type: "LOAD", dataset: demo, id: "a" });
    s = datasetReducer(s, { type: "CLEAR" });
    expect(s.dataset).toBeNull();
    expect(s.datasetId).toBeNull();
  });

  it("generates unique dataset ids", () => {
    expect(newDatasetId()).not.toBe(newDatasetId());
  });
});

describe("filterHash", () => {
  it("is stable regardless of category order", () => {
    const a: Filters = { ...DEFAULT_FILTERS, categories: ["Shirts", "Kurtas"] };
    const b: Filters = { ...DEFAULT_FILTERS, categories: ["Kurtas", "Shirts"] };
    expect(filterHash(a)).toBe(filterHash(b));
  });

  it("changes when a filter changes", () => {
    const base = filterHash(DEFAULT_FILTERS);
    expect(filterHash({ ...DEFAULT_FILTERS, datePreset: "30d" })).not.toBe(base);
    expect(filterHash({ ...DEFAULT_FILTERS, categories: ["Shirts"] })).not.toBe(base);
  });
});
