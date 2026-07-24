# LocalBiz AI — Project Specification & Build Blueprint

**Version:** 1.0
**Status:** Approved for implementation
**Audience:** The AI coding agent (Claude Code) and any human developer building this app
**Build window:** 4 days
**Tagline:** Turn your business data into better decisions.

> **Rule of this document:** every technical fork has exactly one recommended answer. Where an alternative existed, it was considered and rejected — the reason is stated inline. Do not re-litigate. Build what is written here.

---

## 1. Executive Summary

LocalBiz AI is a browser-based analytics product for small Pakistani businesses. A shop owner uploads the sales file they already keep — a CSV export or an Excel sheet — and within seconds gets a working business intelligence dashboard, product-level performance intelligence, and an AI analyst that answers plain-language questions using only their real numbers.

The product's defining constraint is **groundedness**. Every number displayed is computed deterministically in TypeScript from the user's own rows. The LLM never sees raw transactions and never calculates anything; it receives a pre-computed, bounded JSON context object and its only job is explanation, prioritization, and recommendation. This is what separates LocalBiz AI from a chatbot with a chart library bolted on, and it is the single most important architectural commitment in this document.

The MVP is deliberately small. There are no accounts, no database persistence of user data, no multi-tenancy. Data lives in browser memory for the length of a session. This removes authentication, row-level security, GDPR-shaped obligations, and migration work from a 4-day schedule, and it happens to be the strongest possible privacy story: *your sales data never leaves your browser except as anonymous aggregates.*

**Deliverables at the end of day 4:** a public Vercel URL that works in incognito, a public GitHub repo, a complete README with four screenshots, a demo dataset that loads in one click, and a working AI analyst.

---

## 2. Problem Statement

Small businesses in Pakistan generate the data required for good decisions and then fail to use it. The data exists — in Excel, in a POS export, in a hand-maintained ledger typed into a spreadsheet — but the layer that turns rows into decisions is missing. Hiring an analyst is not economic at this revenue scale. Power BI and Tableau are priced and designed for enterprises, require training, and assume a data model the owner does not have. The result is a specific and expensive form of blindness.

The owner cannot answer questions that materially change profit:

- Which products actually generate revenue, as opposed to feeling busy?
- Which products generate *profit*, which is a different list?
- Which products are quietly declining while total revenue masks the decline?
- Why is revenue up but the bank balance flat?
- Where should the next Rs. 200,000 of purchasing budget go?

These are not exotic analytics. They are arithmetic over data the owner already owns. The gap is tooling and interpretation, not information.

LocalBiz AI closes exactly that gap: ingest the file that already exists, compute the metrics, and explain them in language a non-technical owner can act on this week.

---

## 3. Target Audience

Small and medium businesses in Pakistan with roughly 50–5,000 transactions per month and at least a partial digital sales record: local retail shops, clothing stores, grocery stores, electronics shops, cosmetics sellers, small wholesalers, online sellers (Daraz/Instagram/Shopify), and home businesses.

Interface language is English. Default currency is PKR, formatted as `Rs. 1,234,567` using `en-PK` locale grouping.

---

## 4. Goals and Non-Goals

### 4.1 Goals

| # | Goal | How it is measured |
|---|---|---|
| G1 | Analytics accessible to non-technical owners | Zero jargon in UI; every metric has a tooltip definition |
| G2 | Accept the files users already have | CSV, XLSX, XLS all parse |
| G3 | Clean and validate automatically | Fuzzy column mapping + row-level validation report |
| G4 | Compute real business KPIs | 6 headline KPIs + trends, all deterministic |
| G5 | Polished, legible dashboard | Ships design system in §20; no default-template look |
| G6 | Surface winners and losers | Product Intelligence with 6 transparent classifications |
| G7 | AI grounded in data | LLM receives computed context only; never raw rows |
| G8 | Actionable, not generic, recommendations | Every recommendation carries a supporting metric |
| G9 | Instant demo | One click from landing → full dashboard, no upload |
| G10 | Publicly deployed | Live Vercel URL working in incognito |
| G11 | Lightweight and fast | <2s to interactive; 10k rows processed <3s |

### 4.2 Non-Goals (explicitly out of MVP scope)

Accounting software · POS system · payment processing · real-time inventory sync · ERP features · payroll · tax filing · multi-country tax · warehouse management · multi-tenant SaaS infrastructure · native mobile apps · enterprise permissions · real-time collaboration · user accounts · persistent storage of user data · Urdu localization · forecasting.

**Enforcement rule:** if a task during the build maps to anything in this list, it is not built. No exceptions, including "it's only a small version of it."

---

## 5. User Personas

### Persona 1 — Ahmed, Small Retail Business Owner

- **Business:** clothing shop in Lahore, ~Rs. 1.2M monthly revenue, 18 SKUs
- **Technical skill:** low-to-moderate; competent in Excel basics, no formulas beyond SUM
- **Current workflow:** types each day's sales into an Excel sheet in the evening
- **Problem:** knows total revenue, has no idea which items are profitable after supplier cost
- **Goal:** decide what to reorder before the next buying trip
- **Design implication:** Ahmed will not read instructions. The upload page must accept a messy real-world sheet and explain failures in one sentence. Profit must be foregrounded, not buried.

### Persona 2 — Sara, Small Online Seller

- **Business:** online cosmetics store, sells via Instagram and Daraz
- **Technical skill:** moderate; comfortable with CSV exports and filters
- **Current workflow:** downloads monthly CSV exports from her store platform
- **Problem:** has data but no analytics; column names come from the platform, not from her
- **Goal:** identify best-selling and declining products before restocking
- **Design implication:** Sara's columns will be named `order_date`, `item_name`, `total`. Fuzzy column mapping is aimed at her. Trend detection (growing/declining) is her core value.

### Persona 3 — The Demo User (grader, student, evaluator)

- **Context:** arrives from a link, has ~90 seconds of patience, has no data to upload
- **Goal:** see a working dashboard immediately, test the AI, understand the product
- **Design implication:** "Try Demo" is a co-equal primary CTA on the landing page, not a footnote. It must load a fully populated dashboard in under one second with no modal, no form, no email gate.

---

## 6. User Journeys

### 6.1 Primary journey — demo path

```
Landing page
  → click "Try Demo"
  → demo dataset loads into memory (instant, no network)
  → Dashboard (KPIs, charts, AI insight cards)
  → Sales Analytics → Product Intelligence → Category Intelligence
  → AI Business Analyst (ask questions)
  → Generate AI Business Report → download as Markdown
```

### 6.2 Primary journey — upload path

```
Landing page
  → click "Upload Your Data"
  → Upload page: drag-drop or file picker
  → parse + auto column mapping
  → Column Mapping Review (user confirms/corrects detected mappings)
  → Validation Report (valid rows, invalid rows, plain-language errors)
  → click "Continue to Dashboard" (enabled only if minimum requirements met)
  → Dashboard → ... → AI Report
```

### 6.3 Recovery journeys

| Situation | Behavior |
|---|---|
| Missing required column | Validation blocks; mapping screen highlights the unmapped required field; user can manually map any column via dropdown |
| No cost column | Proceed allowed. Global `hasCostData=false`. All profit UI hidden or disabled with an explanatory note. AI is told profit is unavailable. |
| Some rows invalid | Proceed allowed if ≥1 valid row. Banner: "412 of 430 rows imported. 18 rows skipped — [View details]" |
| AI request fails | Chat shows inline retry; dashboard and analytics remain fully functional |
| User navigates to /dashboard with no data | Empty state: "No data loaded yet" + Try Demo + Upload buttons |

**Navigation rule:** a persistent left sidebar (desktop) / bottom tab bar (mobile) is visible on every data page. The current dataset name and row count sit in the header at all times, with a "Change data" action. The user must never be uncertain about which dataset they are looking at.

---

## 7. Feature Specification

| ID | Feature | Priority | Summary |
|---|---|---|---|
| F1 | Landing page | P0 | Marketing page, dual CTA |
| F2 | Demo mode | P0 | One-click load of bundled dataset |
| F3 | File upload | P0 | CSV/XLSX/XLS, drag-drop + picker |
| F4 | Column auto-mapping | P0 | Fuzzy match to normalized schema, user-correctable |
| F5 | Validation engine | P0 | Row + dataset level, plain-language errors |
| F6 | Dashboard | P0 | 6 KPIs, 5 charts, insight cards, filters |
| F7 | Sales Analytics | P0 | Trends by day/week/month, AOV, growth |
| F8 | Product Intelligence | P0 | Per-product table + 6 classifications |
| F9 | Category Intelligence | P0 | Category performance and contribution |
| F10 | AI Business Analyst | P0 | Chat grounded in computed context |
| F11 | AI Business Report | P0 | 8-section generated report |
| F12 | AI Insight Cards | P1 | 3–5 auto-generated dashboard insights |
| F13 | Date + category filters | P0 | Global, applied to all computations |
| F14 | Report download | P1 | Markdown / print-to-PDF |
| F15 | Sample CSV download | P1 | Template file for users |
| F16 | Responsive layout | P0 | Works at 375px through 1920px |

---

## 8. Information Architecture

```
/                    Landing page
/upload              Data upload + mapping + validation
/dashboard           Main dashboard
/analytics           Sales analytics
/products            Product intelligence
/categories          Category intelligence
/analyst             AI Business Analyst (chat)
/report              AI Business Report
```

