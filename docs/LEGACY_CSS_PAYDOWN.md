# Legacy CSS paydown tracking

Progress toward a single Dense UI table stack and zero engine-era CSS patterns in `bifrost-trade-frontend`.

Related: [LEGACY_CSS_CUTOFF.md](./LEGACY_CSS_CUTOFF.md) · [DENSE_UI.md](./DENSE_UI.md)

Verify after each phase:

```bash
cd bifrost-trade-frontend
npm run lint && npm run build && npm run check:legacy-css
```

## Baseline (2026-06-01)

| Metric | Count | Notes |
|--------|------:|-------|
| `DenseDataTable` adopters | ~18 | Accounts Stock/Option, Positions Instance, Stocks/Options tabs, Trade Ledger |
| shadcn `@/components/ui/table` in `src/` | ~36 | Admin / Strategy / Live / StockCoverageTable (Phase 2+) |
| `*.module.css` files | 25 | Chart + toolbar exceptions |
| Engine `App.css` import | 0 | Already cut |

---

## Phase 0 — Accounts Stock + grouping primitives (done)

**Scope**

- Extend `GroupHeaderRow` (clickable category variant)
- Add `GroupSubtotalRow`, `GrandTotalRow`
- Extract [accountsStockPositions.ts](../src/utils/accountsStockPositions.ts)
- Migrate [StockPositionsTable.tsx](../src/components/accounts/StockPositionsTable.tsx) to Dense UI

**CI**

- `src/components/accounts/**` must not import `@/components/ui/table`

**Acceptance**

- Row density matches Positions → Stocks tab (`--table-cell-py/px`)
- Category click opens Categories modal; subtotals / Stock Total match Legacy API

---

## Phase 1 — Accounts Option + Positions Strategy (done)

**Scope**

- Extract [accountsOptionPositions.ts](../src/utils/accountsOptionPositions.ts)
- Migrate [OptionPositionsTable.tsx](../src/components/accounts/OptionPositionsTable.tsx) to Dense UI
- Migrate [InstanceTab.tsx](../src/components/positions/InstanceTab.tsx), [InstanceOptionSubTable.tsx](../src/components/positions/InstanceOptionSubTable.tsx), [InstanceCoverageSubTable.tsx](../src/components/positions/InstanceCoverageSubTable.tsx)
- Trim table rules from [instancePanelClasses.ts](../src/components/positions/instancePanelClasses.ts)

**CI**

- `src/components/accounts/**` — no shadcn Table
- `InstanceTab.tsx`, `InstanceOptionSubTable.tsx`, `InstanceCoverageSubTable.tsx` — no shadcn Table

**Acceptance**

- Option Premium Total + Instance Opt PNL footer match pre-migration values on Legacy API
- Row density aligned with Stocks tab / Accounts Stock table

---

## Phase 2 — Live market tables (done)

**Scope**

- [liveTableClasses.ts](../src/pages/market/live/liveTableClasses.ts) + [LiveStackedPnlCell.tsx](../src/pages/market/live/LiveStackedPnlCell.tsx)
- [MarketStreamsTable.tsx](../src/pages/market/live/MarketStreamsTable.tsx) hybrid shell (sticky thead + Dense cells)
- [MarketStreamStkRow.tsx](../src/pages/market/live/MarketStreamStkRow.tsx), [MarketStreamOptRow.tsx](../src/pages/market/live/MarketStreamOptRow.tsx)
- [WatchingStocksPane.tsx](../src/pages/market/live/WatchingStocksPane.tsx), [OpenOrdersPane.tsx](../src/pages/market/live/OpenOrdersPane.tsx)
- Shrink [live.module.css](../src/pages/market/live/live.module.css) to tooltip/sort/drag only

**CI**

- No `styles.(numCell|tableWrap|openOrdersTable|groupHeader|sumRow)` in `src/pages/market/live/**/*.tsx`
- `live.module.css` line budget ≤ 120

**Acceptance**

- Row density matches Positions Stocks tab (`--table-cell-py/px`)
- Sort cycle, drag-drop, Daily calc tooltip unchanged on Legacy API

---

