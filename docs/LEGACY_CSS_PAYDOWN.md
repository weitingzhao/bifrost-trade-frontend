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

## Phase 4.2 — Stock Screener (done)

**Scope**

- Delete [`stock-screener.module.css`](../src/pages/research/stockScreener/stock-screener.module.css) (225 lines → 0)
- [`stockScreenerUi.ts`](../src/pages/research/stockScreener/stockScreenerUi.ts) — layout grid, card shell, chip tokens
- [`segmentStyles.ts`](../src/pages/research/stockScreener/segmentStyles.ts) — Tailwind hue map (no module import)
- [`ScreenerCard.tsx`](../src/pages/research/stockScreener/ScreenerCard.tsx), [`ScreenerConditionChip.tsx`](../src/pages/research/stockScreener/ScreenerConditionChip.tsx) — filter UI
- [`ReadinessResultsTable.tsx`](../src/pages/research/stockScreener/ReadinessResultsTable.tsx) — `DenseDataTable` + sortable head + `DenseLinkButton`

**CI**

- No `stock-screener.module.css` under `src/pages/research/stockScreener/**`
- No shadcn `@/components/ui/table` in `ReadinessResultsTable.tsx`

**Acceptance**

- Tech/Fund filter chips, dist funnel bucket load, Apply filter, Results sort, Inspector toggle unchanged on Legacy API

---

## Phase 4.4 — Option Screener (done)

**Scope**

- Split monolith [`ScreenerPage.tsx`](../src/pages/research/ScreenerPage.tsx) → [`optionScreener/`](../src/pages/research/optionScreener/) (14 files)
- [`optionScreenerUi.ts`](../src/pages/research/optionScreener/optionScreenerUi.ts) — filter panel, warn box, score bar tokens
- [`OptionScreenerFilterPanel.tsx`](../src/pages/research/optionScreener/OptionScreenerFilterPanel.tsx) — `SegmentControl` structure type
- [`OptionScreenerSymbolGroup.tsx`](../src/pages/research/optionScreener/OptionScreenerSymbolGroup.tsx) — `CollapsibleGroup`
- [`OptionScreenerContractsTable.tsx`](../src/pages/research/optionScreener/OptionScreenerContractsTable.tsx) — `DenseDataTable` + `DenseTag` + `IconActionButton`

**CI**

- No raw `<table` under `src/pages/research/optionScreener/**`
- No hand-rolled bookmark opacity buttons in option screener paths

**Acceptance**

- Structure segment, Run Screener, group expand/collapse, contract columns, Export CSV, Save → Opportunity modal unchanged on Legacy API

---

## Phase 4.5 — Stock Watchlist (done)

**Scope**

- Delete [`watchlist.module.css`](../src/pages/research/watchlist/watchlist.module.css) (142 lines → 0)
- [`watchlistUi.ts`](../src/pages/research/watchlist/watchlistUi.ts) — stepper, quote, pie, range, KPI/order zone tokens
- [`WorkflowStepper.tsx`](../src/pages/research/watchlist/WorkflowStepper.tsx) — three-step workflow nav
- [`WatchlistStockTable.tsx`](../src/pages/research/watchlist/WatchlistStockTable.tsx), [`WatchlistOptionTable.tsx`](../src/pages/research/watchlist/WatchlistOptionTable.tsx) — `DenseDataTable` + `DenseLinkButton` + `DenseTag` + `IconActionButton`
- [`PortfolioRiskPower.tsx`](../src/pages/research/watchlist/PortfolioRiskPower.tsx) — `CollapsibleGroup` + [WatchlistMetricTable.tsx](../src/pages/research/watchlist/WatchlistMetricTable.tsx)
- [`WatchlistSizingCapTable.tsx`](../src/pages/research/watchlist/WatchlistSizingCapTable.tsx) — sizing cap rows
- [`PositionsTab.tsx`](../src/pages/research/watchlist/PositionsTab.tsx) — `SegmentControl` stocks/options