All data routes share an `AppLayout` (sidebar + header). All data routes are guarded by a `RequireDataset` wrapper that renders the empty state if no dataset is in context.

---

## 9. Page-by-Page UI Specification

### 9.1 Landing Page (`/`)

Single scrolling page, max content width 1200px, generous vertical rhythm (96px section padding desktop / 56px mobile).

1. **Nav bar** — wordmark "LocalBiz AI" left; links (Features, How it works) center; "Try Demo" ghost button + "Upload Your Data" primary button right. Sticky, translucent on scroll.
2. **Hero** — H1: *Turn your business data into better decisions.* Sub: one-line description. Two CTAs. Right side (or below, on mobile): a real screenshot of the dashboard, not an illustration.
3. **Problem statement** — three-column: "You have the data" / "You don't have the time" / "You don't have an analyst." Short, direct copy.
4. **How it works** — three numbered steps: Upload your file → We analyze it → Ask the AI anything. Each with a small icon and one sentence.
5. **Key features** — 6-card grid: Dashboard, Product Intelligence, Category Intelligence, AI Analyst, AI Report, Works with your existing files.
6. **AI Business Analyst explainer** — split section. Left: a mocked chat exchange showing a real question and a structured answer. Right: three bullets explaining groundedness ("Never invents numbers", "Reads your computed metrics, not your raw records", "Every claim cites a metric").
7. **Sample analytics preview** — a live Recharts chart rendered from the demo dataset. This is real, not an image.
8. **Final CTA** — restated headline + both buttons.
9. **Footer** — wordmark, "Built for Pakistani small businesses", GitHub link, disclaimer: "Demo data is fictional. Your uploaded data stays in your browser."

### 9.2 Upload Page (`/upload`)

Three sequential stages in one route, driven by local state (`idle → mapping → validated`).

**Stage 1 — Drop zone.** Dashed 2px border card, 280px tall, centered icon + "Drag your file here or click to browse". Below: "CSV, XLSX or XLS · up to 10 MB · up to 100,000 rows". Two secondary links: "Download sample CSV" and "See required format". A collapsible panel shows the expected schema table (§10.1) with an example row. A privacy note sits under the drop zone: *Your file is processed entirely in your browser. It is never uploaded to a server. Please do not include customer names, phone numbers, or addresses.*

**Stage 2 — Column mapping review.** A table with one row per internal field (Date, Product, Quantity, Revenue, Category, Cost, Customer, Discount, Order ID). Each row shows: field name, required/optional badge, a `<select>` of the file's detected headers with the auto-detected match preselected, and a 3-value preview from that column. Confidence < 0.8 matches are flagged amber with "Please confirm". Required fields left unmapped show red. "Continue" is disabled until all four required fields are mapped.

**Stage 3 — Validation report.** Summary strip: total rows, valid rows (green), skipped rows (amber). Below, a grouped list of issues, e.g. "12 rows had an unreadable date · 4 rows had a blank product name · 2 rows had negative revenue", each expandable to show up to 10 example row numbers. If `hasCostData === false`, a prominent info card explains that profit analysis will be unavailable and why. Primary button: "Continue to Dashboard".

### 9.3 Dashboard (`/dashboard`)

- **Filter bar** (sticky under header): date-range segmented control (7d / 30d / 90d / This year / All time / Custom), category multi-select, and a "Showing X of Y transactions" counter.
- **KPI row:** 6 cards — Total Revenue, Total Profit, Profit Margin, Total Orders, Units Sold, Growth Rate. Each shows value, label, and period-over-period delta with directional arrow and color. Profit and Margin cards render in a disabled state with an ⓘ tooltip ("Add a cost column to unlock profit analysis") when `hasCostData` is false.
- **AI insight cards:** horizontal row of 3–5 compact cards, each with an icon, one-sentence insight, and the metric it derives from.
- **Charts (2-column grid, stacking to 1 on mobile):**
  1. Revenue over time (area chart, auto-granularity)
  2. Profit over time (line chart; hidden entirely if no cost data)
  3. Sales by category (horizontal bar, sorted desc)
  4. Top 10 products by revenue (horizontal bar)
  5. Bottom 10 products by revenue (horizontal bar, muted color)
- **Product performance table:** sortable, 10 rows visible, "View all" links to `/products`.

### 9.4 Sales Analytics (`/analytics`)

Granularity toggle (Daily / Weekly / Monthly) applies to every chart on the page. Contents: revenue trend, profit trend, order count trend, units trend, average order value trend, and a day-of-week breakdown bar chart (this is what surfaces the weekend spike). A summary strip above the charts states period growth rates for revenue, orders, and AOV. If order IDs are unavailable, the AOV card carries the note: *Calculated per transaction — your file has no order ID column, so each row is treated as one order.*

### 9.5 Product Intelligence (`/products`)

Classification filter chips across the top (All · 🔥 Best Sellers · 📈 Growing · ⚠️ Declining · 💰 Most Profitable · 📦 Low Volume · 🔎 Needs Attention), each showing a count. Below, a table: Product · Category · Units · Revenue · Cost · Profit · Margin · Trend (sparkline + %) · Badges. Sortable by every numeric column. Clicking a row opens a side drawer with that product's revenue-over-time chart and its full metric list. An info popover on the chips header links to the exact classification rules (§13.6) — rules are shown to the user, not hidden.

### 9.6 Category Intelligence (`/categories`)

Four highlight cards: Best category (revenue), Most profitable, Fastest growing, Declining. Then a contribution donut (revenue share), a grouped bar chart (revenue vs profit per category), and a category table with revenue, profit, margin, units, contribution %, and growth %.

### 9.7 AI Business Analyst (`/analyst`)

Standard chat column, max-width 760px. Empty state offers 6 suggested question chips drawn from §16.1. Messages render Markdown. Assistant responses use the four-part structure (What happened / Why it matters / Recommended action / Evidence) as bolded subheads. A collapsible "View the data the AI received" panel at the top of the thread displays the actual context JSON — this is a trust feature and is required, not optional. Streaming responses; input disabled while streaming; error state offers Retry.

### 9.8 AI Business Report (`/report`)

Before generation: a preview card listing the eight sections that will be produced, the current filter scope, and a "Generate Report" button. During: skeleton with progress copy. After: the rendered report with the business name, date range, generation timestamp, a "Regenerate" button, a "Download as Markdown" button, and a print stylesheet so Ctrl+P produces a clean PDF. Footer disclaimer: *This report is generated by an AI model from your data. Observations are computed from your records; recommendations are suggestions, not financial advice.*

---

## 10. Data Model

### 10.1 Expected input schema (documented for users)

| Field | Required | Accepted header variations | Example |
|---|---|---|---|
| Date | ✅ | date, order_date, sale_date, transaction_date, invoice_date, day | 2025-03-14 |
| Product | ✅ | product, product_name, item, item_name, sku, description | Blue Denim Shirt |
| Quantity | ✅ | quantity, qty, units, units_sold, count, pieces | 3 |
| Revenue | ✅ | revenue, sales, total, amount, total_amount, price, total_price, sale_amount | 5400 |
| Category | ○ | category, product_category, type, department, group | Shirts |
| Cost | ○ | cost, total_cost, purchase_cost, cogs, cost_price, buying_price | 3300 |
| Customer | ○ | customer, customer_name, client, buyer | — |
| Discount | ○ | discount, discount_amount, discount_value | 200 |
| Order ID | ○ | order_id, order, invoice, invoice_no, bill_no, receipt | INV-1042 |

### 10.2 Normalized internal record

```ts
interface Transaction {
  transaction_id: string;      // generated: `txn_${index}` if no order id
  date: Date;                  // parsed, normalized to local midnight
  product: string;             // trimmed, whitespace-collapsed
  category: string;            // "Uncategorized" if absent
  quantity: number;            // > 0
  revenue: number;             // >= 0
  cost: number | null;         // null when unavailable
  profit: number | null;       // null when cost is null
  profit_margin: number | null;// null when cost is null or revenue === 0
  customer: string | null;
  discount: number | null;
  order_id: string | null;
}

interface Dataset {
  name: string;                // file name, or "Urban Threads PK (Demo)"
  isDemo: boolean;
  transactions: Transaction[];
  hasCostData: boolean;        // >= 80% of rows have a valid, non-zero cost
  hasOrderIds: boolean;
  hasCategories: boolean;
  dateRange: { start: Date; end: Date };
  validRowCount: number;
  skippedRowCount: number;
  issues: ValidationIssue[];
}
```

### 10.3 Derived metric definitions

```
profit         = revenue − cost                     (only when cost !== null)
profit_margin  = (profit / revenue) × 100           (only when revenue > 0)
```

**`hasCostData` threshold rationale:** requiring 100% cost coverage would disqualify real files that have a handful of blanks; accepting 1% would produce a badly misleading profit total. 80% is the threshold. When true, rows with a missing cost are excluded from profit aggregates (never treated as zero cost), and the profit KPI card carries a footnote: *Based on 412 of 430 transactions that include cost data.*

### 10.4 Edge case handling

