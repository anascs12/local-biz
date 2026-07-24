import { describe, it, expect } from "vitest";
import { detectColumns, levenshtein, type RawRow } from "./columnMapper";

// SPEC §11.1 / §26
describe("levenshtein", () => {
  it("computes edit distance", () => {
    expect(levenshtein("qty", "qty")).toBe(0);
    expect(levenshtein("quantity", "quantitys")).toBe(1);
    expect(levenshtein("revenue", "revenu")).toBe(1);
  });
});

describe("detectColumns", () => {
  const demoHeaders = [
    "order_date", "order_id", "product_name", "category",
    "quantity", "unit_price", "revenue", "cost", "customer_city",
  ];
  const demoRows: RawRow[] = [
    { order_date: "2025-08-01", order_id: "UT-1", product_name: "Blue Shirt", category: "Shirts", quantity: "2", unit_price: "2400", revenue: "4800", cost: "3900", customer_city: "Lahore" },
    { order_date: "2025-08-02", order_id: "UT-2", product_name: "Silk Dupatta", category: "Accessories", quantity: "1", unit_price: "4500", revenue: "4500", cost: "2160", customer_city: "Karachi" },
    { order_date: "2025-08-03", order_id: "UT-3", product_name: "Cotton Cap", category: "Accessories", quantity: "3", unit_price: "850", revenue: "2550", cost: "1800", customer_city: "Multan" },
  ];

  it("maps the demo headers (fuzzy, non-exact names)", () => {
    const { mapping, confidence } = detectColumns(demoHeaders, demoRows);
    expect(mapping.date).toBe("order_date");
    expect(mapping.product).toBe("product_name");
    expect(mapping.quantity).toBe("quantity");
    expect(mapping.revenue).toBe("revenue");
    expect(mapping.cost).toBe("cost");
    expect(mapping.category).toBe("category");
    expect(mapping.order_id).toBe("order_id");
    expect(mapping.customer).toBe("customer_city");
    // "unit_price" must NOT steal the Revenue slot from the exact "revenue" header
    expect(confidence.revenue).toBe(1);
  });

  it("handles case/underscore variants", () => {
    const { mapping } = detectColumns(["Order Date", "Item Name", "Units Sold", "Total Amount"], [
      { "Order Date": "2025-08-01", "Item Name": "X", "Units Sold": "2", "Total Amount": "500" },
    ]);
    expect(mapping.date).toBe("Order Date");
    expect(mapping.product).toBe("Item Name");
    expect(mapping.quantity).toBe("Units Sold");
    expect(mapping.revenue).toBe("Total Amount");
  });

  it("uses value-type inference to map an all-dates column with no alias", () => {
    const { mapping } = detectColumns(["when", "item", "total"], [
      { when: "2025-08-01", item: "A", total: "500" },
      { when: "2025-08-02", item: "B", total: "700" },
    ]);
    expect(mapping.date).toBe("when"); // promoted by all-dates inference
    expect(mapping.revenue).toBe("total");
  });

  it("leaves a required field unmapped when nothing matches", () => {
    const { mapping } = detectColumns(["order_date", "product_name", "quantity", "notes"], [
      { order_date: "2025-08-01", product_name: "A", quantity: "2", notes: "hello world foo" },
    ]);
    expect(mapping.revenue).toBeNull();
  });
});
