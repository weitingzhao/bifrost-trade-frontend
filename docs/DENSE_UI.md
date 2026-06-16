# Dense UI — Data-Display Design System

Reusable styling for data-heavy monitoring pages (Positions, Trade Ledger, Performance, Live).

**Parent doc:** [TECH_STACK.md](./TECH_STACK.md) (locked stack + governance). In-app: Settings → Configuration → Tech Stack.

**Living visual contract:** Settings → Configuration → **UI Design System** (`/settings/ui-design-system`) — live samples of every rule below; validate new pages against it.

## Layer stack

| Layer | Location | Role |
|-------|----------|------|
| Tokens | `src/index.css` (`--text-dense`, `--table-cell-*`, `--color-profit/loss/unrealized`, `--color-entity-*`) | Typography, cell spacing, business semantics |
| Layout | `src/components/layout/` | `PageShell`, `PageHeader`, `PageSection` |
| Data display | `src/components/data-display/` | Tables, PnL, segments, icon actions |
| Domain | `src/components/positions/`, etc. | Business columns and interactions |

## Business semantic colors (site-wide, fixed)

Three independent taxonomies — do not mix tokens across them. Living contract: Settings → **UI Design System** §2 Entity · §3 Option Category · §4 Position Category.

### Entity (asset class)

| Concept | Token | Utility | Accessor |
|---------|-------|---------|----------|
| Stock | `--color-entity-symbol` | `text-entity-symbol` | `DenseLinkButton variant="stock"` / read-only `strong` + `text-entity-symbol` in identity columns |
| Option contract | `--color-entity-option` | `text-entity-option` | `DenseLinkButton variant="option"` |
| Fixed Income | `--color-entity-fixed-income` *(planned)* | `text-entity-fixed-income` *(planned)* | Tab / legend / group title — entity color, not Position Category purple |
| Cash-like | `--color-entity-cash-like` *(planned)* | `text-entity-cash-like` *(planned)* | Tab / legend / group title — entity color, not Position Category purple |

### Option Category (strategy domain)

| Concept | Token | Utility | Accessor |
|---------|-------|---------|----------|
| Strategy | `--color-entity-strategy` | `text-entity-strategy` | `DenseTag` / `DenseLinkButton variant="strategy"` |
| Instance | `--color-entity-instance` | `text-entity-instance` | `DenseTag` / `DenseLinkButton variant="instance"` |
| Opportunity | `--color-option-category-opportunity` *(planned)* | *(planned)* | Planned `DenseTag` / `DenseLinkButton` variant |
| Structure | `--color-option-category-structure` *(planned)* | *(planned)* | Planned `DenseTag` / `DenseLinkButton` variant |

Option contract strings remain **Option Entity** — never render as Option Category tags.

### Position Category (portfolio taxonomy)

| Concept | Token | Accessor |
|---------|-------|----------|
| watchlist / portfolio (fixed labels) + user names (Fix Income, Tech, Watching…) | `--color-entity-category` | Cell/filter: `DenseTag` / `DenseTagButton` + `denseEntityFilterChipClass` · **Group header row**: `GroupHeaderRow variant="category"` (purple text, `bg-secondary` band, `border-y` — separates group from symbol rows; no pill) |

### PnL

| Concept | Token | Utility | Accessor |
|---------|-------|---------|----------|
| Realized profit | `--color-profit` | `text-profit` | `pnlColorClass(v)` / `PnlCell` / `InlinePnl` |
| Realized loss | `--color-loss` | `text-loss` | `pnlColorClass(v)` |
| Unrealized PnL (always yellow) | `--color-unrealized` | `text-unrealized` | `unrealizedPnlColorClass(v)` |

Pages must use the accessor column — never raw palette classes (`text-emerald-*`, `text-red-*`, `text-sky-*`) or inline hex. Guarded by a ratchet rule in `scripts/check-legacy-css.sh` (`RAW_PNL_PALETTE_BASELINE`).

### Page canvas (three surfaces)

1. **Canvas** — `PageShell` with `bg-card` (same as sidebar)
2. **Elevated** — `Card variant="elevated"` or `bg-secondary` for KPI bars, filters, chart panels
3. **Inset** — `bg-background` for nested chart wells

## Dense table usage

```tsx
import {
  DenseDataTable,
  DenseTableHeader,
  DenseTableBody,
  DenseTableHeadRow,
  DenseTableHead,
  DenseTableRow,
  DenseTableCell,
  PnlCell,
  DenseLinkButton,
  denseTable,
} from '@/components/data-display'

<DenseDataTable>
  <DenseTableHeader>
    <DenseTableHeadRow>
      <DenseTableHead>Symbol</DenseTableHead>
      <DenseTableHead align="right">PnL</DenseTableHead>
    </DenseTableHeadRow>
  </DenseTableHeader>
  <DenseTableBody>
    <DenseTableRow>
      <DenseTableCell>
        <DenseLinkButton label="NVDA" onClick={...} ariaLabel="..." variant="stock" />
      </DenseTableCell>
      <DenseTableCell align="right">
        <PnlCell dollar={pnl} pct={pct} formatDollar={fmtUsd} formatPct={fmtSignedPct} />
      </DenseTableCell>
    </DenseTableRow>
  </DenseTableBody>
</DenseDataTable>
```

**Reference implementation:** [StocksTab.tsx](../src/components/positions/StocksTab.tsx) (also used by Fixed Income and Cash-like tabs).

### PostgreSQL sync jobs sheet

Session-tracked Massive/Celery jobs on Research pages use a wide right `Sheet` with a seven-column `DenseDataTable` (time, kind, status, dedup, job id, summary, JSON details). Reference: [TickerReferenceJobsSheet.tsx](../src/components/massive/TickerReferenceJobsSheet.tsx); labels/summaries from [stockReferenceJobHelpers.ts](../src/utils/massive/stockReferenceJobHelpers.ts).

### Stock Data Readiness runbook steps

Unified snapshot (Step 2) and related actions use lime primary buttons (`bg-sidebar-primary`), mono success logs, and the instrument-type breakdown table in [SnapshotByTypeBreakdown.tsx](../src/pages/research/stockDataReadiness/SnapshotByTypeBreakdown.tsx) with tokens in [stockDataReadinessStepUi.ts](../src/pages/research/stockDataReadiness/stockDataReadinessStepUi.ts) (Legacy `sdp-btn-primary` / `sdp-snap-by-type-*` parity). Runbook step tabs use `runbookTabIndexClass` for Legacy `sdp-runbook-tab--{status}` index coloring; after any ingest, `refreshReadinessBoard()` awaits summary refetch so all stages update together.