| Case | Rule |
|---|---|
| Zero revenue | Row kept (legitimate free/replacement item). Excluded from margin calculations; denominator guards everywhere. |
| Negative revenue | Row kept and flagged as a likely return. Included in revenue sums. Excluded from "top product" rankings. |
| Missing cost on some rows | Row kept. `cost = null`. Excluded from profit aggregates. |
| Missing cost on most rows | `hasCostData = false`. All profit UI disabled. **Never estimated.** |
| Cost > revenue | Kept. Produces negative profit — this is real and often the most valuable insight in the dataset. |
| Missing category | Assigned `"Uncategorized"`. If >50% uncategorized, Category Intelligence shows a caution banner. |
| Missing customer | `null`. No customer-based features exist in MVP. |
| Quantity ≤ 0 | Row rejected as invalid; counted in skipped rows. |
| Duplicate records | Exact match on (date, product, quantity, revenue) → flagged, **not removed**. Repeat sales are genuinely common. The validation report notes the count and offers a "Remove exact duplicates" checkbox, default off. |
| Unparseable date | Row rejected. |
| Empty product name | Row rejected. |
| Product name casing variants | Normalized: trim, collapse internal whitespace, title-cased for grouping. "blue shirt" and "Blue Shirt " become one product. |

---

## 11. Data Processing Pipeline

All processing runs **client-side in the browser**. No user file is ever transmitted to a server.

```
File
 └─▶ 1. FILE VALIDATION      extension, MIME, size ≤ 10 MB
 └─▶ 2. PARSE                PapaParse (CSV) | SheetJS (XLSX/XLS) → raw rows + headers
 └─▶ 3. COLUMN DETECTION     fuzzy header match → ColumnMapping + confidence scores
 └─▶ 4. USER CONFIRMATION    mapping review UI (blocking)
 └─▶ 5. ROW NORMALIZATION    coerce types, parse dates, clean strings → Transaction[]
 └─▶ 6. ROW VALIDATION       reject invalid rows, collect issues
 └─▶ 7. DATASET ASSEMBLY     flags, date range, issue summary → Dataset
 └─▶ 8. STORE                React context (in-memory) + sessionStorage snapshot
 └─▶ 9. ANALYTICS ENGINE     pure functions, memoized on (dataset, filters)
 └─▶ 10. AI CONTEXT BUILDER  analytics → bounded JSON (< 4 KB)
```

### 11.1 Column detection algorithm

For each internal field, score every file header and take the best match above threshold:

1. **Exact match** on normalized header (lowercase, non-alphanumerics → `_`) against the alias list in §10.1 → confidence **1.0**
2. **Contains match** (header contains an alias or vice versa) → confidence **0.85**
3. **Levenshtein distance** ≤ 2 against any alias → confidence **0.7**
4. **Value-type inference** as a tiebreaker: a column whose first 20 non-empty values all parse as dates is a strong Date candidate; all-numeric columns are candidates for quantity/revenue/cost, disambiguated by magnitude (quantity columns have a much lower mean).

A header is assigned to at most one field; assignment is greedy by descending confidence. Anything below 0.6 is left unmapped for the user to set manually. Confidence < 0.8 is surfaced as "Please confirm" in the UI.

### 11.2 Date parsing

Try in this order and take the first that yields a valid date for ≥90% of sampled rows:
`YYYY-MM-DD` → `DD/MM/YYYY` → `MM/DD/YYYY` → `DD-MM-YYYY` → `DD-MMM-YYYY` → Excel serial number → native `Date` parse.

**DD/MM vs MM/DD ambiguity:** scan the column. If any value has a first component > 12, the format is DD/MM. If any has a second component > 12, it is MM/DD. If neither is decisive, default to **DD/MM/YYYY** (Pakistani convention) and display a notice on the mapping screen: *Dates were read as day/month/year. [Switch to month/day/year]*. Silent misparsing of dates is the highest-severity failure mode in this product; it must be visible and correctable.

### 11.3 Number parsing

Strip currency symbols (`Rs.`, `PKR`, `₨`, `$`), thousands separators (`,`), and whitespace. Handle parenthesized negatives `(1200)` → `-1200`. Reject anything remaining that is not finite.

### 11.4 Performance

Files over 5,000 rows parse inside a Web Worker so the UI thread stays responsive; a determinate progress bar is shown. Analytics functions are pure and wrapped in `useMemo` keyed on `(datasetId, filterHash)`. Filtering runs once per change and every downstream metric derives from the single filtered array — never re-filter inside individual chart components.

---

## 12. Data Validation Rules

### 12.1 File-level (block on failure)

| Check | Message shown |
|---|---|
| Extension in `.csv .xlsx .xls` | "That file type isn't supported. Please upload a CSV or Excel file." |
| Size ≤ 10 MB | "This file is 14.2 MB. The maximum is 10 MB. Try exporting a shorter date range." |
| Parses without exception | "We couldn't read this file. It may be corrupted or password-protected." |
| ≥ 1 data row after header | "This file appears to be empty." |
| ≤ 100,000 rows | "This file has 142,000 rows. The maximum is 100,000. Try splitting it by month." |

### 12.2 Dataset-level (block on failure)

| Check | Message |
|---|---|
| All four required fields mapped | "We couldn't find a **Cost** column… " — actually: "We couldn't find a column for **Revenue**. Please choose which column contains your sale amounts." |
| ≥ 1 valid row survives | "None of the rows in this file could be read. Please check the format and try again." |

### 12.3 Row-level (skip the row, keep the dataset)

| Check | Grouped message |
|---|---|
| Date parses | "N rows had a date we couldn't read" |
| Product name non-empty after trim | "N rows had no product name" |
| Quantity numeric and > 0 | "N rows had a missing or invalid quantity" |
| Revenue numeric and finite | "N rows had a missing or invalid sale amount" |
| Cost numeric if present | "N rows had an invalid cost — those rows are included, but excluded from profit" (warning, not a skip) |
| Date within 1970–(today + 1 year) | "N rows had a date outside a reasonable range" |

### 12.4 Warnings (never block)

- More than 20% of rows lack cost → *Profit will be based on the N% of rows that include cost.*
- Fewer than 20% of rows have cost → `hasCostData = false`.
- Fewer than 14 distinct days of data → *Trend analysis needs at least two weeks of data to be meaningful. Growth figures on this dataset are indicative only.*
- More than 50% "Uncategorized" → *Most rows have no category, so category analysis is limited.*
- Exact duplicates present → *N rows are exact duplicates of another row. This is often normal (repeat sales). [Remove them]*

### 12.5 The cost-data rule (non-negotiable)

When `hasCostData === false`:

1. Profit and Profit Margin KPI cards render disabled with an explanation.
2. Profit-over-time and profit-per-category charts are removed from the DOM, not shown empty.
3. The 💰 Most Profitable classification is unavailable and its chip is hidden.
4. The AI context sets `hasCostData: false` and omits every profit field.
5. The system prompt instructs the model to state plainly that profit analysis requires cost data.
6. **Profit is never estimated, inferred from a margin assumption, or imputed.** There is no code path that produces a profit number without a real cost input.

---

## 13. Analytics Formulas

Every formula below is implemented as a pure function in `src/lib/analytics/`, unit-tested, and is the *only* source of that number in the application.

### 13.1 Headline KPIs

```
Total Revenue      = Σ revenue
Total Cost         = Σ cost                       (rows with cost !== null)
Total Profit       = Total Revenue(costed rows) − Total Cost
Profit Margin %    = (Total Profit / Total Revenue(costed rows)) × 100
Total Orders       = hasOrderIds ? distinct(order_id) : count(transactions)
Units Sold         = Σ quantity
Average Order Value= Total Revenue / Total Orders
```

`Total Profit` deliberately uses revenue from costed rows only, so margin is internally consistent. When cost coverage is partial, both figures carry the "Based on N of M transactions" footnote.

### 13.2 Growth Rate

Split the filtered range into two equal halves by time. Then:

```
Growth Rate % = ((Revenue_secondHalf − Revenue_firstHalf) / Revenue_firstHalf) × 100
```

If `Revenue_firstHalf === 0`, growth is reported as "N/A — no revenue in the earlier period", never as infinity or 100%. Requires ≥14 days of data; otherwise the KPI shows "Not enough data" with a tooltip.

### 13.3 Period-over-period deltas (KPI cards)

Compare the selected window to the immediately preceding window of equal length. For "Last 30 days", the comparison is days 31–60 back. If the dataset does not extend far enough back, the delta is suppressed rather than computed against a partial period.

### 13.4 Time series

Granularity is automatic unless the user overrides it on `/analytics`:

- range ≤ 31 days → daily
- 32–120 days → weekly (ISO weeks, Monday start)
- \> 120 days → monthly

Each bucket carries: revenue, cost, profit, orders, units, AOV. **Empty buckets are emitted with zeros** so charts show real gaps rather than misleadingly connecting across dead periods.

### 13.5 Trend detection (per product and per category)

Ordinary least-squares linear regression of bucketed revenue against bucket index:

```
slope = Σ((xᵢ − x̄)(yᵢ − ȳ)) / Σ((xᵢ − x̄)²)
trend_pct = (slope × bucketCount) / mean(y) × 100
```

`trend_pct` is the modeled change across the whole window as a percentage of average revenue. Classification:

| trend_pct | Label |
|---|---|
| ≥ +15% | Growing 📈 |
| ≤ −15% | Declining ⚠️ |
| between | Stable |

Requires ≥4 non-empty buckets; otherwise the trend is "Insufficient data" and the product is excluded from Growing/Declining classification. Regression is used rather than first-vs-last comparison because a single anomalous week would otherwise dominate the result.

### 13.6 Product classifications (transparent rules, shown in the UI)

A product may hold multiple badges simultaneously — that overlap is often the insight.

