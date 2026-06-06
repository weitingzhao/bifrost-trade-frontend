# Phase 2B — API cutover sign-off (M6)

**Stage**: New Frontend + **New API** (Dev Docker stack, ports 8765–8773). One domain at a time during sprint work; final `.env.development` matches [`.env.development.example`](../.env.development.example).

**Backend**: `cd bifrost-trade-infra && make dev && make dev-health` (9/9 API OK).

**Mechanical gate (Agent, 2026-06-04)**: `npm run lint` · `npm run build` · `npm run check:legacy-css` — **pass** (all 9 `VITE_API_*` → 8765–8773). `make check-cutover-env` — **pass**.

**How to sign off**: See [PHASE2B_OWNER_WALKTHROUGH.md](./PHASE2B_OWNER_WALKTHROUGH.md). Agent API smoke: [PHASE2B_AGENT_VERIFICATION.md](./PHASE2B_AGENT_VERIFICATION.md) (2026-06-05, 9/9 health OK).

Keep Legacy engine UI/API running → `make switch-cutover-domain DOMAIN=<域> MODE=legacy|new` → restart Vite → walk rows below → check **Pass** → fill **Owner date** → update [MIGRATION_TRACKING.md](../../bifrost-trade-infra/docs/MIGRATION_TRACKING.md) §10.

**Rollback**: Revert the single `VITE_API_*` to Legacy port (8711–8741), restart Vite.

---

## Env reference

| Domain | Variable | Legacy | New (Dev stack) |
|--------|----------|--------|-----------------|
| docs | `VITE_API_DOCS` | 8719 | 8767 |
| monitor | `VITE_API_MONITOR` | 8711 | 8765 |
| market | `VITE_API_MARKET` | 8733 | 8772 |
| trading | `VITE_API_TRADING` | 8721 | 8769 |
| portfolio | `VITE_API_PORTFOLIO` | 8723 | 8771 |
| strategy | `VITE_API_STRATEGY` | 8735 | 8770 |
| ops | `VITE_API_OPS` | 8713 | 8768 |
| massive | `VITE_API_MASSIVE` | 8741 | 8766 |
| research | `VITE_API_RESEARCH` | 8731 | 8773 |

---

## Domain 1 — docs (Sprint 2B.1)

**Agent API gate (2026-06-05)**: pass — `make verify-wave-a-sessions` Session 1 · [SESSION_TRACKER](./PHASE2B_SESSION_TRACKER.md)

**Env change**: `VITE_API_DOCS=http://localhost:8767`

| Route / check | Business checks | Pass | Owner date | Remarks |
|---------------|-----------------|------|------------|---------|
| `/settings/api` | 5 tabs load; OpenAPI merge; Shutdown actions | [x] | 2026-06-04 | Batch 5 |
| Docs health | `GET /research/docs/health` 200 via new API | [x] | 2026-06-04 | |

---

## Domain 2 — monitor (Sprint 2B.2)

**Agent API gate (2026-06-04)**: pass — Session 7（`GET :8765/status` 200；`self_check=degraded` 因 IB/ingestor 离线，已备注）

**Env change**: `VITE_API_MONITOR=http://localhost:8765`

**Cross-deps**: `messages.ts`, `logs.ts`, `market.ts` open-orders, `strategy.ts` active-strategy.

| Route / check | Business checks | Pass | Owner date | Remarks |
|---------------|-----------------|------|------------|---------|
| Global strip | Open orders, Streams lamp, Daily %/$ | [x] | 2026-06-04 | Batch 1；Streams 黄灯因 ingestor 离线 |
| Sidebar lamp | Live nav IB/daemon health | [x] | 2026-06-04 | `skip_monitor_ib` 下与 Legacy 一致 |
| `/operations/daemon` | Control actions, Recent ops | [x] | 2026-06-04 | Batch 5 |
| `/settings/api` Monitor tab | Health probe green | [x] | 2026-06-04 | API 200；IB 离线时 degraded 可接受 |
| `/strategy/allocations` | Current active from monitor | [x] | 2026-06-04 | Batch 4 |
| Shell TopNav | Narrow viewport top menu | [x] | 2026-06-04 | 768px 以下强制 TopNav；640px 以下 icon-only 单行 |

---

## Domain 3 — market (Sprint 2B.2)

**Agent API gate (2026-06-04)**: pass — Session 8（`GET :8772/health` 200；Live SSE + quotes 已验）

**Env change**: `VITE_API_MARKET=http://localhost:8772`

| Route / check | Business checks | Pass | Owner date | Remarks |
|---------------|-----------------|------|------------|---------|
| `/market/live` | Quotes table, SSE stream, category groups | [x] | 2026-06-04 | Batch 1 |
| Watchlist quotes | OPT/STK rows update | [x] | 2026-06-04 | |

---

## Domain 4 — trading (Sprint 2B.3)

**Agent API gate (2026-06-05)**: pass — Session 3（`/executions`）

**Env change**: `VITE_API_TRADING=http://localhost:8769`

| Route / check | Business checks | Pass | Owner date | Remarks |
|---------------|-----------------|------|------------|---------|
| `/portfolio/ledger` | Open/closed groups, execution link, Link stock fills | [x] | 2026-06-05 | Batch 2；Options/Stock 列宽、Strategy #5 PnL 已对齐 Legacy |

---

## Domain 5 — portfolio (Sprint 2B.3)