### Fixed columns (expand / collapse)

`DenseDataTable` uses **`table-layout: fixed`** (`denseTable.table`) so column widths stay stable when detail rows are shown or hidden.

Tables with expandable child rows **must** define a `<colgroup>` with explicit column widths (see [OptionsTab.tsx](../src/components/positions/OptionsTab.tsx)). Detail rows must occupy the **same column grid** as parent rows (use `colSpan` where the label spans multiple columns — never skip a column slot).

Long labels in **non-identity** detail rows: clip with `denseTable.detailCellClip` + `denseTable.detailRowLabel` (truncate + `title` tooltip). Do not rely on wide cell content to set column width.

### Identity columns — full text, no ellipsis

**Stock**, **Contract** (option contract string), **Strategy** name, and **Instance** label must never show `…` in grids. Prefer wrapping inside the cell over truncation. Stock/Option are Entity (§2); Strategy/Instance are Option Category (§3).

| Layer | Class / primitive |
|-------|-------------------|
| Cell | `denseTableEntityCell` / `denseTable.entityCell` on `DenseTableCell` |
| Link | `denseTableEntityLink` on `DenseLinkButton` (`variant="stock"` / `"option"` / `"strategy"` / `"instance"`) |
| Tags | Parent cell uses `entityCell`; inner `flex flex-wrap gap-1` for multiple `DenseTag`s |

Never use `truncate`, `line-clamp-*`, or `detailCellClip` on identity columns. Reference: [UiDesignSystemPage.tsx](../src/pages/settings/UiDesignSystemPage.tsx) §4, [OptionsTab.tsx](../src/components/positions/OptionsTab.tsx) Contract column.

```tsx
<DenseTableDetailRow>
  <DenseTableCell />
  <DenseTableCell colSpan={2} className={cn('pl-6', denseTable.detailCellClip)}>
    <div className={denseTable.detailRowLabel} title="Full label for tooltip">
      ↳ [Final] exec #123 · strategy #61
    </div>
  </DenseTableCell>
  {/* one cell per remaining column, including empty placeholders */}
</DenseTableDetailRow>
```

## Trade Ledger

Content tables (Instance, Options, Stocks / Fixed Income / Cash-like) use the same dense primitives as Positions:

| Pattern | Reference |
|---------|-----------|
| Collapsible opportunity / instance cards | [LedgerStrategyGroup.tsx](../src/pages/portfolio/ledger/LedgerStrategyGroup.tsx), [LedgerInstanceCard.tsx](../src/pages/portfolio/ledger/LedgerInstanceCard.tsx) |
| Shared option group table (expand + fill rows) | [OptGroupsTable.tsx](../src/pages/portfolio/ledger/OptGroupsTable.tsx), [OptGroupRow.tsx](../src/pages/portfolio/ledger/OptGroupRow.tsx) |
| Options Closed / Open main views | [LedgerClosedOptionSection.tsx](../src/pages/portfolio/ledger/LedgerClosedOptionSection.tsx), [LedgerOpenOptionSection.tsx](../src/pages/portfolio/ledger/LedgerOpenOptionSection.tsx) |
| Stocks position grouping + fills | [LedgerStkTable.tsx](../src/pages/portfolio/ledger/LedgerStkTable.tsx) |
| Detail subhead / fill rows | `DenseTableSubheadRow`, `DenseTableDetailRow` in [DenseTable.tsx](../src/components/data-display/DenseTable.tsx) |
| Pagination (page-local) | [ledgerPaginationClasses.tsx](../src/pages/portfolio/ledger/ledgerPaginationClasses.tsx) |
| Page shell + split toolbar | [ledgerShellUi.ts](../src/pages/portfolio/ledger/ledgerShellUi.ts), [LedgerTabToolbar.tsx](../src/pages/portfolio/ledger/LedgerTabToolbar.tsx) |
| Summary period KPI strip | [ledgerSummaryUi.ts](../src/pages/portfolio/ledger/ledgerSummaryUi.ts), [LedgerSummarySection.tsx](../src/pages/portfolio/ledger/LedgerSummarySection.tsx) |
| Filter bar bubbles | [@/lib/ledgerUi.ts](../src/lib/ledgerUi.ts), [LedgerFilterBar.tsx](../src/pages/portfolio/ledger/LedgerFilterBar.tsx) |
| Tab filter segments | `SegmentControl` in [LedgerTabFilters.tsx](../src/pages/portfolio/ledger/LedgerTabFilters.tsx) |
| Instance Open link | `DenseTag variant="success"` in [LedgerStrategyGroup.tsx](../src/pages/portfolio/ledger/LedgerStrategyGroup.tsx) |

No `ledgerStyles.module.css` — toolbar/summary use Tailwind token files above.

## Transfer & Pay

| Pattern | Reference |
|---------|-----------|
| Page shell + header | [transferPayUi.ts](../src/pages/portfolio/transferPay/transferPayUi.ts), [TransferPayPage.tsx](../src/pages/portfolio/TransferPayPage.tsx) |
| Toolbar (account / type / pagination) | [TransferPayToolbar.tsx](../src/pages/portfolio/transferPay/TransferPayToolbar.tsx) — `SegmentControl` + `segmentButtonClass` multi-select |
| Cash transactions table | [TransferPayTransactionsTable.tsx](../src/pages/portfolio/transferPay/TransferPayTransactionsTable.tsx) |
| Summary by period table | [TransferPaySummaryTable.tsx](../src/pages/portfolio/transferPay/TransferPaySummaryTable.tsx) |
| `% vs prev` subline | [TransferPayChangeVsPrev.tsx](../src/pages/portfolio/transferPay/TransferPayChangeVsPrev.tsx) |

No `transferPay.module.css` — use `InlinePnl` / `denseTableNumCell` for amounts.

## Stock Screener