**CI**

- No `watchlist.module.css` under `src/pages/research/watchlist/**`
- No `@/components/ui/table` under watchlist paths
- No `dangerGhostBtnClass` under watchlist paths

**Acceptance**

- WorkflowStepper tabs, Watching/Sizing/Positions tables, Portfolio risk collapse/sliders/pies, sizing cap table unchanged on Legacy API

---

## Phase 4.6 — Option Discovery (done)

**Scope**

- Delete [`optionContractDetail.module.css`](../src/components/optionDiscovery/optionContractDetail.module.css) (198 lines → 0)
- [`discoveryUi.ts`](../src/pages/research/discovery/discoveryUi.ts) + [`optionDiscoveryUi.ts`](../src/components/optionDiscovery/optionDiscoveryUi.ts) — page/component tokens
- Six Dense tables: [`DiscoveryChainQuotesTable`](../src/components/optionDiscovery/DiscoveryChainQuotesTable.tsx) (sticky hybrid), [`DiscoveryStrikeLadderTable`](../src/components/optionDiscovery/DiscoveryStrikeLadderTable.tsx), [`DiscoveryIvTermSheetTable`](../src/components/optionDiscovery/DiscoveryIvTermSheetTable.tsx), [`DiscoveryCompareTable`](../src/components/optionDiscovery/DiscoveryCompareTable.tsx), [`DiscoveryContractGreeksTable`](../src/components/optionDiscovery/DiscoveryContractGreeksTable.tsx), [`DiscoveryScenarioTable`](../src/components/optionDiscovery/DiscoveryScenarioTable.tsx)
- Five `ToggleGroup` → `SegmentControl`; compare remove → `IconActionButton tone="danger"`
- **Keep** [`discoveryCharts.module.css`](../src/pages/research/discoveryCharts.module.css) — chart expand overlay + SVG geometry only

**CI**

- No `optionContractDetail.module.css`
- No `@/components/ui/table` under `src/components/optionDiscovery/**`
- No raw `<table` under `src/components/optionDiscovery/**` (except paths covered by chart CSS exception)
- No `dangerTextBtnClass`, `od-pnl-pos`, `od-scenario-table` strings under optionDiscovery

**Acceptance**

- Chain sticky scroll, Snapshot↔BS, IV term sheet, Max Pain, contract drawer Greeks/scenario/tradability/compare unchanged on Legacy API

---

## Phase 4.7 — IV & Greeks (done)

**Scope**

- [`greeksUi.ts`](../src/pages/research/greeks/greeksUi.ts) — IV/Delta semantic cell classes, loading/empty hints, tooltip section/KV/compare tokens
- [`GreeksHistoryTable.tsx`](../src/pages/research/greeks/GreeksHistoryTable.tsx) — `DenseDataTable` + expiry subhead + `DenseTag` C/P + DTE pill (`variant="info"`)
- [`GreeksCalcTooltip.tsx`](../src/pages/research/greeks/GreeksCalcTooltip.tsx) — tokenized BS detail portal
- [`GreeksPage.tsx`](../src/pages/research/GreeksPage.tsx) — `PageShell padding="default"`, controls/info bar in `Card variant="elevated"`
- [`greeksFormat.ts`](../src/pages/research/greeks/greeksFormat.ts) — fmt/groupBy/dte only (colors moved to `greeksUi`)

**CI**

- No `*.module.css` under `src/pages/research/greeks/**`
- No `@/components/ui/table` under `src/pages/research/greeks/**`
- No raw `<table` under `src/pages/research/greeks/**`
- No legacy strings: `greeks-table__`, `greeks-calc-tooltip__`, `option-greeks-page__`

**Acceptance**