**Agent API gate (2026-06-05)**: pass — Session 2（monitor `/status` + portfolio `/position-categories`）

**Env change**: `VITE_API_PORTFOLIO=http://localhost:8771`

| Route / check | Business checks | Pass | Owner date | Remarks |
|---------------|-----------------|------|------------|---------|
| `/portfolio/accounts` | KPI, tables, category modal | [x] | 2026-06-04 | Batch 1 |
| `/portfolio/positions` | Tabs, charts, attribution | [x] | 2026-06-04 | Batch 1；Instance Risk Profile 对齐 Strategy 侧边栏 |
| `/portfolio/performance` | FilterBar, calendar | [x] | 2026-06-04 | Batch 2；Equity Growth %/$ SegmentControl |
| `/portfolio/model-analysis` | Table expand, stress panel | [x] | 2026-06-04 | Batch 2 |

---

## Domain 6 — strategy (Sprint 2B.3)

**Agent API gate (2026-06-05)**: pass — Session 4（`/strategies/instances`）

**Env change**: `VITE_API_STRATEGY=http://localhost:8770`

| Route / check | Business checks | Pass | Owner date | Remarks |
|---------------|-----------------|------|------------|---------|
| `/strategy/instances` | Filters, sidebar detail, Create instance modal | [x] | 2026-06-05 | Batch 1 |
| `/strategy/win-rate` | Structure cards, drill to instances | [x] | 2026-06-05 | Batch 4 |
| `/strategy/structures` | Dual tables, SegmentControl | [x] | 2026-06-05 | Batch 4 |
| `/strategy/opportunities` | List, filters | [x] | 2026-06-05 | Batch 4 |
| `/strategy/allocations` | Table, Current active | [x] | 2026-06-05 | Batch 4 |
| `/strategy/gates` | Gates table, Safety sheet | [x] | 2026-06-05 | Batch 4 |
| `/strategy/option-category` | Templates, legs/meta dropdowns | [x] | 2026-06-05 | Batch 4 |

---

## Domain 7 — ops (Sprint 2B.4)

**Agent API gate (2026-06-04)**: pass — Session 9（`GET :8768/health` 200；celery + socket ingest 已验）

**Env change**: `VITE_API_OPS=http://localhost:8768`

**Prerequisite**: `celery-worker` container running in Dev stack.

| Route / check | Business checks | Pass | Owner date | Remarks |
|---------------|-----------------|------|------------|---------|
| `/operations/celery` | 8 tables, capabilities, Job Queues | [x] | 2026-06-04 | Batch 5；Queue Summary 状态色、Worker PROD/Max 已对齐 |
| `/settings/socket` | Ingest control (ops-backed) | [x] | 2026-06-04 | Batch 5 |

---

## Domain 8 — massive (Sprint 2B.4)

**Agent API gate (2026-06-05)**: pass — Session 6（contracts-coverage）

**Env change**: `VITE_API_MASSIVE=http://localhost:8766`

| Route / check | Business checks | Pass | Owner date | Remarks |
|---------------|-----------------|------|------------|---------|
| `/settings/coverage/*` | Overview, option, stock IB/Massive | [x] | 2026-06-05 | Batch 6；Overview Stocks 分块、job queues、Worker situation 已对齐 |
| `/settings/feed/*` | Massive feed sub-routes | [x] | 2026-06-05 | Batch 6；Tickers Execute + Polygon key 已迁 |
| Beat schedule | Celery beat entries visible in coverage UI | [x] | 2026-06-05 | |

---

## Domain 9 — research (Sprint 2B.4)

**Agent API gate (2026-06-05)**: pass — Session 5（readiness + sepa route）

**Env change**: `VITE_API_RESEARCH=http://localhost:8773`

| Route / check | Business checks | Pass | Owner date | Remarks |
|---------------|-----------------|------|------------|---------|
| `/research/watchlist` | Watching → Sizing → Positions | [x] | 2026-06-05 | Batch 3 |
| `/research/sepa` | Filter funnel, Readiness | [x] | 2026-06-05 | |
| `/research/stock-data` | Runbook, backfill | [x] | 2026-06-05 | |
| `/research/screener` | Option screener | [x] | 2026-06-05 | |
| `/research/discovery` | IV term, charts | [x] | 2026-06-05 | |
| `/research/greeks` | Filters + table | [x] | 2026-06-05 | |
| `/research/risk` | KPI tiles | [x] | 2026-06-05 | |
| Stock Inspector | Three entry points | [x] | 2026-06-05 | |

---

## Final sign-off — Phase 2B CLOSED

When all 9 domains are checked and `.env.development` matches `.env.development.example`:

- [x] All §10 rows in [MIGRATION_TRACKING.md](../../bifrost-trade-infra/docs/MIGRATION_TRACKING.md) **CUTOVER** + Owner signed
- [x] `make dev-health` 9/9 with stack up
- [x] `./scripts/check_cutover_env.sh` (infra) reports no Legacy ports
- [x] Agent mechanical gate pass (date: 2026-06-05)
- [x] Owner signature / date: **2026-06-04**（Wave A Session 1–6 + Wave B Session 7–9）

**Status**: **Phase 2B CLOSED** — New Frontend + New API（Dev 8765–8773）9/9 域 Owner 签字完成。下一步：Phase 2C / Prod compose（见 infra `PHASE2C_PROD_DEFERRED.md`）。