| Pattern | Reference |
|---------|-----------|
| Page layout grid + elevated filter cards | [stockScreenerUi.ts](../src/pages/research/stockScreener/stockScreenerUi.ts), [StockScreenerPage.tsx](../src/pages/research/StockScreenerPage.tsx) |
| Segment hue map (tech/fund/tier/ext) | [segmentStyles.ts](../src/pages/research/stockScreener/segmentStyles.ts) |
| Filter card shell + checkbox chips | [ScreenerCard.tsx](../src/pages/research/stockScreener/ScreenerCard.tsx), [ScreenerConditionChip.tsx](../src/pages/research/stockScreener/ScreenerConditionChip.tsx) |
| Condition / tier / dist filter blocks | [ConditionChipGroup.tsx](../src/pages/research/stockScreener/ConditionChipGroup.tsx), [TierFilterCard.tsx](../src/pages/research/stockScreener/TierFilterCard.tsx), [DistFunnelCard.tsx](../src/pages/research/stockScreener/DistFunnelCard.tsx) |
| Readiness results table | [ReadinessResultsTable.tsx](../src/pages/research/stockScreener/ReadinessResultsTable.tsx) — `DenseDataTable` + sortable head + `DenseLinkButton` |

No `stock-screener.module.css` — filter chips stay page-local (checkbox + hue accent), not `SegmentControl`.

## Option Screener

| Pattern | Reference |
|---------|-----------|
| Page shell + filter panel | [optionScreenerUi.ts](../src/pages/research/optionScreener/optionScreenerUi.ts), [OptionScreenerPage.tsx](../src/pages/research/optionScreener/OptionScreenerPage.tsx) |
| Structure type + numeric filters | [OptionScreenerFilterPanel.tsx](../src/pages/research/optionScreener/OptionScreenerFilterPanel.tsx) — `SegmentControl` |
| Symbol group + nested contracts | [OptionScreenerSymbolGroup.tsx](../src/pages/research/optionScreener/OptionScreenerSymbolGroup.tsx) — `CollapsibleGroup` |
| Contract results table | [OptionScreenerContractsTable.tsx](../src/pages/research/optionScreener/OptionScreenerContractsTable.tsx) — `DenseDataTable` + `DenseTag` + `IconActionButton` |
| Rating / risk badges | [optionScreenerTags.ts](../src/pages/research/optionScreener/optionScreenerTags.ts) |

No raw `<table>` — re-export entry: [ScreenerPage.tsx](../src/pages/research/ScreenerPage.tsx).

## Stock Watchlist

| Pattern | Reference |
|---------|-----------|
| Workflow stepper + page tokens | [watchlistUi.ts](../src/pages/research/watchlist/watchlistUi.ts), [WorkflowStepper.tsx](../src/pages/research/watchlist/WorkflowStepper.tsx) |
| Stock / option watchlist tables | [WatchlistStockTable.tsx](../src/pages/research/watchlist/WatchlistStockTable.tsx), [WatchlistOptionTable.tsx](../src/pages/research/watchlist/WatchlistOptionTable.tsx) — `DenseDataTable` + `DenseLinkButton` + `DenseTagButton` + `IconActionButton` |
| Portfolio risk panel | [PortfolioRiskPower.tsx](../src/pages/research/watchlist/PortfolioRiskPower.tsx) — `CollapsibleGroup` + cash pie tokens + [WatchlistMetricTable.tsx](../src/pages/research/watchlist/WatchlistMetricTable.tsx) |
| Sizing cap table | [WatchlistSizingCapTable.tsx](../src/pages/research/watchlist/WatchlistSizingCapTable.tsx) |
| Positions sub-tab | [PositionsTab.tsx](../src/pages/research/watchlist/PositionsTab.tsx) — `SegmentControl` |

No `watchlist.module.css` — quote cells use `watchlistQuoteLastClass` / `watchlistQuoteBaClass`; pie rings keep inline `conic-gradient`.

## Option Discovery

| Pattern | Reference |
|---------|-----------|
| Page root + scope tokens | [discoveryUi.ts](../src/pages/research/discovery/discoveryUi.ts) — re-exports `discoveryRootClass` from [discoveryCharts.module.css](../src/pages/research/discoveryCharts.module.css) |
| Component tokens (KV, tradability, exec chips) | [optionDiscoveryUi.ts](../src/components/optionDiscovery/optionDiscoveryUi.ts) |
| Chain quotes (sticky hybrid) | [DiscoveryChainQuotesTable.tsx](../src/components/optionDiscovery/DiscoveryChainQuotesTable.tsx) |
| Strike ladder | [DiscoveryStrikeLadderTable.tsx](../src/components/optionDiscovery/DiscoveryStrikeLadderTable.tsx) |
| IV term sheet | [DiscoveryIvTermSheetTable.tsx](../src/components/optionDiscovery/DiscoveryIvTermSheetTable.tsx) |
| Compare drawer | [DiscoveryCompareTable.tsx](../src/components/optionDiscovery/DiscoveryCompareTable.tsx) |
| Contract Greeks / scenario | [DiscoveryContractGreeksTable.tsx](../src/components/optionDiscovery/DiscoveryContractGreeksTable.tsx), [DiscoveryScenarioTable.tsx](../src/components/optionDiscovery/DiscoveryScenarioTable.tsx) |
| Side / Greeks / period segments | `SegmentControl` in [DiscoverySideToggle.tsx](../src/components/optionDiscovery/DiscoverySideToggle.tsx), quotes, IV term, contract detail, chart panel |

**Chart geometry exception:** keep [discoveryCharts.module.css](../src/pages/research/discoveryCharts.module.css) for `od-chart-expand-*`, SVG sizing, and `--od-max-pain-*` tokens only. No `optionContractDetail.module.css`.

## IV & Greeks (Research)

| Pattern | Reference |
|---------|-----------|
| Page tokens | [greeksUi.ts](../src/pages/research/greeks/greeksUi.ts) — controls, info bar, empty/loading hints, IV/Delta cell classes, tooltip tokens |
| History table | [GreeksHistoryTable.tsx](../src/pages/research/greeks/GreeksHistoryTable.tsx) — `DenseDataTable` + `DenseTableSubheadRow` expiry groups + `DenseTag` C/P + DTE pill |
| BS tooltip | [GreeksCalcTooltip.tsx](../src/pages/research/greeks/GreeksCalcTooltip.tsx) — portal tooltip; section/KV/compare grid via `greeksUi` tokens |
| Format helpers | [greeksFormat.ts](../src/pages/research/greeks/greeksFormat.ts) — fmt/groupBy/dte only (no color classes) |
| C/P filter | `SegmentControl` on [GreeksPage.tsx](../src/pages/research/GreeksPage.tsx) |