- Symbol commit, trade date select, r, C/P/All segment, Load
- Expiry groups + DTE badge, IV three-color rule, ATM Delta highlight, C/P DenseTag
- Row hover BS tooltip (Inputs / IV solve / d₁·d₂ / Greeks / Server vs local)
- Empty chain + error Alert unchanged on Legacy API

---

## Phase 4.8 — Strategy Instances List (done)

**Scope**

- [`instancesUi.ts`](../src/components/strategy/instances/instancesUi.ts) — page/filter/table/group/period tokens
- [`InstancesPage.tsx`](../src/pages/strategy/InstancesPage.tsx) — `PageShell padding="default"`, elevated controls `Card`, shadcn `Select` for Account
- [`InstanceListFilters.tsx`](../src/components/strategy/InstanceListFilters.tsx) + [`InstanceListToolbar.tsx`](../src/components/strategy/InstanceListToolbar.tsx) — `SegmentControl`, elevated filter `Card`
- [`InstancesGroupedTable.tsx`](../src/components/strategy/InstancesGroupedTable.tsx) — two-tier `DenseDataTable`, symbol group subheads, `IconActionButton`, `DenseTag`
- Delete `instancesTable.module.css`, `instancesFilters.module.css`, unused `InstancesTable.tsx`

**CI**

- No `instancesTable.module.css` / `instancesFilters.module.css`
- No raw `<table` in `InstancesGroupedTable.tsx`
- No `dangerGhostBtnClass` under `src/components/strategy/instances/**` or `InstancesGroupedTable.tsx`
- No legacy strings: `strategy-instances-`, `instance-list-symbol-toolbar`

**Acceptance**

- Account/Strategy/Instance filters, Status/Structure/Symbol/Type/Since/Expiry filters + Clear
- Accordion vs Multi detail view, Expand/Collapse all symbol groups
- Group rollup row, column sort, row select/compare, View/Compare/Delete actions
- Create instance + Refresh metrics unchanged on Legacy API

**Follow-up:** Phase 4.9 — Instance Detail sidebar — **DONE (2026-06-03)**: deleted `InstanceDetail.module.css`; executions match tables use `instanceDetailUi.ts` tokens (`text-profit` / `text-loss`); CI guard in `check-legacy-css.sh`.

---

## Phase 4.9 — Instance Detail sidebar (done 2026-06-03)

**Scope**

- [`InstanceExecutionsSection.tsx`](../src/components/strategy/instanceDetail/InstanceExecutionsSection.tsx) — no module CSS; buy/sell match + fills grid via `instanceDetailUi.ts`
- Delete [`InstanceDetail.module.css`](../src/components/strategy/instanceDetail/InstanceDetail.module.css)

**CI**

- No `InstanceDetail.module.css` under `instanceDetail/`
- No raw emerald/red palette increase (use `text-profit` / `text-loss`)

**Acceptance**

- Instances → View detail / compare: Overview, PnL, Executions, Kline unchanged on Legacy API

---

## Phase 4.10 — Strategy Win Rate (done)

**Scope**

- [`winRateUi.ts`](../src/components/strategy/winRate/winRateUi.ts) — grid/card/KPI/totals/section/hint tokens + `winRateWinPctClass`
- [`toneClasses.ts`](../src/components/strategy/winRate/toneClasses.ts) — `profitLossToneClass` / `winPctToneClass` (no module CSS)
- [`WinRatePage.tsx`](../src/pages/strategy/WinRatePage.tsx) — `PageShell padding="default"`, `SegmentControl` Since, elevated filter `Card`
- [`WinRateStructureCard.tsx`](../src/components/strategy/winRate/WinRateStructureCard.tsx) + [`WinRateTotalsCard.tsx`](../src/components/strategy/winRate/WinRateTotalsCard.tsx) — `Card variant="elevated"`, band components
- Delete `winRate.module.css`

**CI**

- No `winRate.module.css` under `src/components/strategy/winRate/`
- No `winRate.module.css` imports under `winRate/**`
- No `kpiValuePositive` / `kpiValueNegative` / `pnl-positive` under `winRate/**`
- No legacy strings: `strategy-win-rate-`

