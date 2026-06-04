# Phase 1 — Master sign-off checklist

**Stage**: New Frontend + Legacy API. Compare **bifrost-trade-frontend** (port 5173) with **bifrost-trader-engine/frontend** on the **same** `VITE_API_*`.

**Mechanical gate (Agent, 2026-06-03)**: `npm run lint` · `npm run build` · `npm run check:legacy-css` — all pass.

**Batch progress**: Batch 1–6 **Owner signed** (2026-06-03). Cross-cutting **Owner signed** (2026-06-03). **Phase 1 complete** — Final sign-off documented below.

**How to sign off**: Open Legacy + New side-by-side → walk each batch → check **Pass** → fill **Owner date** → note regressions in **Remarks**. Agent fixes → re-verify row before closing batch.

---

## Cross-cutting (every batch)

| Check | Pass | Owner date | Remarks |
|-------|------|------------|---------|
| Global market strip (Open orders, Streams lamp, Daily %/$, symbol Popover) on market/portfolio/strategy/research routes | [x] | 2026-06-03 | Owner verified |
| Strip hidden on `/settings/*` and `/operations/*` | [x] | 2026-06-03 | Owner verified |
| Sidebar **Live** nav IB/daemon health lamp matches Legacy | [x] | 2026-06-03 | Owner verified |
| Canvas `bg-card`; elevated panels distinguishable from canvas | [x] | 2026-06-03 | Owner verified |
| No data-loading regression vs Legacy on same API | [x] | 2026-06-03 | Owner verified |

> **Note (2026-06-03)**: Phase 1 all batches + cross-cutting Owner signed. `/settings/ib` Batch 6 Legacy parity skipped (Massive historical data; IB connection / trading / Flex retained).

---

## Batch 1 — Core monitoring (priority)

| Route | Business checks | Pass | Owner date | Remarks |
|-------|-----------------|------|------------|---------|
| `/market/live` | 9 sorts, Category groups, Host/Secondary, OPT MTM, DnD, summary bar | [x] | 2026-06-03 | Owner verified |
| `/portfolio/positions` | Instance/Stocks/Options tabs, charts, Strategy attribution rows | [x] | 2026-06-03 | Owner verified |
| `/portfolio/accounts` | KPI, stock/option tables, category click → modal | [x] | 2026-06-03 | Owner verified |
| `/strategy/instances` | Filters, grouped table, detail sidebar (Overview/PnL/Executions/Kline) | [x] | 2026-06-03 | Owner verified |

---

## Batch 2 — Portfolio activity

**Agent pre-flight (2026-06-03)**: `lint` / `build` / `check-legacy-css` pass. Ledger Option Category cells use `DenseOptionCategoryLabel` (no pill).

| Route | Business checks | Pass | Owner date | Remarks |
|-------|-----------------|------|------------|---------|
| `/portfolio/ledger` | Open/closed groups, execution link, modals | [x] | 2026-06-03 | Owner verified |
| `/portfolio/performance` | FilterBar, calendar, On-the-fly section | [x] | 2026-06-03 | Owner verified |
| `/portfolio/model-analysis` | Main table expand, stress CollapsibleGroup | [x] | 2026-06-03 | Owner verified |
| `/portfolio/transfer` | Fetch transactions, summary table | [x] | 2026-06-03 | Owner verified |

---

## Batch 3 — Research *(Owner signed 2026-06-03)*

**Agent pre-flight (2026-06-03)**: `lint` / `build` / `check-legacy-css` pass. Routes: watchlist, sepa, stock-data, screener, discovery, greeks, risk.

| Route | Business checks | Pass | Owner date | Remarks |
|-------|-----------------|------|------------|---------|
| `/research/watchlist` | Watching → Sizing → Positions | [x] | 2026-06-03 | Owner verified |
| `/research/sepa` | Filter funnel, Readiness table, Inspector | [x] | 2026-06-03 | Stock Screener |
| `/research/stock-data` | Runbook steps, backfill actions | [x] | 2026-06-03 | Owner verified |
| `/research/screener` | Option screener, Save to Opportunity | [x] | 2026-06-03 | Owner verified |
| `/research/discovery` | See [PHASE2_DISCOVERY_ACCEPTANCE.md](./PHASE2_DISCOVERY_ACCEPTANCE.md) functional table | [x] | 2026-06-03 | Owner verified |
| `/research/greeks` | Filters + results table | [x] | 2026-06-03 | Owner verified |
| `/research/risk` | 4 KPI tiles, 30s refresh | [x] | 2026-06-03 | Owner verified |
| Stock Inspector | [STOCK_INSPECTOR_ACCEPTANCE.md](./STOCK_INSPECTOR_ACCEPTANCE.md) — Positions / Watchlist / Screener | [x] | 2026-06-03 | Three entry points |

---

## Batch 4 — Strategy configuration *(Owner signed 2026-06-03)*

**Agent pre-flight (2026-06-03)**: `lint` / `build` / `check-legacy-css` pass. Routes: win-rate, structures, opportunities, allocations, gates, option-category.

**Suggested Owner order**: option-category → structures → opportunities → allocations → gates → win-rate.