**IV semantic colors** (`greeksIvCellClass`): IV &lt; 30% green, ≥ 80% amber — not PnL; do not use `pnlColorClass`.

**Delta ATM highlight** (`greeksDeltaCellClass`): |Δ| in [0.4, 0.6] → `text-primary font-medium`.

No `*.module.css` under `src/pages/research/greeks/`.

## Strategy Instances (List)

| Pattern | Reference |
|---------|-----------|
| Page + filter tokens | [instancesUi.ts](../src/components/strategy/instances/instancesUi.ts) |
| List page shell | [InstancesPage.tsx](../src/pages/strategy/InstancesPage.tsx) — `PageShell padding="default"`, elevated `Card` for Account/Strategy controls |
| Filter panel | [InstanceListFilters.tsx](../src/components/strategy/InstanceListFilters.tsx) — `SegmentControl` (Status/Since/Type) + toggle bubbles (Structure/Symbol/Expiry) |
| Toolbar | [InstanceListToolbar.tsx](../src/components/strategy/InstanceListToolbar.tsx) — `SegmentControl` (Accordion/Multi) + outline buttons for expand/collapse |
| Grouped metrics table | [InstancesGroupedTable.tsx](../src/components/strategy/InstancesGroupedTable.tsx) — two-tier `DenseDataTable` header, `DenseTableSubheadRow` symbol groups, `DenseTag` status/structure, `IconActionButton` row actions, `pnlColorClass` metrics |

No `instancesTable.module.css` or `instancesFilters.module.css`. Compare split layout remains in [instancesLayout.module.css](../src/components/strategy/instances/instancesLayout.module.css) until Phase 4.9 (detail sidebar).

## Strategy Win Rate

KPI card grid exception — no `DenseDataTable` on this page.

| Pattern | Reference |
|---------|-----------|
| Page + card tokens | [winRateUi.ts](../src/components/strategy/winRate/winRateUi.ts) |
| List page shell | [WinRatePage.tsx](../src/pages/strategy/WinRatePage.tsx) — `PageShell padding="default"`, `SegmentControl` Since filter in elevated `Card` |
| Structure cards | [WinRateStructureCard.tsx](../src/components/strategy/winRate/WinRateStructureCard.tsx) — `Card variant="elevated"`, clickable drill to Instances |
| All-structures totals | [WinRateTotalsCard.tsx](../src/components/strategy/winRate/WinRateTotalsCard.tsx) — horizontal four-band panel with responsive stack at `max-md` |
| PnL coloring | [toneClasses.ts](../src/components/strategy/winRate/toneClasses.ts) — `profitLossToneClass` for dollar/% metrics |
| Win % coloring | `winRateWinPctClass(total, wins)` in `winRateUi.ts` — strictly &gt;50% green, &lt;50% red; not `pnlColorClass` |

No `winRate.module.css` under `src/components/strategy/winRate/`.

## Strategy Structures

| Pattern | Reference |
|---------|-----------|
| Page + table tokens | [structuresUi.ts](../src/components/strategy/structures/structuresUi.ts) |
| Form sheet tokens | [structuresFormUi.ts](../src/components/strategy/structures/structuresFormUi.ts) |
| List page shell | [StructuresPage.tsx](../src/pages/strategy/StructuresPage.tsx) — `PageShell padding="default"`, three elevated `Card` sections |
| Structure list table | [StructuresTable.tsx](../src/components/strategy/StructuresTable.tsx) — `DenseDataTable`, `IconActionButton` Edit/Copy, centered `Switch` columns |
| History table | [StrategyHistorySection.tsx](../src/components/strategy/StrategyHistorySection.tsx) — `DenseDataTable` |
| Availability filter | `SegmentControl` on StructuresPage (All / Available / Unavailable) |
| Type filter | shadcn `Tabs` for dynamic `dim_structure` values (**tabs exception** — too many options for SegmentControl) |
| Form legs table | [StructureFormSheet.tsx](../src/components/strategy/StructureFormSheet.tsx) — `NestedDenseTable`; constraint remove → `IconActionButton tone="danger"` |

No `@/components/ui/table` under Structures list/history/form legs paths guarded in CI.

## Strategy Opportunities

| Pattern | Reference |
|---------|-----------|
| Page + table tokens | [opportunitiesUi.ts](../src/components/strategy/opportunities/opportunitiesUi.ts) |
| Form modal tokens | [opportunitiesFormUi.ts](../src/components/strategy/opportunities/opportunitiesFormUi.ts) |
| List page shell | [OpportunitiesPage.tsx](../src/pages/strategy/OpportunitiesPage.tsx) — `PageShell padding="default"`, single elevated `Card` |
| Opportunity list table | [OpportunitiesTable.tsx](../src/components/strategy/OpportunitiesTable.tsx) — `DenseDataTable`, `IconActionButton` Edit/Copy, centered `Switch` |
| Availability filter | `SegmentControl` on OpportunitiesPage (All / Available / Unavailable) |
| Create/edit modal | [OpportunityFormModal.tsx](../src/components/strategy/OpportunityFormModal.tsx) — Scope `SegmentControl`, Available `Switch`, remove actions → `IconActionButton tone="danger"` |

Also used from Option Screener (prefill path unchanged). No `@/components/ui/table` under Opportunities guarded paths.

## Strategy Gates

| Pattern | Reference |
|---------|-----------|
| Page + table tokens | [gatesUi.ts](../src/components/strategy/gates/gatesUi.ts) |
| Form sheet tokens | [gatesFormUi.ts](../src/components/strategy/gates/gatesFormUi.ts) |
| List page shell | [GatesPage.tsx](../src/pages/strategy/GatesPage.tsx) — `PageShell padding="default"`, two elevated `Card` sections (active summary + list) |
| Gate safety list table | [GatesTable.tsx](../src/components/strategy/gates/GatesTable.tsx) — `DenseDataTable`, `DenseTag` Active/Available, `IconActionButton` Edit/Copy/Set Active |
| Create/edit/copy sheet | [GateSafetyFormSheet.tsx](../src/components/strategy/gates/GateSafetyFormSheet.tsx) — form panel tokens; earnings remove → `IconActionButton tone="danger"` |

No availability `SegmentControl` (Legacy list has no filter). Set Active status flash on GatesPage. No `@/components/ui/table` under Gates guarded paths.

## Strategy Allocations