**Acceptance**

- Since segment switches data refresh
- All structures totals horizontal panel (Trades | P&amp;L | Underlying | Averages)
- Per-structure cards with four bands; Win % three-color rule; Total loss $0 when loss_trades=0
- Click structure card → Instances with structureFilter
- Legacy API unchanged

---

## Phase 4.11 — Strategy Structures (done)

**Scope**

- [`structuresUi.ts`](../src/components/strategy/structures/structuresUi.ts) — active summary, toolbar, table column tokens
- [`structuresFormUi.ts`](../src/components/strategy/structures/structuresFormUi.ts) — wizard step, template picker, form panel tokens
- [`StructuresPage.tsx`](../src/pages/strategy/StructuresPage.tsx) — `PageShell padding="default"`, three elevated `Card`s, `SegmentControl` availability
- [`StructuresTable.tsx`](../src/components/strategy/StructuresTable.tsx) — `DenseDataTable` + `IconActionButton`
- [`StrategyHistorySection.tsx`](../src/components/strategy/StrategyHistorySection.tsx) — `DenseDataTable`
- [`StructureFormSheet.tsx`](../src/components/strategy/StructureFormSheet.tsx) — `NestedDenseTable` legs, form tokens, no `dangerTextBtnClass`

**CI**

- No `@/components/ui/table` in `StructuresPage.tsx`, `StructuresTable.tsx`, `StrategyHistorySection.tsx`, `StructureFormSheet.tsx`
- No `dangerTextBtnClass` in `StructureFormSheet.tsx`
- No legacy strings: `structure-active-filter-`, `structure-sheet-`, `structure-wizard-`

**Acceptance**

- Current active summary; availability + dim_structure filters; list switches and Edit/Copy
- Strategy history filter + table
- Create/edit/copy wizard and form sheet unchanged on Legacy API

---

## Phase 4.12 — Strategy Opportunities (done)

**Scope**

- [`opportunitiesUi.ts`](../src/components/strategy/opportunities/opportunitiesUi.ts) — toolbar, table column tokens
- [`opportunitiesFormUi.ts`](../src/components/strategy/opportunities/opportunitiesFormUi.ts) — form field, symbol chip, watchlist, condition row tokens
- [`OpportunitiesPage.tsx`](../src/pages/strategy/OpportunitiesPage.tsx) — `PageShell padding="default"`, single elevated `Card`, `SegmentControl` availability
- [`OpportunitiesTable.tsx`](../src/components/strategy/OpportunitiesTable.tsx) — `DenseDataTable` + `IconActionButton`
- [`OpportunityFormModal.tsx`](../src/components/strategy/OpportunityFormModal.tsx) — Scope `SegmentControl`, Available `Switch`, no `dangerTextBtnClass`

**CI**

- No `@/components/ui/table` in `OpportunitiesPage.tsx`, `OpportunitiesTable.tsx`, `OpportunityFormModal.tsx`
- No `dangerTextBtnClass` in `OpportunityFormModal.tsx`
- No legacy strings: `opp-table-`, `opp-form-`, `opp-list-`, `structure-active-filter-` under opportunities domain

**Acceptance**

- Availability filter + Available Switch + error Dialog
- Edit / Copy / Create modal; Copy prefill; Save logic unchanged on Legacy API
- Option Screener → same modal prefill path still works

---

## Phase 4.14 — Strategy Allocations (done)

**Scope**

