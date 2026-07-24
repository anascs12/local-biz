# LocalBiz AI

> Turn your business data into better decisions.

[![License: MIT](https://img.shields.io/badge/License-MIT-0F766E.svg)](LICENSE)
[![Deployment](https://img.shields.io/badge/deploy-Vercel-black.svg)](https://vercel.com)

## What It Does

LocalBiz AI is a browser-based analytics product for small Pakistani businesses. A shop owner
uploads the sales file they already keep — a CSV export or an Excel sheet — and within seconds
gets a working business intelligence dashboard, product-level performance intelligence, and an
AI analyst that answers plain-language questions using only their real numbers.

Every number on screen is computed deterministically in TypeScript from the user's own rows. The
AI never sees raw transactions and never calculates anything.

## The Problem

Small businesses in Pakistan generate the data required for good decisions and then fail to use
it. The data exists — in Excel, in a POS export, in a hand-maintained ledger — but the layer that
turns rows into decisions is missing. Hiring an analyst is not economic at this revenue scale, and
Power BI or Tableau are priced and designed for enterprises.

The owner cannot answer questions that materially change profit:

- Which products actually generate revenue, as opposed to feeling busy?
- Which products generate *profit*, which is a different list?
- Which products are quietly declining while total revenue masks the decline?
- Why is revenue up but the bank balance flat?
- Where should the next Rs. 200,000 of purchasing budget go?

These are arithmetic over data the owner already owns. The gap is tooling and interpretation, not
information.

## Who It Helps

Small and medium businesses in Pakistan with roughly 50–5,000 transactions per month and at least
a partial digital sales record: local retail shops, clothing stores, grocery stores, electronics
shops, cosmetics sellers, small wholesalers, online sellers (Daraz/Instagram/Shopify), and home
businesses.

Interface language is English. Currency is PKR, formatted `Rs. 1,234,567` using `en-PK` grouping.

## Live Demo

**[Live Demo](YOUR_DEPLOYED_URL)** — *not yet deployed; replace this placeholder with the Vercel
URL after the first deploy.*

Click **"Try the demo"** to explore with sample data. No signup, no upload, no email gate.

## Features

**Data handling**

- CSV, XLSX and XLS upload, parsed entirely in your browser
- Fuzzy column auto-mapping with a manual override for every field
- Date-format detection, including DD/MM vs MM/DD disambiguation you can correct
- Number parsing that survives `Rs. 1,200`, `(500)` and thousands separators
- Row-level validation with plain-language errors and example row numbers
- Duplicate detection (flagged, not silently removed)

**Analytics**

- Six headline KPIs with period-over-period deltas
- Revenue, profit, orders, units and average-order-value trends
- Automatic time bucketing (daily / weekly / monthly) with a manual override
- Day-of-week breakdown that surfaces weekend patterns
- Global date and category filters applied once, feeding every metric

**Product & category intelligence**

- Per-product units, revenue, cost, profit, margin and trend
- Six transparent classifications — 🔥 Best Seller, 💰 Most Profitable, 📈 Growing,
  ⚠️ Declining, 📦 Low Volume, 🔎 Needs Attention — with the rules shown in the UI
- Category contribution, margin and growth, with a revenue-share breakdown

**AI**

- AI Business Analyst: conversational, grounded in your computed metrics
- AI Business Report: an eight-section written report with metric-backed recommendations
- A context inspector showing exactly what was sent to the model

## AI Feature

### What the AI does

Two features share one architecture:

1. **AI Business Analyst** (`/analyst`) — ask questions in plain language. Analytical answers use
   a four-part structure: *What happened · Why it matters · Recommended action · Evidence*.
2. **AI Business Report** (`/report`) — an eight-section written report scoped to your current
   filters, with recommendations that each cite a supporting metric.

### The groundedness guarantee

**The LLM performs zero calculation.** It receives a compact, pre-computed JSON summary and
produces prose. This makes fabricated numbers structurally unlikely — there are no raw rows to
hallucinate from — keeps token cost and latency low, keeps transaction-level data off third-party
servers, and means the numbers in the AI's answer and the numbers on the dashboard are the same
objects.

There is no code path that produces a profit figure without real cost data. When your file has no
cost column, profit and margin are hidden from the UI *and* omitted from the AI's context
entirely, and the model is instructed to say so plainly rather than estimate.

### How it receives business context

The browser builds an `AIContext` object and posts it to a server route. Raw transactions never
leave the page.

```ts
interface AIContext {
  business:    { datasetName; isDemo; currency: "PKR"; dateRange; appliedFilters };
  dataQuality: { hasCostData; costCoveragePct; hasOrderIds; hasCategories;
                 totalTransactions; skippedRows; distinctDays; trendReliability };
  totals:      { revenue; cost?; profit?; profitMarginPct?; orders; unitsSold;
                 averageOrderValue; growthRatePct };
  timeSeries:  { granularity; points: Array<{ period; revenue; profit; orders }> };

  topProducts:       ProductSummary[];   // top 8 by revenue
  bottomProducts:    ProductSummary[];   // bottom 5 by revenue
  mostProfitable?:   ProductSummary[];   // omitted entirely without cost data
  needsAttention?:   ProductSummary[];   // omitted entirely without cost data
  decliningProducts: ProductSummary[];
  growingProducts:   ProductSummary[];

  categories: Array<{ name; revenue; profit; marginPct; unitsSold; contributionPct; trendPct }>;
  patterns:   { weekendUpliftPct; bestDayOfWeek; worstDayOfWeek; bestPeriod; worstPeriod };
  anomalies:  Array<{ type; description; metric }>;
}
```

**Privacy is enforced by construction, not by filtering.** The builder assembles a fresh object
field by field from an explicit allowlist — it never spreads a transaction record. Customer names,
cities, order IDs and any unrecognized column are therefore structurally incapable of reaching the
model. This is covered by a dedicated regression test that asserts no customer value appears
anywhere in the serialized payload.

### How insights are generated

Server routes (`/api/analyst`, `/api/report`) validate every request with a strict Zod schema that
rejects unknown fields, cap the payload at 32 KB, cap history at the last 10 turns, rate-limit by
IP, then stream the model's response back. Non-2xx responses return a plain-language sentence —
never a provider error body or stack trace.

### The full system prompt

<!-- verbatim: kept in sync with ANALYST_SYSTEM_PROMPT by a test in src/lib/ai/readme.test.ts -->

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

The report prompt is this prompt plus an instruction block specifying the eight report sections
and the metric-backed recommendation format.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| CSV parsing | PapaParse |
| Excel parsing | SheetJS (`xlsx`) |
| AI | **Anthropic Claude Sonnet** (`claude-sonnet-4-6`) via `@anthropic-ai/sdk` |
| Validation | Zod |
| State | React Context + `useReducer` |
| Persistence | None — sessionStorage snapshot only |
| Deployment | Vercel |
| Testing | Vitest |

**No Supabase and no PostgreSQL.** The app has no database by design — see
[Limitations](#limitations) for why that is the right architecture here rather than a shortcut.

## How It Works

All parsing and analysis runs client-side. No user file is ever transmitted to a server.

```
File
 └─▶ 1.  FILE VALIDATION     extension, MIME, size ≤ 10 MB
 └─▶ 2.  PARSE               PapaParse (CSV) | SheetJS (XLSX/XLS) → raw rows + headers
 └─▶ 3.  COLUMN DETECTION    fuzzy header match → ColumnMapping + confidence scores
 └─▶ 4.  USER CONFIRMATION   mapping review UI (blocking)
 └─▶ 5.  ROW NORMALIZATION   coerce types, parse dates, clean strings → Transaction[]
 └─▶ 6.  ROW VALIDATION      reject invalid rows, collect issues
 └─▶ 7.  DATASET ASSEMBLY    flags, date range, issue summary → Dataset
 └─▶ 8.  STORE               React context (in-memory) + sessionStorage snapshot
 └─▶ 9.  ANALYTICS ENGINE    pure functions, memoized on (dataset, filters)
 └─▶ 10. AI CONTEXT BUILDER  analytics → bounded JSON
```

Only stage 10's output ever leaves the browser, and only when you use an AI feature.

## Data Format

Your column names don't have to match exactly — they are detected automatically and every field
can be corrected by hand.

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

```csv
order_date,order_id,product_name,category,quantity,unit_price,revenue,cost,customer_city
2025-08-04,UT-10004,Classic Blue Shirt,Shirts,2,2380,4760,4056,Lahore
2025-08-04,UT-10005,Printed T-Shirt,Shirts,2,1460,2920,2160,Islamabad
```

Without a **Cost** column the app still works — revenue, orders, units and trends are all
available — but every profit and margin figure is hidden rather than estimated.

## Screenshots

> ⚠️ **Not yet captured.** These four screenshots are required and are still outstanding; the
> files below do not exist yet. Capture them from a running instance and commit them to
> `docs/screenshots/`.

1. Dashboard — `docs/screenshots/dashboard.png`
2. Product Intelligence — `docs/screenshots/products.png`
3. AI Business Analyst — `docs/screenshots/analyst.png`
4. AI Business Report — `docs/screenshots/report.png`

## How to Run Locally

Node 18+ required.

```bash
git clone <your-repo-url>
cd localbiz-ai
npm install
cp .env.example .env.local
# add your Anthropic API key to .env.local
npm run dev
```

Open <http://localhost:3000> and click **"Try the demo"**.

The dashboard, analytics, product and category pages work without an API key — only the two AI
features need one.

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm test` | Run the Vitest suite |
| `npm run typecheck` | TypeScript, no emit |
| `npm run generate:demo` | Regenerate the demo dataset (deterministic) |

## Environment Variables

```bash
ANTHROPIC_API_KEY=your_key_here
AI_MODEL=claude-sonnet-4-6
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`ANTHROPIC_API_KEY` is **server-only** and is read exclusively inside route handlers. No
credential is ever prefixed `NEXT_PUBLIC_`. `.env.local` is gitignored; `.env.example` holds
placeholders only. If a key is ever committed, **rotate it** — removing the file from the working
tree does not remove it from git history.

To verify no key reached the client bundle after a build:

```bash
grep -rl "sk-ant" .next/static/   # must return nothing
```

## Deployment

1. Push to a **public** GitHub repository named `localbiz-ai`.
2. Import the repo at [vercel.com](https://vercel.com). The Next.js preset is auto-detected; no
   build-command overrides are needed.
3. Add environment variables for Production, Preview and Development:
   `ANTHROPIC_API_KEY`, `AI_MODEL`, `NEXT_PUBLIC_APP_URL`.
4. **Redeploy once after adding the env vars.** Vercel does not retroactively apply them to an
   existing build. This step is missed constantly.
5. Verify in a private window: demo loads → dashboard shows real numbers → AI analyst answers →
   report generates all eight sections → upload a real CSV → DevTools Network shows no API key.

## Project Structure

```
localbiz-ai/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 root layout, fonts, providers
│   │   ├── page.tsx                   entry page
│   │   ├── globals.css
│   │   ├── (app)/                     route group sharing AppLayout
│   │   │   ├── layout.tsx             sidebar + header
│   │   │   ├── upload/  dashboard/  analytics/
│   │   │   ├── products/  categories/
│   │   │   └── analyst/  report/
│   │   └── api/
│   │       ├── analyst/route.ts
│   │       └── report/route.ts
│   ├── components/
│   │   ├── ui/                        Button, Card, Badge, Table, Tooltip,
│   │   │                              Select, Skeleton, EmptyState
│   │   ├── charts/                    ChartCard, TimeSeriesCharts, BarCharts,
│   │   │                              CategoryCharts, DayOfWeekChart
│   │   └── layout/                    Sidebar, Header, MobileNav, FilterBar,
│   │                                  RequireDataset, nav
│   ├── features/
│   │   ├── upload/                    DropZone, ColumnMapper, ValidationReport,
│   │   │                              SchemaReference
│   │   ├── dashboard/                 KpiCard, KpiGrid, ProductPerformanceTable
│   │   ├── analytics/                 GranularityToggle, TrendSummaryStrip
│   │   ├── products/                  ProductTable, ClassificationChips, ProductBadges
│   │   ├── categories/                CategoryCards, CategoryTable
│   │   └── ai/                        ChatPanel, MessageBubble, ContextInspector, ReportView
│   ├── lib/
│   │   ├── parsing/                   csv, excel, columnMapper, dateParser,
│   │   │                              numberParser, normalize, schema, pipeline
│   │   ├── validation/                fileValidation, rowValidation,
│   │   │                              datasetValidation, messages
│   │   ├── analytics/                 kpis, timeSeries, products, categories,
│   │   │                              trends, patterns, anomalies, filters, badges
│   │   ├── ai/                        client, context, prompts, uiCopy,
│   │   │                              schemas, guards, config
│   │   ├── demo/                      urbanThreadsData (generated), loadDemo
│   │   └── utils/                     format, cn, dates, rateLimit, datasetSnapshot
│   ├── context/                       DatasetContext, FilterContext, datasetReducer
│   ├── hooks/                         useAnalytics, useDataset, useFilters,
│   │                                  useAIChat, useAIReport
│   └── types/                         transaction, dataset, analytics, aiContext, validation
├── public/demo-data/                  urban-threads-pk.csv, README.txt
├── scripts/generate-demo-data.ts
├── docs/SPEC.md
└── ...
```

## Demo Dataset

`public/demo-data/urban-threads-pk.csv` — **Urban Threads PK**, a fictional clothing retailer in
Lahore. 520 transactions, 20 products, 6 categories, Aug 2025 – Jan 2026. Generated
deterministically from a seeded PRNG by `scripts/generate-demo-data.ts`, which prints a proof
table verifying every planted pattern (a high-revenue/low-margin product, a low-volume/high-margin
product, a declining category, a growing category, a weekend spike, a seasonal December uplift, a
loss-making item, and realistic noise).

**The demo data is fictional** and is labelled as such on every screen where it appears.

## Future Improvements

Urdu language support · demand forecasting · inventory prediction · automated alerts · WhatsApp
report delivery · user accounts and saved datasets · multi-business support · POS integrations ·
durable rate limiting

## Limitations

An honest list.

- **No user accounts and no saved data.** Datasets live in memory for the session, with a
  sessionStorage snapshot so a refresh doesn't lose work. Close the tab and the data is gone.
- **No database.** This is deliberate, not a shortcut: with no accounts there is no user to key
  rows to, and adding auth, schema and row-level security would have consumed a large share of the
  build budget while introducing the project's only meaningful security surface. It also produces a
  stronger privacy claim — your transaction data never touches a server at all.
- **Profit analysis requires a cost column and is never estimated.** If fewer than 80% of your
  rows have a valid cost, all profit and margin figures are hidden rather than guessed.
- **Trend detection needs at least four time buckets** and roughly two weeks of data. Below that,
  products are excluded from Growing/Declining rather than being classified on thin evidence.
- **Ceilings: 10 MB file size and 100,000 rows.** Both are checked before parsing.
- **English only. PKR only.**
- **AI responses depend on a third-party API and can fail.** The dashboard and analytics are
  unaffected when they do.
- **Rate limiting is in-memory** (20 requests per IP per hour) and resets on cold start. It is a
  courtesy limit, not a security control; a durable store is a future improvement.
- **Large files parse on the main thread.** A Web Worker for files over 5,000 rows is planned but
  not yet implemented, so very large uploads will briefly block the UI.
- **Not built yet:** AI insight cards on the dashboard, the product detail drawer, sparkline trends
  in the product table, a custom date-range picker, report download as Markdown, a print
  stylesheet, and the sample CSV template download.
- **The Anthropic SDK cannot run on Vercel's Edge runtime** (it imports Node built-ins for
  credential resolution), so the AI routes run on the Node runtime instead. Streaming still works;
  cold starts are marginally slower.
- **Not accounting software** and not a substitute for professional financial advice.

## License

MIT — see [LICENSE](LICENSE).