| Pattern | Reference |
|---------|-----------|
| Page + table tokens | [allocationsUi.ts](../src/components/strategy/allocations/allocationsUi.ts) |
| Form modal tokens | [allocationsFormUi.ts](../src/components/strategy/allocations/allocationsFormUi.ts) |
| List page shell | [AllocationsPage.tsx](../src/pages/strategy/AllocationsPage.tsx) — `PageShell padding="default"`, Current active Card + elevated list `Card` |
| Allocation list table | [AllocationsTable.tsx](../src/components/strategy/AllocationsTable.tsx) — `DenseDataTable`, `DenseTag` opportunity chips, dual `Switch` (Available + In use), `IconActionButton` Edit |
| Current active summary | `useMonitorStatus` → `status.strategy.active.*` grid (Structure / Gate safety / Allocation) |
| Availability filter | `SegmentControl` on AllocationsPage (All / Available / Unavailable) |
| Create/edit modal | [AllocationFormModal.tsx](../src/components/strategy/AllocationFormModal.tsx) — opportunities checklist + limits grid tokens |

In use Switch calls `setActiveAllocation` with companion structure/gate ids from monitor status. No `@/components/ui/table` under Allocations guarded paths.

## Strategy Option Category

| Pattern | Reference |
|---------|-----------|
| Page + layout tokens | [optionCategoryUi.ts](../src/pages/strategy/optionCategory/optionCategoryUi.ts) |
| Form / inline table tokens | [optionCategoryFormUi.ts](../src/pages/strategy/optionCategory/optionCategoryFormUi.ts) |
| Admin master-detail shell | [OptionCategoryPage.tsx](../src/pages/strategy/OptionCategoryPage.tsx) — `PageShell padding="none"`, sidebar + detail scroll |
| Sidebar + dim filters + drag reorder | [OptionCategorySidebar.tsx](../src/pages/strategy/optionCategory/OptionCategorySidebar.tsx) |
| Default legs + meta params | [OptionCategoryLegsSection.tsx](../src/pages/strategy/optionCategory/OptionCategoryLegsSection.tsx), [OptionCategoryMetaTable.tsx](../src/pages/strategy/optionCategory/OptionCategoryMetaTable.tsx) — `NestedDenseTable`, `IconActionButton tone="danger"` |
| Template / dim delete | `ConfirmDialog` on OptionCategoryPage |

No `@/components/ui/table` or `dangerTextBtnClass` under option category guarded paths.

## Settings API Health

| Pattern | Reference |
|---------|-----------|
| Page + table tokens | [apiHealthUi.ts](../src/pages/settings/apiHealth/apiHealthUi.ts) |
| Detail KV tokens | [apiHealthDetailUi.ts](../src/pages/settings/apiHealth/apiHealthDetailUi.ts) |
| Topology schematic tokens | [serviceTopologyUi.ts](../src/components/topology/serviceTopologyUi.ts) |
| List page shell | [ApiHealthPage.tsx](../src/pages/settings/ApiHealthPage.tsx) — `PageShell padding="default"`, `InfoTooltip`, Services Overview + elevated tab `Card` |
| Docs links table | [ApiDocsTable.tsx](../src/pages/settings/apiHealth/ApiDocsTable.tsx) — `DenseDataTable` + `API_DOCS_COL_WIDTHS` |
| Service probe cards | [ApiServiceHealthCard.tsx](../src/pages/settings/apiHealth/ApiServiceHealthCard.tsx) — `Card variant="elevated"` |
| Detail sub-nav | `SegmentControl size="sm"` in `panels/*DetailsPanel.tsx` |
| Reactor Map (global) | [ReactorMapPanel.tsx](../src/components/topology/ReactorMapPanel.tsx) + [ServiceTopologyOverview.tsx](../src/components/topology/ServiceTopologyOverview.tsx) — sidebar footer / TopNav toggle; grouped bays (Edge · Control/Account/Research/Data APIs · Celery · Daemons); schematic CSS **allowed exception** |

No raw `<table` under `src/pages/settings/apiHealth/`. Legacy five Settings API pages merged into this single tabbed route.

### API Health follow-up (Phase 4.17)

| Pattern | Reference |
|---------|-----------|
| Env overview tokens | [apiHealthEnvUi.ts](../src/pages/settings/apiHealth/apiHealthEnvUi.ts) |
| Configured routes strip | [ApiConfiguredRoutesStrip.tsx](../src/pages/settings/apiHealth/ApiConfiguredRoutesStrip.tsx) |
| Dev/Prod health columns | [ApiEnvHealthGrid.tsx](../src/pages/settings/apiHealth/ApiEnvHealthGrid.tsx), [ApiEnvHealthColumn.tsx](../src/pages/settings/apiHealth/ApiEnvHealthColumn.tsx) |
| Utilized services util | [utilizedServices.ts](../src/utils/utilizedServices.ts) |
| Shutdown + confirm | [apiHealthShutdown.ts](../src/pages/settings/apiHealth/apiHealthShutdown.ts), `ConfirmDialog` on [ApiHealthPage.tsx](../src/pages/settings/ApiHealthPage.tsx) |
| Architecture logs | Global **LogPanel** (sidebar footer) — Monitor / Ops / Docs sources; no in-page console on API Health |

## Settings Socket Services

| Pattern | Reference |
|---------|-----------|
| Page + table tokens | [socketIngestUi.ts](../src/pages/settings/socket/socketIngestUi.ts) |
| Page shell | [SocketPage.tsx](../src/pages/settings/SocketPage.tsx) — `PageShell padding="default"`, `PageHeader titleSize="large"` + `InfoTooltip`, elevated `Card` sections |
| Ingest services table | [IngestServicesTable.tsx](../src/pages/settings/socket/IngestServicesTable.tsx) — `DenseDataTable` + `DenseTableSubheadRow` (MASSIVE / IB groups) + dynamic `colgroup` |
| Connection column | [IngestConnectionCell.tsx](../src/pages/settings/socket/IngestConnectionCell.tsx) — Massive age / IB client id / probe badges |
| Row actions | [socketIngestControls.tsx](../src/pages/settings/socket/socketIngestControls.tsx) — `IconActionButton` (Start/Stop/Restart/Reset) |
| Ops auth / host pills | [OpsAuthBar.tsx](../src/pages/settings/socket/OpsAuthBar.tsx), [OpsHostEnvPill.tsx](../src/pages/settings/socket/OpsHostEnvPill.tsx) — shared tokens (Celery/Daemon import same paths) |
| Daemon reuse | `IngestServicesTable variant="daemon"` in [DaemonEngineOpsSection.tsx](../src/pages/settings/daemon/DaemonEngineOpsSection.tsx) |
| Socket / edge logs | Global **LogPanel** → **Socket Services** group (`IB INGESTOR`, `IB ACCT AGENT`, `IB OPERATOR`, `MASSIVE WS`); no in-page console on Socket |