- [`allocationsUi.ts`](../src/components/strategy/allocations/allocationsUi.ts) — active summary, toolbar, table column tokens
- [`allocationsFormUi.ts`](../src/components/strategy/allocations/allocationsFormUi.ts) — form field, checklist, limits grid tokens
- [`AllocationsPage.tsx`](../src/pages/strategy/AllocationsPage.tsx) — `PageShell padding="default"`, Current active Card + elevated list Card, `SegmentControl` availability
- [`AllocationsTable.tsx`](../src/components/strategy/AllocationsTable.tsx) — `DenseDataTable` + dual Switch + `IconActionButton` Edit
- [`AllocationFormModal.tsx`](../src/components/strategy/AllocationFormModal.tsx) — opportunities checklist + limits grid tokens

**CI**

- No `@/components/ui/table` in `AllocationsPage.tsx`, `AllocationsTable.tsx`, `AllocationFormModal.tsx`
- No legacy strings: `gates-form-`, `data-table`, `btn-set-active`, `btn-manage` under allocations domain

**Acceptance**

- Current active summary from monitor status (not `is_active` filter banner)
- Availability filter + Available Switch + In use Switch (`setActiveAllocation`) + error Alert
- Create / Edit modal; opportunities multi-select; gate safety Select; limits save unchanged on Legacy API

---

## Phase 4.13 — Strategy Gates (done)

**Scope**

- [`gatesUi.ts`](../src/components/strategy/gates/gatesUi.ts) — active summary, toolbar, table column tokens
- [`gatesFormUi.ts`](../src/components/strategy/gates/gatesFormUi.ts) — sheet scroll, form panel/grid tokens
- [`GatesPage.tsx`](../src/pages/strategy/GatesPage.tsx) — `PageShell padding="default"`, dual elevated `Card`, Set Active status feedback
- [`GatesTable.tsx`](../src/components/strategy/gates/GatesTable.tsx) — `DenseDataTable` + `IconActionButton` + `DenseTag`
- [`GateSafetyFormSheet.tsx`](../src/components/strategy/gates/GateSafetyFormSheet.tsx) — extracted sheet form; no `dangerGhostBtnClass`

**CI**

- No `@/components/ui/table` in `GatesPage.tsx`, `gates/GatesTable.tsx`, `gates/GateSafetyFormSheet.tsx`
- No `dangerGhostBtnClass` / `dangerTextBtnClass` under gates domain
- No legacy strings: `gates-form-`, `gate-safety-table-`, `strategy-gates-` under gates domain

**Acceptance**

- Active summary (Gate Safety + Allocation); list load / empty / error
- Create / Edit / Copy sheet; Copy `(copy)` naming; Save payload unchanged on Legacy API
- Set Active updates daemon gate; status flash; active row Star disabled
- Earnings dates add/remove in sheet

---

## Phase 4.15 — Strategy Option Category (done)

**Scope**

- [`optionCategoryUi.ts`](../src/pages/strategy/optionCategory/optionCategoryUi.ts) — sidebar, section shell, save feedback
- [`optionCategoryFormUi.ts`](../src/pages/strategy/optionCategory/optionCategoryFormUi.ts) — compact inputs/selects, dim grid, inline table cells
- [`OptionCategoryPage.tsx`](../src/pages/strategy/OptionCategoryPage.tsx) — `PageShell padding="none"`, dual-column master-detail orchestrator
- Split: `OptionCategorySidebar`, `OptionCategoryTemplateInfoSection`, `OptionCategoryLegsSection`, `OptionCategoryMetaTable`, `OptionCategoryCharacteristicsSection`, `OptionCategoryDimensionsDialog`, `OptionCategoryCreateDialog`
- Legs + Meta → `NestedDenseTable`; row remove → `IconActionButton tone="danger"`; template/dim delete → `ConfirmDialog`
- Detail sections → `Card variant="elevated"`; `PageHeader` + `InfoTooltip`

**CI**

- No `@/components/ui/table` in guarded option-category paths
- No `dangerTextBtnClass` under `optionCategory/`
- No `otc-*` / `TemplateMetaEditor` under option category domain

**Acceptance**

