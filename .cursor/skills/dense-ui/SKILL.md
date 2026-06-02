---
name: dense-ui
description: >-
  Implements and migrates Bifrost Trade frontend UI using the Dense UI design
  system (data-display primitives, tokens, governance). Use when adding or
  changing tables, PnL cells, segments, collapsible panels, pagination, row
  actions, page styling, CSS reuse, design system consistency, or migrating
  legacy ledger/positions CSS to shared components.
---

# Dense UI — Agent Implementation Skill

## When to use

- User asks to style a page, table, toolbar, or panel
- Migrating Legacy frontend pages or module CSS
- Adding Trade Ledger / Positions / Performance UI
- User mentions: design system, CSS reuse, consistent UX, `data-display`, Dense UI

## Before coding

1. Read `docs/DENSE_UI.md`
2. Read `.cursor/rules/dense-ui-system.mdc`
3. List `@/components/data-display` exports in `src/components/data-display/index.ts`
4. Grep the target page for `styles.` / `.module.css` / `replay-`

## Decision tree

```
Need UI for data-heavy view?
├─ Table / grid → DenseDataTable family
├─ KPI PnL column → PnlCell or InlinePnl + pnlColorClass
├─ Toggle chips → SegmentControl (not custom CSS pills)
├─ Edit/Delete/Link icon → IconActionButton
├─ Expandable group → CollapsibleGroup (+ ExpandToggleCell in tables)
├─ Chart / payoff SVG → scoped module CSS (exception only)
└─ Generic button/dialog → shadcn/ui
```

## Implementation checklist

Copy and track:

```
- [ ] No new page-specific table module CSS
- [ ] Imports from @/components/data-display (not deprecated positions/ui re-exports)
- [ ] Numeric columns use denseTableNumCell or PnlCell
- [ ] PnL uses pnlColorClass (not module pnl classes)
- [ ] Row actions use IconActionButton
- [ ] Category labels use DenseTag variant="category" (not stkPillCategoryClass / inline purple CSS)
- [ ] No window.confirm / window.alert
- [ ] npm run lint && npm run build && npm run check:legacy-css pass
```

## Reference implementations