## Phase 3 — Model Analysis (done)

**Scope**

- [`modelAnalysisUi.ts`](../src/pages/portfolio/modelAnalysis/modelAnalysisUi.ts) + [`ModelAnalysisAccountPills.tsx`](../src/pages/portfolio/modelAnalysis/ModelAnalysisAccountPills.tsx)
- [`ModelAnalysisPage.tsx`](../src/pages/portfolio/ModelAnalysisPage.tsx) — PageHeader + segment account pills
- [`ModelAnalysisSections.tsx`](../src/pages/portfolio/modelAnalysis/ModelAnalysisSections.tsx) — main table + stress collapsible + KPI strip
- [`UnderlyingDetailPanel.tsx`](../src/pages/portfolio/modelAnalysis/UnderlyingDetailPanel.tsx) — 3× NestedDenseTable
- Delete [`modelAnalysis.module.css`](../src/pages/portfolio/modelAnalysis.module.css) (372 lines → 0)

**CI**

- No `styles.(compactTable|tableWrap|nestedTable|pnlPositive|…)` in `src/pages/portfolio/modelAnalysis/**/*.tsx`
- `modelAnalysis.module.css` absent or ≤ 80 lines

**Acceptance**

- Expand row, CAR detail, account stress matrix match Legacy API behavior
- Row density aligned with Accounts Stock / Positions Instance tab

---

## Phase 3.5 — Trade Ledger shell (done)

**Scope**

- Delete [`ledgerStyles.module.css`](../src/pages/portfolio/ledger/ledgerStyles.module.css) (577 lines → 0)
- [`ledgerShellUi.ts`](../src/pages/portfolio/ledger/ledgerShellUi.ts) — page card, split toolbar, symbol combobox
- [`ledgerSummaryUi.ts`](../src/pages/portfolio/ledger/ledgerSummaryUi.ts) — summary KPI grid + totals
- [`LedgerTabToolbar.tsx`](../src/pages/portfolio/ledger/LedgerTabToolbar.tsx), [`LedgerTabFilters.tsx`](../src/pages/portfolio/ledger/LedgerTabFilters.tsx) — `SegmentControl`
- [`LedgerSummarySection.tsx`](../src/pages/portfolio/ledger/LedgerSummarySection.tsx) — period segments + calendar cells
- Instance **Open** link → `DenseTag variant="success"`

**CI**

- No `ledgerStyles` import under `src/pages/portfolio/ledger/**`
- `ledgerStyles.module.css` absent

**Acceptance**

- Tab switch, Summary period, Accordion/Multi, metric explain panel unchanged on Legacy API

---

## Phase 4.1 — Transfer & Pay (done)

**Scope**

- Delete [`transferPay.module.css`](../src/pages/portfolio/transferPay.module.css) (372 lines → 0)
- [`transferPayUi.ts`](../src/pages/portfolio/transferPay/transferPayUi.ts) — page card, header, toolbar layout tokens
- [`TransferPayToolbar.tsx`](../src/pages/portfolio/transferPay/TransferPayToolbar.tsx) — `SegmentControl` + type multi-toggle
- [`TransferPayTransactionsTable.tsx`](../src/pages/portfolio/transferPay/TransferPayTransactionsTable.tsx), [`TransferPaySummaryTable.tsx`](../src/pages/portfolio/transferPay/TransferPaySummaryTable.tsx) — `DenseDataTable` + `InlinePnl`

**CI**

- No `transferPay.module.css`; no `styles.(dataTable|appTab|typePill|pnlPositive)` under Transfer Pay paths

**Acceptance**

- Range/Fetch, account & type filters, pagination, both tables, summary period toggle unchanged on Legacy API

---

## Phase 4 — Ops / Research / Settings grids

Migrate remaining shadcn `Table` usages in Celery, Strategy admin, Screener, etc. Prioritize high-traffic monitoring pages.

Track remaining count:

```bash
grep -rl "@/components/ui/table" src --include='*.tsx' | wc -l
```

---

## Phase 5 — Module CSS shrink

- Delete obsolete page table modules after Dense migration
- Tighten `check-legacy-css` budgets monotonically