- Sidebar search, dim filters, drag reorder (disabled when filter active)
- Template info + six dimensions save; legs/meta inline edit + save; characteristics; dims dialog add/delete
- Structures template picker still reads same API templates

---

## Phase 4.16 — Settings API Health (DONE)

**Scope:** `/settings/api` — `ApiHealthPage.tsx`, `apiHealth/*`, `ServiceTopologyOverview.tsx` (tokens only; schematic CSS allowed exception).

**Deliverables**

- `apiHealthUi.ts` / `apiHealthDetailUi.ts` / `serviceTopologyUi.ts` token layers
- Split monolith → `ApiDocsTable`, `ApiServiceHealthCard`, `ApiDetailKvList`, `ApiCategoryTabContent`, `panels/*`, `ServiceTopologyPanel`, `TabLamp`
- `PageShell padding="default"` + `InfoTooltip`; `SegmentControl size="sm"` detail sub-tabs; elevated `Card` sections
- `check-legacy-css`: no raw `<table` under `apiHealth/` (topology SVG exempt)

**Follow-up:** Phase 4.17 (parity — below).

**Acceptance:** `npm run lint && npm run build && npm run check:legacy-css` pass.

---

## Phase 4.17 — Settings API Health parity (DONE)

**Scope:** `/settings/api` — Legacy overview parity: configured routes, Dev/Prod probes, Shutdown, Architecture log console.

**Deliverables:** `utilizedServices.ts`, `apiHealthEnv.ts`, `apiHealthProbes.ts`, `ApiConfiguredRoutesStrip`, `ApiEnvHealthGrid`, `apiHealthEnvUi.ts`, `post*Shutdown`, `ConfirmDialog` on cards, `ArchitectureLogConsolePanel`.

**Acceptance:** Services Overview + shutdown + log console; 4.16 Reactor Map/tabs retained. CI green on Phase 4.17 paths.

---

## Phase 4.18 — Settings Socket Services (DONE)

**Scope:** `/settings/socket` — `SocketPage.tsx`, `pages/settings/socket/*` (shared `IngestServicesTable` for Daemon `variant="daemon"`).

**Deliverables**

- [`socketIngestUi.ts`](../src/pages/settings/socket/socketIngestUi.ts) — section/table/badge/lamp/auth tokens
- Split cells → [`IngestConnectionCell.tsx`](../src/pages/settings/socket/IngestConnectionCell.tsx), controls → [`socketIngestControls.tsx`](../src/pages/settings/socket/socketIngestControls.tsx)
- `PageShell padding="default"` + `PageHeader titleSize="large"` + `InfoTooltip`; elevated `Card` sections (conflict alert, Local Agent, Ingest, Logs)
- [`IngestServicesTable.tsx`](../src/pages/settings/socket/IngestServicesTable.tsx) — `DenseDataTable` + `DenseTableSubheadRow` + `IconActionButton` row actions
- `check-legacy-css`: no `@/components/ui/table` under `pages/settings/socket/**`

**Out of scope:** Celery/Daemon page shells (except `IngestServicesTable` reuse); LogConsole internals; Owner Legacy 并排业务验收（MIGRATION WIP 不变）。

**Acceptance:** `npm run lint && npm run build && npm run check:legacy-css` pass; Daemon ingest table `variant="daemon"` visual regression.

---

## Phase 4.19 — Operations Daemon (DONE)

**Scope:** `/operations/daemon`, `/settings/daemon` — `DaemonStatusPage.tsx`, `settings/daemon/*`, optional `DaemonAppPage.tsx`.

**Deliverables**

