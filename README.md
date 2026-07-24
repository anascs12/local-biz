# LocalBiz AI

> Turn your business data into better decisions.

[![License: MIT](https://img.shields.io/badge/License-MIT-0F766E.svg)](LICENSE)

**[Live Demo](https://localbiz-ai-alpha.vercel.app/)** — click "Try the demo" for sample data. No signup.

## What It Does

Small businesses keep their sales in a spreadsheet but have no analyst to read it. LocalBiz AI takes
the CSV or Excel file they already have and turns it into a working dashboard, product and category
intelligence, and an AI analyst that answers questions in plain language.

Every figure is computed in TypeScript from the user's own rows. The AI never sees raw transactions
and never does arithmetic — it explains numbers that were already calculated.

Built for Pakistani small businesses: PKR formatting, `en-PK` grouping, DD/MM dates.

## Features

- **Upload** CSV / XLSX / XLS, parsed entirely in the browser. Fuzzy column matching with manual
  override, DD/MM vs MM/DD detection, row-level validation with plain-language errors.
- **Dashboard** — 6 KPIs with period-over-period deltas, revenue/profit trends, category and product
  charts, global date and category filters.
- **Sales Analytics** — revenue, profit, orders, units and AOV trends with a daily/weekly/monthly
  toggle, plus a day-of-week breakdown.
- **Product Intelligence** — six transparent classifications (Best Seller, Most Profitable, Growing,
  Declining, Low Volume, Needs Attention) with the rules shown in the UI.
- **Category Intelligence** — contribution, margin and growth per category.
- **AI Analyst & Report** — conversational answers and an eight-section written report, both
  grounded in the computed metrics.

## AI

The browser builds a small JSON summary of the computed metrics and sends only that. Raw
transactions never leave the page, and the context is assembled from an explicit field allowlist, so
customer names and order IDs cannot reach the model.

**Profit is never estimated.** Without a cost column, profit and margin are hidden from the UI and
omitted from the AI context entirely.

**Works without an API key.** The AI calls a paid API. With no key configured, the analyst and report
fall back to analysis computed directly from your data, labelled "Computed from your data — not
AI-generated". The live demo above runs in this mode.

Model: Anthropic Claude Sonnet (`claude-sonnet-4-6`) via `@anthropic-ai/sdk`. The system prompt lives
in [`src/lib/ai/prompts.ts`](src/lib/ai/prompts.ts).

## Tech Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Recharts · PapaParse · SheetJS · Zod ·
Anthropic Claude Sonnet · Vitest · Vercel

No database — data lives in memory for the session with a sessionStorage snapshot. See
[Limitations](#limitations).

## Data Format

Column names are detected automatically and can be corrected by hand.

| Field | Required | Example |
|---|---|---|
| Date | ✅ | 2025-03-14 |
| Product | ✅ | Blue Denim Shirt |
| Quantity | ✅ | 3 |
| Revenue | ✅ | 5400 |
| Category | ○ | Shirts |
| Cost | ○ | 3300 |
| Customer / Discount / Order ID | ○ | — |

```csv
order_date,product_name,category,quantity,revenue,cost
2025-08-04,Classic Blue Shirt,Shirts,2,4760,4056
```

## Run Locally

Node 18+.

```bash
npm install
cp .env.example .env.local   # optional — only the AI features need a key
npm run dev
```

Open <http://localhost:3000>.

| Script | |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | Test suite |
| `npm run generate:demo` | Regenerate the demo dataset |

## Environment Variables

```bash
ANTHROPIC_API_KEY=your_key_here     # server-only, optional
AI_MODEL=claude-sonnet-4-6
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The key is read only inside server routes and is never exposed to the browser. `.env.local` is
gitignored.

## Limitations

- No accounts and no database — data is session-only, lost when the tab closes.
- Profit requires a cost column on at least 80% of rows and is never estimated.
- Trend detection needs at least four time buckets and roughly two weeks of data.
- Limits: 10 MB file size, 100,000 rows. English only, PKR only.
- The AI needs a paid API key; without one the analyst and report run in computed mode, which
  answers the suggested questions but not free-form ones.
- Rate limiting is in-memory (20 requests/IP/hour) and resets on cold start.
- Large files parse on the main thread; a Web Worker is planned.
- Not accounting software, and not financial advice.

## License

MIT — see [LICENSE](LICENSE).