| Badge | Rule |
|---|---|
| 🔥 Best Seller | Units sold in the top 10% of all products (minimum 1 product) |
| 💰 Most Profitable | Total profit in the top 10% of all products. Requires `hasCostData` |
| 📈 Growing | `trend_pct ≥ +15%` with ≥4 buckets |
| ⚠️ Declining | `trend_pct ≤ −15%` with ≥4 buckets |
| 📦 Low Volume | Units sold in the bottom 25% of all products |
| 🔎 Needs Attention | Revenue in the top 25% **and** profit margin below (business average − 5 percentage points). Requires `hasCostData` |

"Needs Attention" is the highest-value classification in the product: it identifies items that look successful on a revenue report but are quietly eroding margin. It maps directly to the Blue Shirt example in §16.

### 13.7 Category metrics

```
Category Revenue        = Σ revenue where category = C
Category Profit         = Σ profit where category = C
Category Margin %       = (Category Profit / Category Revenue) × 100
Category Contribution % = (Category Revenue / Total Revenue) × 100
Category Growth %       = trend_pct computed over that category's revenue series
```

### 13.8 Day-of-week analysis

Group by weekday, compute mean revenue per occurring day (not total, which would bias toward weekdays that appear more often in the range).

```
Weekend Uplift % = ((avgRevenue(Sat,Sun) − avgRevenue(Mon–Fri)) / avgRevenue(Mon–Fri)) × 100
```

Reported only when the range covers ≥3 weekends.

### 13.9 Anomaly detection (feeds AI insight cards)

A bucket is anomalous when its revenue lies more than 2 standard deviations from the series mean, given ≥8 buckets. Also detected: any product whose revenue fell in ≥3 consecutive buckets, and any category with `trend_pct ≤ −20%`.

---

## 14. Demo Dataset Specification

**Business:** Urban Threads PK — a fictional clothing retailer in Lahore.
**File:** `public/demo-data/urban-threads-pk.csv`, also compiled into the bundle as a TS module for instant load with no network request.
**Label:** every screen displays the badge "Demo data — fictional" while the demo dataset is active. The CSV's first data column header row is accompanied by a `README.txt` in the same folder stating the data is synthetic.

### 14.1 Shape

- **Rows:** 520 transactions
- **Range:** 2025-08-01 → 2026-01-31 (6 months, ending just before the current date)
- **Products:** 20
- **Categories:** 6 — Shirts, Trousers, Kurtas, Outerwear, Accessories, Footwear
- **Columns:** `order_date, order_id, product_name, category, quantity, unit_price, revenue, cost, customer_city`
- Column names deliberately do *not* exactly match internal field names, so the demo also exercises the fuzzy mapper.
- Currency: PKR, realistic price points (Rs. 850 accessories → Rs. 8,500 outerwear)

### 14.2 Planted patterns (the AI must have something true to find)

| Pattern | Implementation |
|---|---|
| High revenue, low margin | **Classic Blue Shirt** — highest total revenue, cost set to give ~18% margin vs. ~27% business average → triggers 🔎 Needs Attention |
| Low volume, high margin | **Silk Dupatta** — ~40 units, ~52% margin → triggers 💰 Most Profitable without 🔥 Best Seller |
| Declining category | **Accessories** — steady month-over-month decline from Aug to Jan (~−35% trend) |
| Growing category | **Outerwear** — sharp rise Nov–Jan (seasonal, winter) (~+90% trend) |
| Declining product | **Printed T-Shirt** — falls consistently across all six months |
| Growing product | **Wool Blend Coat** — near-zero until November, then strong |
| Weekend spike | Sat/Sun revenue multiplier 1.25–1.35× applied to daily transaction counts |
| Seasonal | December uplift ~1.4× (winter + wedding season); September dip |
| Loss-making item | **Clearance Chappal** — cost exceeds revenue on several rows |
| Realistic noise | ±15% random variation on quantities and per-day transaction counts |

### 14.3 Generator

A one-off Node script `scripts/generate-demo-data.ts` produces the CSV from a seeded PRNG so output is deterministic and reproducible. The generated CSV is committed to the repo; the script is committed for transparency but is not part of the app build.

---

## 15. AI Architecture

### 15.1 The core commitment

The LLM performs **zero calculation**. It receives a compact, pre-computed JSON summary and produces prose. This design:

- makes fabricated numbers structurally unlikely (there are no raw rows to hallucinate from),
- keeps token cost and latency low and predictable,
- keeps the user's transaction-level data off third-party servers entirely,
- means the numbers in the AI's answer and the numbers on the dashboard are the same objects.

### 15.2 Request flow

```
Browser                         Vercel Serverless Function        Anthropic API
   │                                     │                              │
   ├─ build AIContext (client) ─────────▶│                              │
   │  POST /api/analyst                  │                              │
   │  { context, messages }              ├─ validate size & shape       │
   │                                     ├─ inject system prompt        │
   │                                     ├─ rate-limit by IP ──────────▶│
   │                                     │                              │
   │◀──────── streamed tokens ───────────┤◀──────── stream ─────────────┤
```

The API key exists only in the Vercel environment. There is no code path in which the browser holds it.

### 15.3 Endpoints

| Route | Method | Body | Returns |
|---|---|---|---|
| `/api/analyst` | POST | `{ context: AIContext, messages: ChatMessage[] }` | streamed text |
| `/api/report` | POST | `{ context: AIContext }` | streamed Markdown |
| `/api/insights` | POST | `{ context: AIContext }` | JSON array of 3–5 insight objects |

Server-side guards on every route: context payload ≤ 32 KB (reject otherwise), message history capped at the last 10 turns, `max_tokens` capped (1200 chat / 3000 report / 800 insights), 20 requests per IP per hour via an in-memory LRU. Non-2xx responses return a plain-language error string, never a provider error body.

### 15.4 Model

**Anthropic Claude Sonnet** via `@anthropic-ai/sdk`, model string `claude-sonnet-4-6`. Chosen over alternatives for strong instruction-following on the "never invent numbers" constraint, reliable structured output for the insights endpoint, and native streaming. Model ID lives in one constant, `src/lib/ai/config.ts`, so it can be swapped in one edit.

---

## 16. AI Context Schema

Built by `buildAIContext(dataset, filters)` in `src/lib/ai/context.ts`. Target size < 4 KB. All monetary values are numbers in PKR (no formatting), all percentages are numbers.

```ts
interface AIContext {
  business: {
    datasetName: string;
    isDemo: boolean;
    currency: "PKR";
    dateRange: { start: string; end: string; days: number };
    appliedFilters: { categories: string[] | "all"; datePreset: string };
  };

  dataQuality: {
    hasCostData: boolean;
    costCoveragePct: number;
    hasOrderIds: boolean;
    hasCategories: boolean;
    totalTransactions: number;
    skippedRows: number;
    distinctDays: number;
    trendReliability: "good" | "limited" | "insufficient";
  };

  totals: {
    revenue: number;
    cost: number | null;
    profit: number | null;
    profitMarginPct: number | null;
    orders: number;
    unitsSold: number;
    averageOrderValue: number;
    growthRatePct: number | null;
  };

  timeSeries: {
    granularity: "daily" | "weekly" | "monthly";
    points: Array<{ period: string; revenue: number; profit: number | null; orders: number }>;
    // capped at 24 points; longer ranges are re-bucketed to monthly before sending
  };

  topProducts: ProductSummary[];      // top 8 by revenue
  bottomProducts: ProductSummary[];   // bottom 5 by revenue
  mostProfitable: ProductSummary[];   // top 5 by profit, omitted if no cost data
  needsAttention: ProductSummary[];   // high revenue + below-average margin
  decliningProducts: ProductSummary[];// up to 5
  growingProducts: ProductSummary[];  // up to 5

  categories: Array<{
    name: string;
    revenue: number;
    profit: number | null;
    marginPct: number | null;
    unitsSold: number;
    contributionPct: number;
    trendPct: number | null;
  }>;

  patterns: {
    weekendUpliftPct: number | null;
    bestDayOfWeek: string | null;
    worstDayOfWeek: string | null;
    bestPeriod: { period: string; revenue: number } | null;
    worstPeriod: { period: string; revenue: number } | null;
  };

  anomalies: Array<{
    type: "revenue_spike" | "revenue_drop" | "consecutive_decline" | "margin_outlier";
    description: string;   // factual, pre-computed, e.g. "Accessories revenue fell in 4 consecutive months"
    metric: string;        // e.g. "trend_pct: -35.2"
  }>;
}

interface ProductSummary {
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  profit: number | null;
  marginPct: number | null;
  trendPct: number | null;
  badges: string[];
}
```

**Privacy filter:** `customer`, `customer_name`, city, and any free-text field not in the schema above are **never** included in the context. Product names are business data and are sent; personal identifiers are not. This is enforced by construction — the builder assembles a fresh object from named fields rather than spreading the transaction record.

---

## 17. AI System Prompt

Stored in `src/lib/ai/prompts.ts` as `ANALYST_SYSTEM_PROMPT`. Reproduced verbatim in the README.