| Pattern | File |
|---------|------|
| Stock positions table | `src/components/positions/StocksTab.tsx` |
| Accounts stock positions (category + subtotals) | `src/components/accounts/StockPositionsTable.tsx` |
| Accounts option positions (premium total) | `src/components/accounts/OptionPositionsTable.tsx` |
| Positions instance sheet (expand + nested subtables) | `src/components/positions/InstanceTab.tsx` |
| Instance option / coverage subtables | `src/components/positions/InstanceOptionSubTable.tsx`, `InstanceCoverageSubTable.tsx` |
| Live market streams (hybrid sticky table) | `src/pages/market/live/MarketStreamsTable.tsx` |
| Live open orders | `src/pages/market/live/OpenOrdersPane.tsx` |
| Model Analysis (expand + nested stress) | `src/pages/portfolio/modelAnalysis/ModelAnalysisSections.tsx`, `UnderlyingDetailPanel.tsx` |
| Transfer Pay transactions / summary | `src/pages/portfolio/transferPay/TransferPayTransactionsTable.tsx`, `TransferPaySummaryTable.tsx` |
| Stock Screener readiness results | `src/pages/research/stockScreener/ReadinessResultsTable.tsx` |
| Option Screener symbol groups + contracts | `src/pages/research/optionScreener/OptionScreenerSymbolGroup.tsx`, `OptionScreenerContractsTable.tsx` |
| Stock Watchlist stock/option tables | `src/pages/research/watchlist/WatchlistStockTable.tsx`, `WatchlistOptionTable.tsx` |
| Stock Watchlist portfolio risk | `src/pages/research/watchlist/PortfolioRiskPower.tsx`, `WatchlistMetricTable.tsx` |
| Option Discovery chain (sticky hybrid) | `src/components/optionDiscovery/DiscoveryChainQuotesTable.tsx` |
| Option Discovery strike / IV / compare / contract tables | `DiscoveryStrikeLadderTable.tsx`, `DiscoveryIvTermSheetTable.tsx`, `DiscoveryCompareTable.tsx`, `DiscoveryContractGreeksTable.tsx`, `DiscoveryScenarioTable.tsx` |
| Option Discovery tokens | `src/pages/research/discovery/discoveryUi.ts`, `src/components/optionDiscovery/optionDiscoveryUi.ts` |
| IV & Greeks history table | `src/pages/research/greeks/GreeksHistoryTable.tsx` |
| IV & Greeks BS tooltip + page tokens | `src/pages/research/greeks/GreeksCalcTooltip.tsx`, `src/pages/research/greeks/greeksUi.ts` |
| Strategy Instances grouped list | `src/components/strategy/InstancesGroupedTable.tsx`, `src/components/strategy/instances/instancesUi.ts` |
| Strategy Win Rate KPI cards | `src/components/strategy/winRate/winRateUi.ts`, `src/pages/strategy/WinRatePage.tsx` |
| Strategy Structures list + history | `src/components/strategy/StructuresTable.tsx`, `src/components/strategy/structures/structuresUi.ts` |
| Strategy Opportunities list + form | `src/components/strategy/OpportunitiesTable.tsx`, `src/components/strategy/opportunities/opportunitiesUi.ts`, `OpportunityFormModal.tsx` |
| Strategy Option Category templates | `src/pages/strategy/OptionCategoryPage.tsx`, `src/pages/strategy/optionCategory/optionCategoryUi.ts`, `OptionCategoryLegsSection.tsx`, `OptionCategoryMetaTable.tsx` |
| Strategy Gates list + form sheet | `src/components/strategy/gates/GatesTable.tsx`, `src/components/strategy/gates/gatesUi.ts`, `GateSafetyFormSheet.tsx` |
| Strategy Allocations list + form | `src/components/strategy/AllocationsTable.tsx`, `src/components/strategy/allocations/allocationsUi.ts`, `AllocationFormModal.tsx` |
| Operations Celery queue/job tables | `src/pages/operations/celery/celeryUi.ts`, `CeleryQueueSummaryTable.tsx`, `jobQueues/*`, `CeleryWorkerInstancesSection.tsx` |
| Settings API Health docs + cards | `src/pages/settings/apiHealth/ApiDocsTable.tsx`, `ApiServiceHealthCard.tsx`, `apiHealthUi.ts` |
| Settings Socket ingest table | `src/pages/settings/socket/IngestServicesTable.tsx`, `socketIngestUi.ts`, `IngestConnectionCell.tsx`, `socketIngestControls.tsx` |
| Operations Daemon status + ops | `src/pages/settings/DaemonStatusPage.tsx`, `src/pages/settings/daemon/daemonUi.ts`, `RecentOperationsTable.tsx`, `StrategyTradingDaemonCard.tsx` |
| Category / symbol tags | `DenseTag` in `LedgerStkTable.tsx`, `GroupHeaderRow variant="category"` |
| Option exec row actions | `src/components/positions/OpenOptionExecTableRow.tsx` |
| Ledger option groups | `src/pages/portfolio/ledger/OptGroupsTable.tsx` |
| Collapsible strategy card | `src/pages/portfolio/ledger/LedgerStrategyGroup.tsx` |
| Stocks ledger table | `src/pages/portfolio/ledger/LedgerStkTable.tsx` |

## Migrating legacy CSS

1. Map legacy class → primitive (see `docs/DENSE_UI.md` and rule `dense-ui-system.mdc`)
2. Replace markup; keep business logic unchanged
3. Delete unused module rules; grep zero references before removing selectors
4. If pattern is ledger-only and small (e.g. pagination), use page `*SharedClasses.ts` **only** until promoted to `data-display`

## Promoting a new primitive

Criteria: used or will be used on ≥3 pages.

1. Add component or constant under `src/components/data-display/`
2. Export from `index.ts`
3. Document in `docs/DENSE_UI.md`
4. Migrate one reference page; verify visually against Legacy Frontend on same API

## Detailed API

See [reference.md](reference.md) for import cheat sheet and token list.
