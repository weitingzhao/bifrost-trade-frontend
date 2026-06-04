# Phase 1 — Master sign-off checklist

**Stage**: New Frontend + Legacy API. Compare **bifrost-trade-frontend** (port 5173) with **bifrost-trader-engine/frontend** on the **same** `VITE_API_*`.

**Mechanical gate (Agent, 2026-06-03)**: `npm run lint` · `npm run build` · `npm run check:legacy-css` — all pass.

**How to sign off**: Open Legacy + New side-by-side → walk each batch → check **Pass** → fill **Owner date** → note regressions in **Remarks**. Agent fixes → re-verify row before closing batch.

---

## Cross-cutting (every batch)

| Check | Pass | Owner date | Remarks |
|-------|------|------------|---------|
| Global market strip (Open orders, Streams lamp, Daily %/$, symbol Popover) on market/portfolio/strategy/research routes | [ ] | | |
| Strip hidden on `/settings/*` and `/operations/*` | [ ] | | |
| Sidebar **Live** nav IB/daemon health lamp matches Legacy | [ ] | | |
| Canvas `bg-card`; elevated panels distinguishable from canvas | [ ] | | |
| No data-loading regression vs Legacy on same API | [ ] | | |

---

## Batch 1 — Core monitoring (priority)

| Route | Business checks | Pass | Owner date | Remarks |
|-------|-----------------|------|------------|---------|
| `/market/live` | 9 sorts, Category groups, Host/Secondary, OPT MTM, DnD, summary bar | [ ] | | |
| `/portfolio/positions` | Instance/Stocks/Options tabs, charts, Strategy attribution rows | [ ] | | |
| `/portfolio/accounts` | KPI, stock/option tables, category click → modal | [ ] | | |
| `/strategy/instances` | Filters, grouped table, detail sidebar (Overview/PnL/Executions/Kline) | [ ] | | |

---

## Batch 2 — Portfolio activity

| Route | Business checks | Pass | Owner date | Remarks |
|-------|-----------------|------|------------|---------|
| `/portfolio/ledger` | Open/closed groups, execution link, modals | [ ] | | |
| `/portfolio/performance` | FilterBar, calendar, On-the-fly section | [ ] | | |
| `/portfolio/model-analysis` | Main table expand, stress CollapsibleGroup | [ ] | | |
| `/portfolio/transfer` | Fetch transactions, summary table | [ ] | | |

---

## Batch 3 — Research

| Route | Business checks | Pass | Owner date | Remarks |
|-------|-----------------|------|------------|---------|
| `/research/watchlist` | Watching → Sizing → Positions | [ ] | | |
| `/research/sepa` | Filter funnel, Readiness table, Inspector | [ ] | | |
| `/research/stock-data` | Runbook steps, backfill actions | [ ] | | |
| `/research/screener` | Option screener, Save to Opportunity | [ ] | | |
| `/research/discovery` | See [PHASE2_DISCOVERY_ACCEPTANCE.md](./PHASE2_DISCOVERY_ACCEPTANCE.md) functional table | [ ] | | |
| `/research/greeks` | Filters + results table | [ ] | | |
| `/research/risk` | 4 KPI tiles, 30s refresh | [ ] | | |
| Stock Inspector | [STOCK_INSPECTOR_ACCEPTANCE.md](./STOCK_INSPECTOR_ACCEPTANCE.md) — Positions / Watchlist / Screener | [ ] | | |

---

## Batch 4 — Strategy configuration

| Route | Business checks | Pass | Owner date | Remarks |
|-------|-----------------|------|------------|---------|
| `/strategy/win-rate` | Since segment, structure cards, totals | [ ] | | |
| `/strategy/structures` | Dual tables, CRUD sheets | [ ] | | |
| `/strategy/opportunities` | List + form modal | [ ] | | |
| `/strategy/allocations` | Dual switch + monitor active | [ ] | | |
| `/strategy/gates` | Gates table + safety form | [ ] | | |
| `/strategy/option-category` | Master-detail, nested legs | [ ] | | |

---

## Batch 5 — System / Operations

| Route | Business checks | Pass | Owner date | Remarks |
|-------|-----------------|------|------------|---------|
| `/settings/api` | 5 tabs, Shutdown, Log Console | [ ] | | |
| `/operations/daemon` | Control actions, Recent ops table | [ ] | | |
| `/operations/celery` | 8 tables, Job Queues, ops auth | [ ] | | |
| `/settings/socket` | Ingest groups, logical columns, control poll, Local Agent | [ ] | | |
| `/operations/logs` | Opens LogPanel → redirects Live (by design) | [ ] | N/A | |

---

## Batch 6 — Settings depth

| Route | Business checks | Pass | Owner date | Remarks |
|-------|-----------------|------|------------|---------|
| `/settings/subscribe` | Snapshot / Redis / IB tabs, Release ticker | [ ] | | |
| `/settings/coverage/overview` | Watchlist summary, job queues, global PG table | [ ] | | |
| `/settings/coverage/overview-detail` | Matrix, Check/Fill, Jobs SSE | [ ] | | |
| `/settings/coverage/option` | DB summary, Daily checklist, Greeks/IV tabs | [ ] | | |
| `/settings/coverage/stock-ib` | IB bars coverage, EOD dry-run, reset/pull | [ ] | | |
| `/settings/coverage/stock-massive` | OHLC coverage, sync actions | [ ] | | |
| `/settings/feed/*` | IB + Massive four sub-routes | [ ] | | |
| `/settings/ib` | Connection + Flex | [ ] | | |

---

## N/A (equivalent stubs)

| Route | Note |
|-------|------|
| `/research/backtest` | Both Legacy and New: "Coming soon" placeholder |

---

## Final sign-off

When **all batches** and cross-cutting rows are checked:

- [ ] Update [PHASE1_UI_ACCEPTANCE.md](./PHASE1_UI_ACCEPTANCE.md) Owner date
- [ ] Update [PHASE2_DISCOVERY_ACCEPTANCE.md](./PHASE2_DISCOVERY_ACCEPTANCE.md) Owner date
- [ ] Update [STOCK_INSPECTOR_ACCEPTANCE.md](./STOCK_INSPECTOR_ACCEPTANCE.md) Owner date
- [ ] Mark bifrost-trade-infra `MIGRATION_TRACKING.md` §6 **Phase 1 VERIFIED** (date: ________)

**Owner signature / date**: ____________________