```
You are LocalBiz AI, an AI-powered business analyst designed to help small
business owners understand their sales and financial data.

Your role is to analyze the structured business metrics provided to you and
convert them into clear, practical, actionable recommendations.

You have access to a JSON context object containing computed metrics for:
revenue, costs, profit, profit margins, orders, product performance, category
performance, sales trends, and time-based trends. These figures have already
been calculated from the user's own records. You do not have the raw
transactions and you do not need them.

RULES

1.  Base every insight strictly on the provided context object.
2.  Never invent numbers, transactions, products, categories, or statistics.
    If a figure is not in the context, you do not have it.
3.  Never perform arithmetic that produces a new headline metric. You may
    compare and rank figures that are present; you may not derive new totals.
4.  Clearly distinguish facts, observations, assumptions, and recommendations.
5.  Explain everything in simple language suitable for a non-technical
    business owner. Avoid analytics jargon; if you must use a term like
    "profit margin", define it in the same sentence the first time.
6.  Prioritise actions the owner could take this week over abstract analysis.
7.  When you identify a problem, state the evidence for it.
8.  When you recommend an action, explain the mechanism by which it may help.
9.  Never guarantee or forecast future revenue or profit.
10. If the context is insufficient to answer, say so plainly and state exactly
    what additional data would be needed.
11. Express all money in Pakistani Rupees, formatted as "Rs. 45,200".
12. Never claim that a correlation proves causation. Say "may be linked to",
    not "was caused by", unless the context contains direct evidence.
13. Never offer financial guarantees, investment advice, or certainty.
14. Be concise. Aim for under 250 words unless the user asks for more.
15. If dataQuality.hasCostData is false, state clearly that profit and margin
    analysis is unavailable because the uploaded file contains no cost column,
    and confine your analysis to revenue, units, orders and trends. Never
    estimate, assume, or infer cost, profit, or margin.
16. If dataQuality.trendReliability is "limited" or "insufficient", caveat any
    growth or decline statement accordingly.
17. If the user asks something outside business analysis of this dataset,
    politely redirect to what you can help with.

RESPONSE STRUCTURE

For analytical questions, structure your answer as:

**What happened**
The relevant pattern in the data.

**Why it matters**
The business significance, in plain terms.

**Recommended action**
Specific, practical next steps.

**Evidence**
The exact metrics from the context that support the above.

For simple factual questions ("what was my total revenue?"), answer directly
in one or two sentences without the full structure.
```

### 16.1 Suggested questions (chat empty state)

- Why did my sales change over this period?
- Which products should I focus on?
- What are my most profitable products?
- Which category is performing best?
- What should I improve next month?
- Give me five actionable recommendations.
- Why is revenue increasing but profit decreasing?
- Which products may need a pricing review?

The last two are hidden when `hasCostData` is false.

---

## 18. AI Business Report Specification

**Endpoint:** `POST /api/report` · **Prompt:** `REPORT_SYSTEM_PROMPT` = the analyst prompt above plus the report instruction block below · **Output:** Markdown, streamed.

```
Produce a business performance report from the provided context. Use exactly
these eight sections as level-2 Markdown headings, in this order:

## Executive Summary
Three to five sentences on overall performance in the period.

## Sales Performance
Revenue, orders, units and how they moved. Reference the time series.

## Profitability
Profit and margin analysis. If hasCostData is false, this section must contain
only a short statement that profit analysis is unavailable without cost data
and what the owner would need to add. Do not estimate.

## Product Performance
Best and worst performers, with figures.

## Category Performance
Strongest and weakest categories, with contribution percentages.

## Key Opportunities
Two to four concrete growth areas visible in the data.

## Key Risks
Two to four concerns visible in the data.

## Recommended Actions
Three to seven prioritised recommendations. Format each as:

**N. [Action]**
- *Reason:* why this matters
- *Supporting metric:* the exact figure from the context

Label every statement so the reader can tell observation from suggestion.
Observations state what the data shows. Recommendations use "consider",
"review", "test". Never present a recommendation as a certain outcome.
```

**Worked example of the required recommendation format:**

> **1. Review the pricing or supplier cost of Classic Blue Shirt**
> - *Reason:* It is your highest-revenue product, so a small margin improvement has a large absolute effect. Its margin is well below what the rest of the business achieves, which suggests either the purchase cost is high or the selling price is low relative to your other items.
> - *Supporting metric:* Revenue Rs. 412,000 (highest of 20 products); profit margin 18.1% vs. business average 27.4%.

**UI behavior:** report generation is scoped to the current global filters, and the scope is printed in the report header ("Period: 1 Aug 2025 – 31 Jan 2026 · All categories"). Downloads as `localbiz-report-YYYY-MM-DD.md`. A print stylesheet renders it cleanly to PDF.

---

## 19. AI Insight Generation

**Endpoint:** `POST /api/insights`. Returns strict JSON — no prose, no code fences.

```ts
interface Insight {
  icon: "trend-up" | "trend-down" | "alert" | "star" | "calendar";
  headline: string;   // one sentence, ≤ 90 chars
  detail: string;     // one sentence of context, ≤ 140 chars
  metric: string;     // the exact supporting figure, e.g. "Revenue +18.2% vs previous period"
  severity: "positive" | "neutral" | "warning";
}
```

Prompt addendum:

```
Return ONLY a JSON array of 3 to 5 insight objects matching the schema.
No preamble, no explanation, no markdown code fences.
Every headline must be directly supported by a number in the context.
Every metric field must quote a value that appears in the context.
Prefer insights that are actionable or surprising over restatements of totals.
Do not produce an insight for which you cannot fill the metric field.
```

**Client-side validation gate (required):** parse the response; discard any insight that fails schema validation, has an empty `metric`, or exceeds the length limits. If fewer than two valid insights survive, fall back to **deterministic insight cards** computed in TypeScript from `patterns` and `anomalies` — e.g. "Revenue increased 18.2% compared with the previous period." The dashboard must never be empty because the model misbehaved, and it must never display an AI claim that failed validation.

Insights are generated once per `(dataset, filter)` combination and cached in memory for the session to avoid a request on every filter touch.

---

## 20. UX/UI Design System

### 20.1 Principles

Clarity over decoration. The screen's job is to let an owner find the number they need in under five seconds. No gradients on cards, no glassmorphism, no animated backgrounds, no purple-to-blue AI aesthetic. Charts get generous whitespace and axis labels with units. Every metric label has a tooltip defining it in one sentence.

Cultural framing: the product is for Pakistani businesses, and it shows this through PKR formatting, `en-PK` number grouping, DD/MM date defaults, and demo data drawn from a real local business context. It does not use flags, crescents, truck art, or ornamental patterns.

### 20.2 Color tokens (Tailwind config)

| Token | Hex | Use |
|---|---|---|
| `primary-600` | `#0F766E` | Primary actions, active nav, key chart series (deep teal) |
| `primary-700` | `#115E59` | Hover |
| `primary-50` | `#F0FDFA` | Tinted backgrounds, selected chips |
| `accent-500` | `#D97706` | Secondary chart series, highlights (amber) |
| `bg-app` | `#F8FAFC` | Page background |
| `bg-card` | `#FFFFFF` | Cards, surfaces |
| `border` | `#E2E8F0` | Card borders, dividers |
| `text-900` | `#0F172A` | Headings, KPI values |
| `text-600` | `#475569` | Body |
| `text-400` | `#94A3B8` | Labels, captions, axes |
| `success` | `#059669` | Positive deltas, growing |
| `warning` | `#D97706` | Caution, needs attention |
| `error` | `#DC2626` | Errors, declining, negative deltas |

Chart categorical palette (in order): `#0F766E · #D97706 · #7C3AED · #0891B2 · #DB2777 · #65A30D · #E11D48 · #475569`.

Deep teal is chosen over the default SaaS indigo specifically so the product does not look like every other dashboard template.

### 20.3 Typography

**Inter** (variable, self-hosted via `@fontsource-variable/inter`) for all UI. Tabular numerals enabled on every numeric display via `font-variant-numeric: tabular-nums` so columns of figures align.

| Role | Size / weight / tracking |
|---|---|
| Display (hero H1) | 48px / 700 / −0.02em (mobile 32px) |
| H1 page title | 30px / 600 / −0.01em |
| H2 section | 20px / 600 |
| H3 card title | 16px / 600 |
| Body | 15px / 400 / 1.6 line-height |
| Small / label | 13px / 500 |
| Caption | 12px / 400 |
| KPI value | 32px / 700 / tabular |

### 20.4 Spacing, radius, elevation

4px base scale: 4, 8, 12, 16, 24, 32, 48, 64, 96. Card padding 24px desktop / 16px mobile. Grid gap 24px.

Radius: `sm` 6px (inputs, chips) · `md` 10px (buttons) · `lg` 14px (cards) · `full` (pills, avatars).

Shadows — subtle only: card `0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06)`; hover `0 4px 12px rgba(15,23,42,.08)`; popover `0 8px 24px rgba(15,23,42,.12)`.

### 20.5 Components

- **Button** — primary (solid teal), secondary (white + border), ghost, danger. Heights 40px default / 44px large / 32px small. Disabled at 45% opacity with `cursor-not-allowed`.
- **Card** — white, 1px border, `lg` radius, no shadow at rest.
- **KPI card** — label (13px, `text-400`, uppercase tracking-wide), value (32px tabular), delta pill (12px, colored bg tint), optional ⓘ tooltip.
- **Table** — sticky header, 44px rows, zebra off, hover tint `primary-50`, right-aligned numeric columns, sortable headers with chevron.
- **Badge** — pill, tinted background, 12px medium. One color per classification.
- **Empty state** — centered icon, headline, one line of explanation, one primary action.
- **Skeleton** — grey `#E2E8F0` blocks with a slow pulse for all loading states. No spinners except in buttons.

### 20.6 Responsive breakpoints

`sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280. Below `lg` the sidebar collapses to a bottom tab bar; KPI grid goes 6→3→2 columns; chart grid goes 2→1; wide tables scroll horizontally inside a bordered container with a fade affordance on the right edge.

### 20.7 Accessibility

All text meets WCAG AA contrast (4.5:1). Every interactive element is keyboard reachable with a visible 2px `primary-600` focus ring. Charts are never color-only: every chart has a legend with text labels, and classification badges pair an emoji/icon with a word. Form errors are announced via `aria-live="polite"`. All icon-only buttons carry `aria-label`.

---

## 21. Technical Architecture

### 21.1 Stack (final decisions)

| Layer | Choice | Why this, for a 4-day MVP |
|---|---|---|
| Framework | **Next.js 14 (App Router) + TypeScript** | One project gives both the React UI and the serverless API routes needed to hide the AI key. Vite would have required a separate backend deployment. |
| Styling | **Tailwind CSS** | Fastest path to a consistent design system without writing CSS files. |
| Charts | **Recharts** | Declarative, React-native API, responsive out of the box, sufficient for the six chart types needed. |
| CSV parsing | **PapaParse** | Streaming, handles malformed rows and encoding issues that hand-rolled parsing does not. |
| Excel parsing | **SheetJS (`xlsx`)** | The only realistic option for XLS + XLSX in the browser. |
| AI | **Anthropic Claude Sonnet** (`@anthropic-ai/sdk`) | Strong adherence to the no-fabrication constraint; reliable JSON mode for insights; native streaming. |
| State | **React Context + `useReducer`** | The app has exactly one piece of global state (the dataset + filters). Redux/Zustand would be ceremony. |
| Persistence | **None (sessionStorage snapshot only)** | See below. |
| Deployment | **Vercel** | Zero-config for Next.js; env vars and serverless functions included. |
| Testing | **Vitest** | Fast, TS-native, minimal config. |

### 21.2 The database decision

**No database. No Supabase. No Postgres.**

The brief offers Supabase as an option; it is rejected for this MVP. The application has no accounts, so there is no user to key rows to; adding auth, schema, RLS policies, and a persistence layer would consume roughly a full day of a four-day budget and would introduce the project's only meaningful security surface. Datasets live in React context for the session and are snapshotted to `sessionStorage` (capped at 5 MB, gracefully skipped when the dataset is larger) so a page refresh does not lose work.

This is not a compromise to apologize for — it is the correct architecture for the product as scoped, and it produces a genuinely stronger privacy claim: the user's transaction data never touches a server at all. The README states this plainly and lists persistence as a future improvement.

### 21.3 Frontend architecture

- **`DatasetProvider`** — holds `Dataset | null`, `filters`, and the dispatchers. Wraps the app.
- **`useAnalytics()`** — the single hook every page uses. Reads dataset + filters from context, applies filters once, runs the analytics functions, memoizes the whole result on `(datasetId, filterHash)`. Pages consume computed values; no page computes its own metric.
- **`RequireDataset`** — layout guard rendering the empty state when no dataset exists.
- Analytics functions in `src/lib/analytics/` are **pure and framework-free**: `(transactions, options) => result`. This is what makes them unit-testable without rendering anything, and it is why the test suite in §26 can be meaningful.

### 21.4 Backend architecture

Three Next.js Route Handlers under `src/app/api/`, all running on the Edge runtime for fast cold starts and streaming. Each: validate body shape with a Zod schema → check payload size → rate-limit by IP → call Anthropic with the appropriate system prompt → stream back. No route ever accepts or forwards raw transaction rows; the Zod schema for `AIContext` structurally prevents it.

### 21.5 Environment variables

| Name | Scope | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Server only | AI provider auth. Never prefixed `NEXT_PUBLIC_`. |
| `AI_MODEL` | Server only | Model identifier, defaults to `claude-sonnet-4-6` |
| `NEXT_PUBLIC_APP_URL` | Public | Canonical URL for metadata |

`.env.example` is committed with placeholder values. `.env.local` is gitignored.

---

## 22. Security

1. **No secrets in the client.** The AI key is read only inside route handlers. There is no `NEXT_PUBLIC_` variable containing a credential. A pre-commit grep for `sk-` is documented in the README.
2. **`.env*` in `.gitignore`** (except `.env.example`). If a key is ever committed, it is rotated, not merely removed — the README says so.
3. **Input validation on every route** via Zod. Reject unknown fields, reject oversized payloads (>32 KB), reject message arrays longer than 10.
4. **File validation** before parsing: extension allowlist, MIME check, 10 MB limit, 100,000 row limit.
5. **Rate limiting:** 20 AI requests per IP per hour, in-memory LRU. Returns a friendly message on exceed. Sufficient for MVP scale; a durable store is a future improvement and is named as such.
6. **XSS:** all AI Markdown is rendered through `react-markdown` with raw HTML disabled. Product names from user files are rendered as text, never `dangerouslySetInnerHTML`.
7. **Headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` via `next.config.js`.
8. **Dependencies:** `npm audit` clean at production build; no unmaintained packages.

---

## 23. Privacy

**Stated policy, shown in the UI on the upload page and in the footer:**

> Your file is read and analyzed entirely inside your browser. It is never uploaded to our servers. When you use the AI features, we send only anonymous aggregate figures — totals, product names, category names, and trend percentages. Customer names and any other personal details in your file are never sent anywhere.

Implementation guarantees behind that claim:

- Parsing and analytics run client-side. No upload endpoint exists.
- `buildAIContext` constructs a new object from an explicit field allowlist. Customer names, cities, order IDs, and any unrecognized column are structurally excluded — not filtered out afterwards, but never included.
- No analytics/telemetry SDK, no session recording, no third-party scripts.
- The AI provider receives the context object and the conversation only.
- The upload page carries an explicit warning against uploading files containing customer personal information.
- Demo data is fictional and labeled as such on every screen where it appears.

---

## 24. Error Handling

No raw stack trace, error code, or provider error body is ever rendered. Every error is caught and mapped to a message that tells the user what happened and what to do next.

| Condition | Message | Recovery offered |
|---|---|---|
| Unsupported file type | "That file type isn't supported. Please upload a CSV or Excel file (.csv, .xlsx, .xls)." | Choose another file |
| File too large | "This file is 14.2 MB, and the maximum is 10 MB. Try exporting a shorter date range." | Choose another file |
| Too many rows | "This file has 142,000 rows and the maximum is 100,000. Try splitting it by month." | Choose another file |
| Parse failure | "We couldn't read this file. It may be corrupted, password-protected, or in an unusual format." | Choose another file · Download sample CSV |
| Missing required column | "We couldn't find a column for **Revenue**. Please choose which of your columns holds the sale amount." | Manual mapping dropdown |
| All rows invalid | "None of the rows in this file could be read. Check that dates and amounts are in a standard format." | View format guide · Try demo |
| Empty dataset after filters | "No transactions in this date range." | Reset filters |
| AI request failed | "The AI analyst is temporarily unavailable. Your dashboard and analytics are unaffected." | Retry |
| AI rate limited | "You've reached the AI request limit for this hour. Please try again later." | — |
| AI returned invalid JSON (insights) | Silent — fall back to deterministic insight cards | Automatic |
| Network offline | "You appear to be offline. Analytics still work; the AI features need a connection." | Retry |
| Unexpected React error | Error boundary: "Something went wrong on this page." | Reload · Return to dashboard |

A single top-level `ErrorBoundary` wraps the app, plus one per route segment so a failing chart does not blank the dashboard. Errors are `console.error`'d in development only.

---

## 25. Performance

| Target | Budget |
|---|---|
| Landing page LCP | < 1.5 s on a 4G connection |
| Demo data → dashboard rendered | < 1 s (bundled, no network) |
| Parse + analyze 10,000 rows | < 3 s |
| Parse + analyze 100,000 rows | < 15 s, with progress indicator |
| Filter change → charts updated | < 200 ms |
| AI first token | < 3 s |
| Initial JS bundle | < 300 KB gzipped |

Techniques: Web Worker for files >5,000 rows; single-pass filtering with all metrics derived from one filtered array; `useMemo` on the entire analytics result keyed by `(datasetId, filterHash)`; dynamic `import()` for SheetJS (the largest dependency — loaded only when an Excel file is actually chosen); AI insight results cached per filter combination; Recharts wrapped in `React.memo`; virtualized product table above 100 rows.

**Hard limits:** 10 MB file size, 100,000 rows. Both are checked before parsing and explained clearly on exceed.

---

## 26. Testing Strategy

Vitest, run via `npm test`. The target is meaningful coverage of the calculation layer, not a coverage percentage.

**Data processing (`src/lib/parsing/*.test.ts`)**
- CSV parses with standard headers; with quoted fields containing commas; with a UTF-8 BOM; with trailing empty rows
- XLSX parses; Excel serial dates convert correctly
- Column mapper: exact aliases, fuzzy aliases, case/underscore variants, ambiguous headers, unmapped required field
- Date parser: all six supported formats; DD/MM vs MM/DD disambiguation; rejection of garbage
- Number parser: `Rs. 1,200`, `(500)`, `1200.50`, `abc` → reject
- Validation: missing required column, all-invalid rows, partial-invalid rows, duplicate detection, `hasCostData` threshold at 79% and 81%