- [`daemonUi.ts`](../src/pages/settings/daemon/daemonUi.ts) / [`daemonFormUi.ts`](../src/pages/settings/daemon/daemonFormUi.ts) token layers
- [`useDaemonEngineOps.ts`](../src/pages/settings/daemon/useDaemonEngineOps.ts) — shared Ops hook; rollup lamp on `PageHeader`
- `PageShell padding="default"` + `PageHeader` + `InfoTooltip` + 4× `Card variant="elevated"`
- [`RecentOperationsTable.tsx`](../src/pages/settings/daemon/RecentOperationsTable.tsx) — `DenseDataTable` + `DAEMON_OPS_COL_WIDTHS` + `DenseTag` Side
- Strategy / Account Sync cards — `DenseTag` connections, `daemonLampTextClass`, no shadcn `Badge` lamp colors

**Out of scope / dependency:** [`IngestServicesTable.tsx`](../src/pages/settings/socket/IngestServicesTable.tsx) Dense migration — **Phase 4.18** (Socket); Daemon Process control card reuses `variant="daemon"` only.

**Logs:** Page-in console not restored; use global LogPanel → Daemon sources (Strategy Trading + Account Sync).

**CI**

- No `@/components/ui/table` in `DaemonStatusPage.tsx`, `daemon/**`, `RecentOperationsTable.tsx`
- No `pnlClass` / inline lamp hex in `daemon/**` (except `daemonUi.ts` tokens)
- No legacy strings `daemon-group-`, `table-operations`, `ib-connection-table` under daemon paths

**Acceptance:** `npm run lint && npm run build && npm run check:legacy-css` pass; Owner Legacy `#settings-daemon` side-by-side.

---

## Phase 4.20 — Operations Celery (DONE)

**Scope:** `/operations/celery` — `CeleryPage.tsx`, `operations/celery/*` (8× shadcn Table → `DenseDataTable`).

**Deliverables**

- [`celeryUi.ts`](../src/pages/operations/celery/celeryUi.ts) (merged `celeryLayoutClasses`); `CelerySectionCard` + Beat card `Card variant="elevated"`
- `PageShell padding="default"` + `PageHeader titleSize="large"`
- 8 tables: Queue Summary, Massive/Bars job queues (split [`jobQueues/*`](../src/pages/operations/celery/jobQueues/)), Worker Instances, Worker Situation, Beat Schedule, Scheduled Jobs, Registered Tasks, Run Massive matrix
- Job Queues status/limit → `SegmentControl size="sm"`
- **Exception:** [`CeleryQueueIconButton`](../src/pages/operations/celery/CeleryQueueIconButton.tsx) (semantic Celery ops toolbar — documented in `DENSE_UI.md`)
- Terminal panel CSS remains scoped exception under `console/CeleryTerminalPanel.tsx`
- `check-legacy-css`: no `@/components/ui/table` under `operations/celery/`

**Acceptance:** `npm run lint && npm run build && npm run check:legacy-css` pass.

---

## Phase 4 — Ops / Research / Settings grids

Migrate remaining shadcn `Table` usages in Celery, Strategy admin, Screener, etc. Prioritize high-traffic monitoring pages.

Track remaining count:

```bash
grep -rl "@/components/ui/table" src --include='*.tsx' | wc -l
```

---

## Phase 5 — Module CSS shrink (DONE 2026-06-03)

**Deleted (emptied by prior Dense phases, now removed):**
- `src/pages/strategy/InstancesPage.module.css` (was 0 lines)
- `src/pages/strategy/WinRatePage.module.css` (was 0 lines)

**Budgets tightened (monotonically):**

| Guard | Old | New | Actual |
|-------|-----|-----|--------|
| `live.module.css` | 120 | 90 | 86 |
| `PositionsChartsSection + DonutChart` | 400 | 360 | 352 |
| `riskProfile.module.css` | 450 | 425 | 414 |

**New guards added:** Phase 5 block asserts `InstancesPage.module.css` and `WinRatePage.module.css` must not re-appear.

**`*.module.css` count:** 25 (baseline 2026-06-01) → 16 (Phase 4.x deletions) → **16** (Phase 5: 2 more deleted, now 16).

**Acceptance:** `npm run lint && npm run build && npm run check:legacy-css` pass ✅