| Route | Business checks | Pass | Owner date | Remarks |
|-------|-----------------|------|------------|---------|
| `/strategy/win-rate` | Since segment, structure cards, totals | [x] | 2026-06-03 | Owner verified |
| `/strategy/structures` | Dual tables, inline Edit/Create form (Legacy parity) | [x] | 2026-06-03 | Owner verified |
| `/strategy/opportunities` | List + form modal | [x] | 2026-06-03 | Owner verified |
| `/strategy/allocations` | Dual switch + monitor active | [x] | 2026-06-03 | Owner verified |
| `/strategy/gates` | Gates table + inline safety form (Legacy parity) | [x] | 2026-06-03 | Owner verified |
| `/strategy/option-category` | Master-detail, nested legs | [x] | 2026-06-03 | Owner verified |

---

## Batch 5 — System / Operations *(Owner signed 2026-06-03)*

**Agent pre-flight (2026-06-03)**: `lint` / `build` / `check-legacy-css` pass. Routes: api, daemon, celery, socket.

**Suggested Owner order**: api → daemon → celery → socket → logs (N/A).

| Route | Business checks | Pass | Owner date | Remarks |
|-------|-----------------|------|------------|---------|
| `/settings/api` | 5 tabs, Shutdown, Log Console | [x] | 2026-06-03 | Owner verified |
| `/operations/daemon` | Control actions, Recent ops table | [x] | 2026-06-03 | Owner verified |
| `/operations/celery` | 8 tables, Job Queues, ops auth | [x] | 2026-06-03 | Owner verified |
| `/settings/socket` | Ingest groups, logical columns, control poll, Local Agent | [x] | 2026-06-03 | Owner verified |
| `/operations/logs` | Opens LogPanel → redirects Live (by design) | [x] | 2026-06-03 | N/A |

---

## Batch 6 — Settings depth *(Owner signed 2026-06-03)*

**Agent pre-flight (2026-06-03)**: `lint` / `build` / `check-legacy-css` pass.

**Suggested Owner order** (shallow → deep):

| Order | Route | Code (DONE) |
|-------|-------|-------------|
| — | `/settings/ib` | Skip Batch 6 parity — `IbConnectionPage.tsx` retained (Massive covers historical data; IB other services critical) |
| 1 | `/settings/subscribe` | `SubscribePage.tsx` + `subscribe/*` |
| 2 | `/settings/coverage/overview` | `CoverageOverviewPage.tsx` |
| 3 | `/settings/coverage/overview-detail` | `CoverageOverviewDetailPage.tsx` |
| 4 | `/settings/coverage/option` | `CoverageOptionPage.tsx` |
| 5 | `/settings/coverage/stock-ib` | `CoverageStockIbPage.tsx` |
| 6 | `/settings/coverage/stock-massive` | `CoverageStockMassivePage.tsx` |
| 7 | `/settings/feed/*` | four sub-routes (IB / Massive stock / option / comm) |

**Cross-cutting re-check** (signed 2026-06-03): strip hidden on settings/operations; canvas on Coverage / Subscribe; strip + sidebar lamp on market/strategy routes.

| Route | Business checks | Pass | Owner date | Remarks |
|-------|-----------------|------|------------|---------|
| `/settings/ib` | Connection + Flex | [x] | 2026-06-03 | N/A — Batch 6 parity skip (Massive historical data; IB connection/other services retained) |
| `/settings/subscribe` | Snapshot / Redis / IB tabs, Release ticker | [x] | 2026-06-03 | Owner verified |
| `/settings/coverage/overview` | Watchlist summary, job queues, global PG table | [x] | 2026-06-03 | Owner verified |
| `/settings/coverage/overview-detail` | Matrix, Check/Fill, Jobs SSE | [x] | 2026-06-03 | Owner verified |
| `/settings/coverage/option` | DB summary, Daily checklist, Greeks/IV tabs | [x] | 2026-06-03 | Owner verified |
| `/settings/coverage/stock-ib` | IB bars coverage, EOD dry-run, reset/pull | [x] | 2026-06-03 | Owner verified |
| `/settings/coverage/stock-massive` | OHLC coverage, sync actions | [x] | 2026-06-03 | Owner verified |
| `/settings/feed/*` | IB + Massive four sub-routes | [x] | 2026-06-03 | Owner verified |

---

## N/A (equivalent stubs)

| Route | Note |
|-------|------|
| `/research/backtest` | Both Legacy and New: "Coming soon" placeholder |

---

## Final sign-off

When **all batches** and cross-cutting rows are checked:

- [x] Update [PHASE1_UI_ACCEPTANCE.md](./PHASE1_UI_ACCEPTANCE.md) Owner date (2026-06-03)
- [x] Update [PHASE2_DISCOVERY_ACCEPTANCE.md](./PHASE2_DISCOVERY_ACCEPTANCE.md) Owner date (2026-06-03; signed Batch 3)
- [x] Update [STOCK_INSPECTOR_ACCEPTANCE.md](./STOCK_INSPECTOR_ACCEPTANCE.md) Owner date (2026-06-03; signed Batch 3)
- [x] Mark bifrost-trade-infra `MIGRATION_TRACKING.md` §6 **Phase 1 VERIFIED** (date: 2026-06-03)

**Owner signature / date**: 2026-06-03