**Analytics (`src/lib/analytics/*.test.ts`)**
- Revenue, profit, margin, orders, units, AOV against a hand-computed 10-row fixture
- Margin with zero revenue → null, not NaN or Infinity
- Growth with zero baseline → null, not Infinity
- Profit with partial cost coverage excludes null-cost rows rather than treating them as zero
- Time-series bucketing at daily/weekly/monthly boundaries; empty buckets present with zeros
- Trend regression: rising series → positive, falling → negative, flat → ~0, fewer than 4 buckets → null
- Product classification boundaries: exactly at the 10% and 25% cutoffs; ties
- Category contribution percentages sum to 100 (±0.01)

**AI (`src/lib/ai/*.test.ts`)**
- `buildAIContext` output validates against the Zod schema
- Context contains no customer field, for a dataset that includes customers *(privacy regression test — this is the most important test in the suite)*
- Context stays under 4 KB for a 100,000-row dataset
- `hasCostData: false` → all profit fields absent, not null-but-present
- Insight response validator rejects malformed JSON, missing `metric`, over-length headline
- Route handlers reject oversized payloads and >10 messages

**UI (manual QA checklist, day 4)**
- Upload flow end to end with a real messy Excel file
- Every filter combination on every page
- No-cost-data dataset: confirm no profit number appears anywhere in the UI
- Responsive pass at 375 / 768 / 1440 px
- Keyboard-only navigation of the whole app
- AI failure simulated by blocking the API route: dashboard still works

**Deployment**
- Production URL loads in incognito
- Demo mode works on production
- AI works on production (env var correctly set)
- No `ANTHROPIC_API_KEY` string present anywhere in the client bundle — verified by searching the built output

---

## 27. Deployment Strategy

```
Local dev  →  GitHub (public)  →  Vercel (auto-deploy on push to main)  →  Public URL
```

**Steps**

1. `git init`, commit, push to a **public** GitHub repository named `localbiz-ai`.
2. Import the repo at vercel.com. Framework preset auto-detects Next.js.
3. Build command `next build`. Output `.next`. Install `npm install`. Dev `next dev`. Start `next start`. (All defaults — no overrides needed.)
4. Add environment variables in Vercel → Settings → Environment Variables, for Production, Preview and Development:
   - `ANTHROPIC_API_KEY` = the real key
   - `AI_MODEL` = `claude-sonnet-4-6`
   - `NEXT_PUBLIC_APP_URL` = the assigned Vercel URL
5. Deploy. Then **redeploy once** after adding env vars — Vercel does not retroactively apply them to an existing build. This step is missed constantly; do not miss it.
6. Production verification (must all pass before declaring done):
   - Open the URL in a private window
   - Click Try Demo → dashboard renders with real numbers
   - Ask the AI analyst a question → grounded answer returns
   - Generate the AI report → all eight sections render
   - Upload a real CSV → full flow works
   - Open DevTools → Network: confirm no request contains an API key
   - Test on an actual phone

---

## 28. README Specification

`README.md` at repo root, in this exact order:

```markdown
# LocalBiz AI
> Turn your business data into better decisions.
[badges: license, deployment]

## What It Does
## The Problem
## Who It Helps
## Live Demo
[Live Demo](YOUR_DEPLOYED_URL)  — plus: "Click 'Try Demo' to explore with sample data. No signup."
## Features
   (grouped: Data handling · Analytics · Product & category intelligence · AI)
## AI Feature
   What the AI does · How it receives business context (with the AIContext schema)
   · How insights are generated · The full system prompt in a code block
   · The groundedness guarantee (LLM performs no calculation)
## Tech Stack
   Next.js 14 · TypeScript · Tailwind CSS · Recharts · PapaParse · SheetJS
   · Anthropic Claude Sonnet · Vercel · Vitest
   (Only technologies actually used. No Supabase or PostgreSQL — the app has no
    database by design; §"Limitations" explains why.)
## How It Works
   The full 10-stage data flow from §11, as a diagram.
## Data Format
   The schema table from §10.1 plus a sample CSV block.
## Screenshots
   1. Dashboard  2. Product Intelligence  3. AI Business Analyst  4. AI Business Report
   (stored in docs/screenshots/, referenced with relative paths)
## How to Run Locally
   git clone … · cd localbiz-ai · npm install · cp .env.example .env.local
   · add your key · npm run dev · open http://localhost:3000
   Node 18+ required.
## Environment Variables
   ANTHROPIC_API_KEY=your_key_here
   AI_MODEL=claude-sonnet-4-6
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   (placeholders only — never a real key)
## Deployment
   The §27 steps, condensed.
## Project Structure
   The tree from §29.
## Future Improvements
   Urdu language support · demand forecasting · inventory prediction · automated
   alerts · WhatsApp report delivery · user accounts and saved datasets ·
   multi-business support · POS integrations · durable rate limiting
## Limitations
   Honest list — see below.
## License
   MIT, with a LICENSE file.
```

**The Limitations section must actually be honest.** It states: no user accounts or saved data (session only); no database; profit analysis requires a cost column and is never estimated; trend detection needs at least four time buckets and roughly two weeks of data; 10 MB / 100,000 row ceilings; English only; single currency (PKR); AI responses depend on a third-party API and can fail; in-memory rate limiting resets on cold start; not accounting software and not a substitute for professional financial advice.

---

## 29. Project Structure

```
localbiz-ai/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 root layout, fonts, providers
│   │   ├── page.tsx                   landing page
│   │   ├── globals.css
│   │   ├── (app)/                     route group sharing AppLayout
│   │   │   ├── layout.tsx             sidebar + header + RequireDataset
│   │   │   ├── upload/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   ├── products/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   ├── analyst/page.tsx
│   │   │   └── report/page.tsx
│   │   └── api/
│   │       ├── analyst/route.ts
│   │       ├── report/route.ts
│   │       └── insights/route.ts
│   ├── components/
│   │   ├── ui/                        Button, Card, Badge, Table, Tooltip,
│   │   │                              Select, Skeleton, EmptyState, Modal
│   │   ├── charts/                    RevenueChart, ProfitChart, CategoryBar,
│   │   │                              TopProductsChart, TrendSparkline, ChartCard
│   │   ├── layout/                    Sidebar, Header, MobileNav, FilterBar
│   │   └── landing/                   Hero, HowItWorks, FeatureGrid, AIExplainer
│   ├── features/
│   │   ├── upload/                    DropZone, ColumnMapper, ValidationReport
│   │   ├── dashboard/                 KpiCard, KpiGrid, InsightCards
│   │   ├── analytics/                 GranularityToggle, TrendPanel, DayOfWeekChart
│   │   ├── products/                  ProductTable, ClassificationChips, ProductDrawer
│   │   ├── categories/                CategoryCards, ContributionDonut
│   │   └── ai/                        ChatPanel, MessageBubble, SuggestedQuestions,
│   │                                  ContextInspector, ReportView
│   ├── lib/
│   │   ├── parsing/                   csv.ts, excel.ts, columnMapper.ts,
│   │   │                              dateParser.ts, numberParser.ts, normalize.ts
│   │   ├── validation/                fileValidation.ts, rowValidation.ts,
│   │   │                              datasetValidation.ts, messages.ts
│   │   ├── analytics/                 kpis.ts, timeSeries.ts, products.ts,
│   │   │                              categories.ts, trends.ts, patterns.ts,
│   │   │                              anomalies.ts, filters.ts
│   │   ├── ai/                        client.ts, context.ts, prompts.ts,
│   │   │                              schemas.ts, insightValidator.ts, config.ts
│   │   ├── demo/                      urbanThreadsData.ts (bundled), loadDemo.ts
│   │   └── utils/                     format.ts (PKR, dates, %), cn.ts, rateLimit.ts
│   ├── context/                       DatasetContext.tsx, FilterContext.tsx
│   ├── hooks/                         useAnalytics.ts, useDataset.ts, useFilters.ts,
│   │                                  useAIChat.ts, useInsights.ts
│   └── types/                         transaction.ts, dataset.ts, analytics.ts,
│                                      aiContext.ts, validation.ts
├── public/
│   ├── demo-data/
│   │   ├── urban-threads-pk.csv
│   │   ├── sample-template.csv
│   │   └── README.txt                 states the data is fictional
│   └── og-image.png
├── scripts/
│   └── generate-demo-data.ts
├── docs/
│   ├── SPEC.md                        this document
│   └── screenshots/                   dashboard.png, products.png,
│                                      analyst.png, report.png
├── .env.example
├── .gitignore
├── LICENSE
├── README.md
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## 30. MVP Acceptance Criteria

The project is complete only when every line below is true.

| # | Criterion | Verified by |
|---|---|---|
| 1 | Public URL opens | Incognito browser |
| 2 | Demo dataset launches without upload | One click from landing |
| 3 | Dashboard shows real calculated metrics | Cross-check against the CSV in Excel |
| 4 | CSV upload works | Real file |
| 5 | Excel upload works | Real .xlsx file |
| 6 | Invalid files produce understandable errors | Upload a .txt, a 12 MB file, a file with no revenue column |
| 7 | Analytics computed from actual uploaded data | Compare a KPI to a manual SUM |
| 8 | Product performance displayed | `/products` populated with badges |
| 9 | Category performance displayed | `/categories` populated |
| 10 | AI Business Analyst works | Ask three questions, get grounded answers |
| 11 | AI responses grounded in real metrics | Every figure in the answer appears in the dashboard |
| 12 | AI Business Report works | All eight sections generated |
| 13 | No API keys exposed | Search the production bundle for `sk-` and for the key |
| 14 | Application is responsive | 375px, 768px, 1440px |
| 15 | GitHub repository is public | Open in a logged-out browser |
| 16 | README complete | Every §28 section present |
| 17 | At least 3 screenshots included | 4 are specified |
| 18 | Live URL works in private browsing | Incognito, fresh session |
| 19 | No-cost dataset shows zero profit figures | Upload a CSV without a cost column, audit every page |
| 20 | Unit tests pass | `npm test` green |

---

## 31. Assignment Requirement Mapping

| Requirement | How LocalBiz AI satisfies it |
|---|---|
| **1. Original idea** | Addresses a specific, verifiable gap: small Pakistani businesses hold sales data in spreadsheets but have no analyst, no BI budget, and no time. The product is not a generic chatbot wrapper — the analytical layer is real, deterministic, and does the work; the AI interprets it. The groundedness architecture (LLM never calculates) is a substantive design position, not a feature list. |
| **2. Complete functional app** | End-to-end workflow: landing → demo *or* upload → parse → map columns → validate → dashboard → analytics → product intelligence → category intelligence → AI analyst → AI report → download. Every step is implemented, with empty, loading, and error states throughout. |
| **3. AI-powered feature** | Two: the **AI Business Analyst** (conversational, context-grounded, structured four-part answers) and the **AI Business Report** (eight-section generated report with metric-backed recommendations). Plus AI insight cards on the dashboard with a deterministic fallback. |
| **4. Freedom of tools** | Next.js 14, TypeScript, Tailwind CSS, Recharts, PapaParse, SheetJS, Anthropic Claude Sonnet, Vercel, Vitest. Each choice justified in §21.1. |
| **5. Public GitHub repository** | Public repo, MIT licensed, complete README, `.env.example` with placeholders, no secrets in history, meaningful commit messages, demo data and generator script included. |
| **6. Live public URL** | Vercel deployment verified in incognito, with the AI features working in production. |

**README requirement checklist**

| Required | Section |
|---|---|
| a. App name and problem | `# LocalBiz AI`, `## What It Does`, `## The Problem` |
| b. Live URL | `## Live Demo` |
| c. Features | `## Features` |
| d. AI feature and system prompt | `## AI Feature` — includes the verbatim system prompt |
| e. Tools and models | `## Tech Stack` — names Claude Sonnet explicitly |
| f. Screenshots | `## Screenshots` — 4 images |
| g. Run instructions | `## How to Run Locally` + `## Environment Variables` |