No `@/components/ui/table` under `src/pages/settings/socket/`.

## Operations Daemon

| Pattern | Reference |
|---------|-----------|
| Page + KV/table tokens | [daemonUi.ts](../src/pages/settings/daemon/daemonUi.ts) |
| Heartbeat interval form tokens | [daemonFormUi.ts](../src/pages/settings/daemon/daemonFormUi.ts) |
| Ops shared hook | [useDaemonEngineOps.ts](../src/pages/settings/daemon/useDaemonEngineOps.ts) — rollup lamp on `PageHeader` |
| List page shell | [DaemonStatusPage.tsx](../src/pages/settings/DaemonStatusPage.tsx) — `PageShell padding="default"`, `InfoTooltip`, 4× elevated `Card` |
| Recent ops table | [RecentOperationsTable.tsx](../src/pages/settings/daemon/RecentOperationsTable.tsx) — `DenseDataTable` + `DAEMON_OPS_COL_WIDTHS`; Side → `DenseTag` |
| Strategy / Account Sync cards | [StrategyTradingDaemonCard.tsx](../src/pages/settings/daemon/StrategyTradingDaemonCard.tsx), [AccountSyncDaemonCard.tsx](../src/pages/settings/daemon/AccountSyncDaemonCard.tsx) — `daemonThreeColGridClass`, `DenseTag` Yes/No, `daemonLampTextClass` |
| Process ingest table | [IngestServicesTable.tsx](../src/pages/settings/socket/IngestServicesTable.tsx) `variant="daemon"` in [DaemonEngineOpsSection.tsx](../src/pages/settings/daemon/DaemonEngineOpsSection.tsx) — Dense table owned by **Phase 4.18** Socket |

**Logs:** Not in-page; use global footer **LogPanel → Daemon** (Strategy Trading + Account Sync). Celery card intentionally removed vs Legacy.

No `@/components/ui/table` under `DaemonStatusPage.tsx` or `settings/daemon/**`.

## Operations Celery

| Pattern | Reference |
|---------|-----------|
| Page + table tokens | [celeryUi.ts](../src/pages/operations/celery/celeryUi.ts) |
| Page shell | [CeleryPage.tsx](../src/pages/operations/CeleryPage.tsx) — `PageShell padding="default"`, `PageHeader titleSize="large"` |
| Section cards | [CelerySectionCard.tsx](../src/pages/operations/celery/CelerySectionCard.tsx) — `Card variant="elevated"` |
| Queue summary + 8 data tables | `CeleryQueueSummaryTable`, `jobQueues/*`, `CeleryWorkerInstancesSection`, `CeleryWorkerInstanceSituation`, `CeleryBeatScheduleCard`, `CeleryScheduledJobsSection`, `RegisteredCeleryTasksTable`, `RunMassiveJobMatrixTable` |
| Job status filter | `SegmentControl size="sm"` in [CeleryJobQueuesSection.tsx](../src/pages/operations/celery/CeleryJobQueuesSection.tsx) |
| Celery ops icon toolbar | [CeleryQueueIconButton.tsx](../src/pages/operations/celery/CeleryQueueIconButton.tsx) — **allowed exception** (semantic queue/worker actions; not `IconActionButton`) |
| Terminal streams | [CeleryTerminalPanel.tsx](../src/pages/operations/celery/console/CeleryTerminalPanel.tsx) — scoped CSS exception |

No `@/components/ui/table` under `src/pages/operations/celery/`.

## PnL coloring

Always use `pnlColorClass` from `@/utils/dailyChange` or `InlinePnl` / `PnlCell` from `data-display`. Do not use legacy strings (`pnl-positive`, `pos-opt-pnl-*`).

## Numbers

- Monetary and quantity columns: `font-mono tabular-nums`
- Meta captions: `denseTable.mutedMeta` or `text-[length:var(--text-dense-meta)]`

## Segment controls

Use `SegmentControl` / `IncludeExcludeToggle` from `data-display` instead of custom CSS pill groups.

## Entity · Option Category · Position Category

Three separate design tracks — never mix tokens across them.

Living contract: Settings → UI Design System — **§2 Entity** · **§3 Option Category** · **§4 Position Category**.

**Scoped Fix Prompts:** each section has **Copy Prompt** with site / domain / page scope — use to drive Agent code fixes (see `src/pages/settings/uiDesignSystem/`).

### Entity placement matrix (§2)

| Context | Stock | Option | Fixed Income | Cash-like |
|---------|-------|--------|--------------|-----------|
| Table identity column | `DenseLinkButton variant="stock"` or `strong` + `text-entity-symbol` | `DenseLinkButton variant="option"` | Planned entity link (token pending) | Planned entity link (token pending) |
| Tab / chart legend / group title | `text-entity-symbol` | `text-entity-option` | amber entity color (planned) | violet entity color (planned) |

Never use `DenseTag variant="symbol"` in a grid **Stock** column. `DenseTag variant="symbol"` is for highlight contexts only (e.g. Ledger pill mode), not primary identity columns.

### Option Category matrix (§3)

| Context | Strategy | Instance | Opportunity | Structure |
|---------|----------|----------|-------------|-----------|
| Dedicated identity column | `DenseLinkButton variant="strategy"` | `DenseLinkButton variant="instance"` | Planned (token pending) | Planned (token pending) |
| Composite / tag cell | `DenseTag variant="strategy"` | `DenseTag variant="instance"` | Planned variant | Planned variant |

Never use Option Category tags for option contract strings — those are Option **Entity**.

## Position category (§4 — purple Tag — one language everywhere)

**watchlist** and **portfolio** are two fixed Position Category labels. User-defined names (Fix Income, Tech, Watching…) share the same purple outline pill. Category is a portfolio taxonomy label, not a tradable entity. Use the same outline pill in:

```tsx
import {
  DenseTag,
  DenseTagButton,
  GroupHeaderRow,
  denseEntityFilterChipClass,
} from '@/components/data-display'

// Table Category column
<DenseTableCell>
  <DenseTag variant="category" size="cell">{categoryName}</DenseTag>
</DenseTableCell>

// Table group header — elevated band + top/bottom border; purple label text only (no pill)
<GroupHeaderRow colSpan={n} label={category} variant="category" />

// Page filter — neutral gray when off; entity color when aria-pressed
<DenseTagButton
  variant="category"
  size="pill"
  className={denseEntityFilterChipClass('category', isActive)}
  aria-pressed={isActive}
  onClick={...}
>
  {categoryName}
</DenseTagButton>
```

**Not category:** Host/Secondary account filters, time presets, status toggles → neutral pills or `SegmentControl`, never `entity-category` purple.

**Reference:** [FilterPillBar.tsx](../src/pages/market/live/FilterPillBar.tsx) · [LedgerStkTable.tsx](../src/pages/portfolio/ledger/LedgerStkTable.tsx) · [UiDesignSystemPage.tsx](../src/pages/settings/UiDesignSystemPage.tsx) §4

## Stock highlight tag (secondary contexts only)

For non-identity highlight (e.g. Ledger grouped bars when pill mode is on):

```tsx
<DenseTag variant="symbol" size="pill">{symbol}</DenseTag>
```

Do not use this in Positions/Live **Stock** identity columns — use `DenseLinkButton variant="stock"` or `text-entity-symbol` text per §2 matrix.

## Table section layout

Wrap a subsection title and its `DenseDataTable` in `denseTable.sectionBlock` (12px gap). Use `denseTable.sectionTitle` for the heading — do not stack the title flush against the table border.

```tsx
<div className={denseTable.sectionBlock}>
  <h4 className={denseTable.sectionTitle}>Option positions</h4>
  <DenseDataTable>...</DenseDataTable>
</div>
```

## Execution source badges

Use `ExecSourceBadge` from `data-display` for flex / tws-client / journal / manual source labels in dense tables (Positions option exec rows, Trade Ledger, Performance on-the-fly). Do not hand-roll badge colors per page.

```tsx
import { ExecSourceBadge } from '@/components/data-display'

<ExecSourceBadge source={exec.source} />
```

## Icon row actions

Use `IconActionButton` (Edit / Delete / Link) instead of `replay-exec-icon-btn`.

## Collapsible groups

For nested strategy / instance panels (Trade Ledger Strategy tab, Positions instance detail):

```tsx
import {
  CollapsibleGroup,
  CollapsibleGroupHeader,
  CollapsibleGroupTitle,
  CollapsibleGroupStats,
  CollapsibleGroupBody,
  CollapsibleChevron,
} from '@/components/data-display'

<CollapsibleGroup variant="card">
  <CollapsibleGroupHeader expanded={open} onToggle={() => setOpen(v => !v)}>
    <CollapsibleChevron expanded={open} />
    <CollapsibleGroupTitle>{title}</CollapsibleGroupTitle>
    <CollapsibleGroupStats><span>PnL: …</span></CollapsibleGroupStats>
  </CollapsibleGroupHeader>
  {open && <CollapsibleGroupBody>{children}</CollapsibleGroupBody>}
</CollapsibleGroup>
```

Use `variant="inset"` for nested instance rows inside an opportunity group.

## Category grouping + subtotals (Accounts)

For tables grouped by category with per-group subtotals and a grand total row:

```tsx
import {
  GroupHeaderRow,
  GroupSubtotalRow,
  GrandTotalRow,
  InlinePnl,
  denseTableNumCell,
} from '@/components/data-display'

<GroupHeaderRow
  colSpan={13}
  label="SEPA"
  variant="category"
  onClick={openCategoriesModal}
  title="Manage categories and assign to positions"
/>
<GroupSubtotalRow labelColSpan={3} label="SEPA subtotal">
  {/* DenseTableCell children for numeric columns */}
</GroupSubtotalRow>
<GrandTotalRow labelColSpan={3} label="Stock Total">
  {/* same numeric cells */}
</GrandTotalRow>
```

**Reference:** [StockPositionsTable.tsx](../src/components/accounts/StockPositionsTable.tsx) · metrics in [accountsStockPositions.ts](../src/utils/accountsStockPositions.ts)

Use separate columns for Daily % / Daily $ ( `InlinePnl` per cell ), not stacked `PnlCell`, when matching Legacy Accounts layout.

## Expandable instance rows (Positions Strategy)

Main instance sheet uses `DenseDataTable` + `ExpandToggleCell` + detail row with `colSpan`:

```tsx
<DenseTableRow onClick={() => toggleExpand(key)} role="button" aria-expanded={isExpanded}>
  <DenseTableCell><ExpandToggleCell expanded={isExpanded} onToggle={...} /></DenseTableCell>
  {/* instance summary columns */}
</DenseTableRow>
<DenseTableRow>
  <DenseTableCell colSpan={11} className={instancePanel.detailCell}>
    <NestedDenseTable>{/* option / coverage subtables */}</NestedDenseTable>
  </DenseTableCell>
</DenseTableRow>
<GrandTotalRow labelColSpan={7} label="Total (N strategies)">{/* Opt PNL */}</GrandTotalRow>
```

**Reference:** [InstanceTab.tsx](../src/components/positions/InstanceTab.tsx) · [OptionsTab.tsx](../src/components/positions/OptionsTab.tsx) (expand pattern)

## NestedDenseTable (Instance detail subtables)

Wrap nested option/coverage tables inside expanded instance rows:

```tsx
<NestedDenseTable>
  <DenseTableHeader>...</DenseTableHeader>
  <DenseTableBody>...</DenseTableBody>
</NestedDenseTable>
```

**Reference:** [InstanceOptionSubTable.tsx](../src/components/positions/InstanceOptionSubTable.tsx) · [InstanceCoverageSubTable.tsx](../src/components/positions/InstanceCoverageSubTable.tsx)

Accounts Option positions (flat list + premium total): [OptionPositionsTable.tsx](../src/components/accounts/OptionPositionsTable.tsx) · [accountsOptionPositions.ts](../src/utils/accountsOptionPositions.ts)

## Live hybrid tables (Market Streams)

Live keeps a native `<table>` shell for **sticky multi-row thead** (Host/Secondary) and drag-drop rows. Use Dense primitives for cells only:

```tsx
import { liveTable } from '@/pages/market/live/liveTableClasses'
import { DenseTableHeader, DenseTableHead, DenseTableCell, GroupHeaderRow } from '@/components/data-display'

<div className={liveTable.shell}>
  <table className={liveTable.table}>
    <DenseTableHeader className={liveTable.stickyThead}>...</DenseTableHeader>
    <DenseTableBody>...</DenseTableBody>
  </table>
</div>
```

Daily/SINCE stacked columns (% then $): [LiveStackedPnlCell.tsx](../src/pages/market/live/LiveStackedPnlCell.tsx)

**Reference:** [MarketStreamsTable.tsx](../src/pages/market/live/MarketStreamsTable.tsx) · [OpenOrdersPane.tsx](../src/pages/market/live/OpenOrdersPane.tsx) (full `DenseDataTable`)

## Model Analysis (expand row + nested stress tables)

Page tokens: [modelAnalysisUi.ts](../src/pages/portfolio/modelAnalysis/modelAnalysisUi.ts)

- Main per-underlying table: hybrid shell + `ExpandToggleCell` + detail `colSpan` row
- Account stress matrix: `CollapsibleGroup` + `NestedDenseTable`
- Expanded symbol detail: 3× `NestedDenseTable` (CAR legs, option Greeks, per-symbol stress)

**Reference:** [ModelAnalysisSections.tsx](../src/pages/portfolio/modelAnalysis/ModelAnalysisSections.tsx) · [UnderlyingDetailPanel.tsx](../src/pages/portfolio/modelAnalysis/UnderlyingDetailPanel.tsx)

## Filter interaction layer

Same filter scenario → same primitive + container. Authoritative rules in `.cursor/rules/dense-ui-system.mdc` § Filter interaction layer.

### Filter primitives

| Scenario | Primitive |
|----------|-----------|
| Single-select ≤6 static options (status, period, view mode, Host/Secondary account) | `SegmentControl` from `data-display` |
| Multi-select entity tags (position category, symbol chips) | `DenseTagButton` + `denseEntityFilterChipClass` |
| Dropdown with dynamic/many options (strategy, instance, expiry, structure type) | shadcn `Select` |
| Text search / pattern input | shadcn `Input` with `placeholder` |
| Boolean include/exclude (chart layer toggles) | `IncludeExcludeToggle` from `data-display` |

**Never use**: CSS module pills (`timeRangePill`, `systemTab`), native `<select>`, custom `rounded-full` pill buttons, `BubbleSwitch` alias (deprecated), `TabsList` as a data filter.

### Filter bar containers

| Complexity | Container |
|------------|-----------|
| Simple (≤3 controls) | Inline in `PageHeader actions` or single `flex` row above table |
| Medium (3–6 controls) | `Card variant="elevated"` · `px-3 py-2` · `flex flex-wrap items-center gap-2` |
| Complex (6+ controls, labeled sections) | `Card variant="elevated"` · `flex flex-col gap-2` with inner rows |

### Reference implementations

| Pattern | Page |
|---------|------|
| Simple SegmentControl filter | [OpportunitiesPage.tsx](../src/pages/strategy/OpportunitiesPage.tsx) (Availability) |
| Medium multi-control in Card | [InstanceListFilters.tsx](../src/components/strategy/InstanceListFilters.tsx) |
| DenseTagButton category filter | [FilterPillBar.tsx](../src/pages/market/live/FilterPillBar.tsx) (Category section) |
| Select + SegmentControl combo | [GreeksPage.tsx](../src/pages/research/GreeksPage.tsx) |

## Status indicators

Three tiers — choose by context, never mix within the same semantic level.

| Context | Primitive | Reference |
|---------|-----------|-----------|
| Process health (real-time heartbeat) | `StatusLamp` — green/yellow/red/gray + glow | [DaemonStatusPage](../src/pages/settings/DaemonStatusPage.tsx), [SocketPage](../src/pages/settings/SocketPage.tsx) |
| Row-level status in table | `DenseTag variant="success/warning/…"` | [InstancesGroupedTable](../src/components/strategy/InstancesGroupedTable.tsx) |
| Inline status text | Semantic `text-success` / `text-danger` / `text-warning` | [apiHealthUi.ts](../src/pages/settings/apiHealth/apiHealthUi.ts) |

## Loading states

Three tiers by scope.

| Tier | Context | Pattern |
|------|---------|---------|
| Full page | Route transition, initial data | `PageRouteFallback` — centered spinner |
| Card / section | `isLoading` within a `Card` | shadcn `Skeleton` blocks matching content layout |
| Table | Table data loading | `denseTable.emptyHint` "Loading…" or 3–5 `Skeleton` table rows |

## Empty states

| Context | Pattern |
|---------|---------|
| Table with no rows | `denseTable.emptyHint` centered text |
| Section / card with no data | Planned `EmptyState` component — icon + title + optional subtitle + action button |
| Filter yields no results | `denseTable.emptyHint` with distinct message ("No results match filters") |

## Operation feedback

| Context | Pattern |
|---------|---------|
| Form save success | Inline `text-success` near submit, auto-fade 2–3s |
| Batch / async action | Toast notification (success or error) |
| Validation error | Inline `text-destructive` below field |
| Server error on mutation | Toast with error message |

**Never**: `window.alert`, silent failure on mutations, persistent success banner.

## Allowed CSS exceptions

- **Chart geometry** only: small scoped modules (e.g. Positions donut grid, Discovery chart overlay)
- SVG colors via `@/lib/chartTokens`

## Forbidden patterns

- Side-effect imports: `import './foo.module.css'` without `styles` binding
- `:global()` class injection in module CSS
- Legacy class strings: `replay-*`, `process-section`, `legacy-monitoring-shell`
- New `*Legacy.css` files
- Reimplementing shadcn `Button` / `Select` in module CSS (`.btnFetch`, etc.)

## Verification

Compare against Legacy Frontend on the same Legacy API. Stocks tab is the visual baseline for table density.

## Agent governance

All coding agents (Cursor, Claude Code, Codex, GPT) working in this repo MUST follow:

| Asset | Purpose |
|-------|---------|
| `AGENTS.md` | Cross-agent entry point |
| `.cursor/rules/dense-ui-system.mdc` | Mandatory reuse rules (alwaysApply) |
| `.cursor/skills/dense-ui/SKILL.md` | Implementation workflow for tables/migration |

After UI changes: `npm run lint && npm run build && npm run check:legacy-css`.
