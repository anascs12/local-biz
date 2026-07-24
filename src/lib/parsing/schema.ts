/**
 * Internal field schema — SPEC §10.1.
 *
 * The canonical target schema every uploaded file is mapped onto. Alias lists
 * and required flags are taken verbatim from the §10.1 table. Aliases are stored
 * in their human form; the column mapper (§11.1) normalizes both sides before
 * comparing.
 */

export type InternalField =
  | "date"
  | "product"
  | "quantity"
  | "revenue"
  | "category"
  | "cost"
  | "customer"
  | "discount"
  | "order_id";

export type FieldKind = "date" | "number" | "string";

export interface FieldSpec {
  field: InternalField;
  /** Human label shown on the mapping review screen (§9.2). */
  label: string;
  required: boolean;
  aliases: string[];
  kind: FieldKind;
  /** Example value shown in the user-facing format guide (§10.1 table). */
  example: string;
}

export const FIELD_SPECS: FieldSpec[] = [
  {
    field: "date",
    label: "Date",
    required: true,
    kind: "date",
    aliases: ["date", "order_date", "sale_date", "transaction_date", "invoice_date", "day"],
    example: "2025-03-14",
  },
  {
    field: "product",
    label: "Product",
    required: true,
    kind: "string",
    aliases: ["product", "product_name", "item", "item_name", "sku", "description"],
    example: "Blue Denim Shirt",
  },
  {
    field: "quantity",
    label: "Quantity",
    required: true,
    kind: "number",
    aliases: ["quantity", "qty", "units", "units_sold", "count", "pieces"],
    example: "3",
  },
  {
    field: "revenue",
    label: "Revenue",
    required: true,
    kind: "number",
    aliases: ["revenue", "sales", "total", "amount", "total_amount", "price", "total_price", "sale_amount"],
    example: "5400",
  },
  {
    field: "category",
    label: "Category",
    required: false,
    kind: "string",
    aliases: ["category", "product_category", "type", "department", "group"],
    example: "Shirts",
  },
  {
    field: "cost",
    label: "Cost",
    required: false,
    kind: "number",
    aliases: ["cost", "total_cost", "purchase_cost", "cogs", "cost_price", "buying_price"],
    example: "3300",
  },
  {
    field: "customer",
    label: "Customer",
    required: false,
    kind: "string",
    aliases: ["customer", "customer_name", "client", "buyer"],
    example: "—",
  },
  {
    field: "discount",
    label: "Discount",
    required: false,
    kind: "number",
    aliases: ["discount", "discount_amount", "discount_value"],
    example: "200",
  },
  {
    field: "order_id",
    label: "Order ID",
    required: false,
    kind: "string",
    aliases: ["order_id", "order", "invoice", "invoice_no", "bill_no", "receipt"],
    example: "INV-1042",
  },
];

export const REQUIRED_FIELDS: InternalField[] = FIELD_SPECS.filter((f) => f.required).map(
  (f) => f.field,
);

export const FIELD_SPEC_BY_NAME: Record<InternalField, FieldSpec> = Object.fromEntries(
  FIELD_SPECS.map((f) => [f.field, f]),
) as Record<InternalField, FieldSpec>;

/** Normalize a header/alias: lowercase, non-alphanumerics → "_", collapse, trim (§11.1). */
export function normalizeHeader(raw: string): string {
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