---

## 32. P0 / P1 / P2 Prioritization

### P0 — Must have (submission fails without these)

Landing page · Demo mode · CSV upload · Excel upload · Column auto-mapping with manual override · Validation engine with plain-language errors · Dashboard with 6 KPIs and core charts · Date and category filters · Sales Analytics page · Product Intelligence with classifications · Category Intelligence · AI Business Analyst · AI context builder · AI Business Report · Responsive layout · Error handling · Deployment · README with screenshots · No exposed secrets.

### P1 — Important (materially raises quality)

AI insight cards with deterministic fallback · Custom date range picker · Report download as Markdown + print stylesheet · Product detail drawer · Day-of-week analysis · Sparkline trends in the product table · Sample CSV template download · Context inspector panel in the chat · Web Worker for large files · Unit test suite.

### P2 — Optional (only with genuine time remaining)

Urdu language support · demand forecasting · inventory prediction · authentication · multi-business support · saved datasets · dark mode · CSV export of computed analytics · additional chart types · animated transitions.

**The rule:** no P1 work begins until every P0 item is complete and deployed. No P2 work begins at all unless P0 and P1 are both finished before the end of day 4. If a feature threatens P0 completion, it is not built — this rule overrides personal judgment in the moment.

---

## 33. Four-Day Development Roadmap

### Day 1 — Foundation and data ingestion
Scaffold Next.js + TypeScript + Tailwind; implement the design tokens from §20 before building any component. Build the `ui/` primitives. Build the landing page. Write `scripts/generate-demo-data.ts` and generate the Urban Threads dataset with all planted patterns. Implement parsing (CSV, Excel, date, number), column mapping, normalization, and the validation engine with its message catalogue. Build the upload page's three stages. Set up `DatasetContext` and demo loading.
**End-of-day gate:** the demo dataset loads and a real CSV uploads, maps, validates, and lands in context.

### Day 2 — Analytics and pages
Implement every function in `src/lib/analytics/` and write their unit tests as you go — this layer is the product's foundation and is the one place where testing first genuinely saves time. Build `useAnalytics`. Build the filter bar and wire global filters. Build the Dashboard (KPIs, all charts, product table), Sales Analytics, Product Intelligence with classifications, and Category Intelligence.
**End-of-day gate:** every page renders correct numbers from both the demo dataset and an uploaded file, and all filters work.

### Day 3 — AI layer
Build `buildAIContext` and its Zod schema, including the privacy regression test. Write the prompt files. Build the three API routes with validation, size limits, rate limiting, and streaming. Build the chat UI with suggested questions and the context inspector. Build the report page with Markdown rendering and download. Build insight cards with the validation gate and deterministic fallback.
**End-of-day gate:** all three AI features work locally against real context, and behave correctly on a dataset with no cost column.

### Day 4 — Polish, test, ship
Morning: UI polish pass (spacing, empty states, loading skeletons, mobile), full error-handling pass, accessibility pass. Midday: deploy to Vercel, set env vars, **redeploy**, verify in incognito. Afternoon: run the manual QA checklist across all breakpoints; test the no-cost-data dataset end to end; capture the four screenshots; write the README. Evening: final QA against the §30 acceptance table and the §34 launch checklist.
**End-of-day gate:** every acceptance criterion checked and green.

**Buffer policy:** the last three hours of day 4 are reserved for fixes, not features. If something is unfinished at that point, it is cut, and the README's Limitations section is updated to say so honestly. A working, well-documented smaller app scores higher than a broken larger one — and is a better product.

---

## 34. Final Launch Checklist

**Code**
- [ ] `npm run build` succeeds with no errors and no TypeScript errors
- [ ] `npm test` passes
- [ ] No `console.log` in production paths
- [ ] No `TODO` or placeholder text visible in the UI
- [ ] No unused dependencies in `package.json`

**Security**
- [ ] `.env.local` gitignored and absent from git history
- [ ] `.env.example` committed with placeholders only
- [ ] Built client bundle searched for the API key — not present
- [ ] Every API route validates input and enforces size limits
- [ ] Security headers configured

**Functionality**
- [ ] Demo mode loads in one click
- [ ] CSV upload works with a real messy file
- [ ] XLSX upload works
- [ ] Column mapping auto-detects and can be manually corrected
- [ ] All validation error messages tested by triggering them
- [ ] All KPIs match a manual calculation
- [ ] All filters work on all pages
- [ ] Product classifications correct and rules visible to the user
- [ ] AI analyst returns grounded answers
- [ ] AI report generates all eight sections
- [ ] Insight cards render, with fallback verified by forcing a bad response
- [ ] No-cost-data dataset shows no profit figure anywhere

**UX**
- [ ] Responsive at 375 / 768 / 1440
- [ ] Empty states on every data page
- [ ] Loading skeletons on every async surface
- [ ] Keyboard navigable end to end
- [ ] Contrast passes AA
- [ ] Demo data labeled fictional everywhere it appears

**Deployment**
- [ ] Pushed to a public GitHub repo
- [ ] Deployed to Vercel
- [ ] Env vars set and a redeploy triggered afterwards
- [ ] Production URL works in incognito
- [ ] AI works in production
- [ ] Tested on a real phone

**Documentation**
- [ ] README complete against §28
- [ ] Live URL in the README
- [ ] System prompt included verbatim
- [ ] 4 screenshots committed and rendering
- [ ] Limitations section honest
- [ ] LICENSE file present

---

## BUILD THIS FIRST

Implement in this order. Do not start an item until the previous one works.

1. **Project scaffold + design tokens.** Next.js 14 + TS + Tailwind, with the §20 color, type, and spacing tokens in `tailwind.config.ts` and the `ui/` primitives built. Everything downstream depends on these existing.
2. **Type definitions.** `Transaction`, `Dataset`, `AIContext`. Get these right now; changing them later cascades everywhere.
3. **Demo dataset.** Generate `urban-threads-pk.csv` with every planted pattern from §14.2. This becomes the fixture for all subsequent development and testing — build it before anything that consumes data.
4. **Parsing + column mapping + validation.** CSV and Excel in, `Dataset` out, with real error messages.
5. **Dataset context + demo loading.** One click from landing to a populated context.
6. **Analytics engine.** Every function in `src/lib/analytics/`, pure and unit-tested against the demo data.
7. **Dashboard.** KPIs, charts, filters. The first screen that proves the product works.
8. **Product Intelligence + Category Intelligence.**
9. **Upload page UI.** All three stages.
10. **AI context builder + Zod schema + privacy test.**
11. **`/api/analyst` + chat UI.** The headline AI feature.
12. **`/api/report` + report page.**
13. **Sales Analytics page.**
14. **Deploy to Vercel and verify in incognito.** Do this the moment items 1–13 work — not on the last day. A deployment problem found on day 4 evening is a crisis; found on day 3, it is a task.
15. **README + screenshots.**

Only after all fifteen: AI insight cards, report download, product drawer, Web Worker, and the rest of P1.

---

*End of specification. Build exactly this.*
