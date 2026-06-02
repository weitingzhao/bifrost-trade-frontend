# Dense UI — Data-Display Design System

Reusable styling for data-heavy monitoring pages (Positions, Trade Ledger, Performance, Live).

**Parent doc:** [TECH_STACK.md](./TECH_STACK.md) (locked stack + governance). In-app: Settings → Configuration → Tech Stack.

## Layer stack

| Layer | Location | Role |
|-------|----------|------|
| Tokens | `src/index.css` (`--text-dense`, `--table-cell-*`) | Typography and cell spacing |
| Layout | `src/components/layout/` | `PageShell`, `PageHeader`, `PageSection` |
| Data display | `src/components/data-display/` | Tables, PnL, segments, icon actions |
| Domain | `src/components/positions/`, etc. | Business columns and interactions |

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

### Fixed columns (expand / collapse)

`DenseDataTable` uses **`table-layout: fixed`** (`denseTable.table`) so column widths stay stable when detail rows are shown or hidden.

Tables with expandable child rows **must** define a `<colgroup>` with explicit column widths (see [OptionsTab.tsx](../src/components/positions/OptionsTab.tsx)). Detail rows must occupy the **same column grid** as parent rows (use `colSpan` where the label spans multiple columns — never skip a column slot).

Long labels in detail rows: clip with `denseTable.detailCellClip` + `denseTable.detailRowLabel` (truncate + `title` tooltip). Do not rely on wide cell content to set column width.

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

## PnL coloring

Always use `pnlColorClass` from `@/utils/dailyChange` or `InlinePnl` / `PnlCell` from `data-display`. Do not use legacy strings (`pnl-positive`, `pos-opt-pnl-*`).

## Numbers

- Monetary and quantity columns: `font-mono tabular-nums`
- Meta captions: `denseTable.mutedMeta` or `text-[length:var(--text-dense-meta)]`

## Segment controls

Use `SegmentControl` / `IncludeExcludeToggle` from `data-display` instead of custom CSS pill groups.

## Category / symbol tags

Purple **position category** pills (Trade Ledger Stocks tab style) and blue **symbol highlight** pills are centralized in `DenseTag`:

```tsx
import { DenseTag, GroupHeaderRow } from '@/components/data-display'

// Table cell
<DenseTableCell>
  <DenseTag variant="category" size="cell">{categoryName}</DenseTag>
</DenseTableCell>

// Group header row (Accounts, Live Market Streams, …)
<GroupHeaderRow colSpan={n} label={category} variant="category" />

// Larger pill in ledger group bars
<DenseTag variant="category" size="pill">{category}</DenseTag>
<DenseTag variant="symbol" size="pill">{symbol}</DenseTag>
```

Tokens: [denseTagClasses.ts](../src/components/data-display/denseTagClasses.ts) · component: [DenseTag.tsx](../src/components/data-display/DenseTag.tsx)

**Reference:** [LedgerStkTable.tsx](../src/pages/portfolio/ledger/LedgerStkTable.tsx) · [StockPositionsTable.tsx](../src/components/accounts/StockPositionsTable.tsx) (via `GroupHeaderRow`)

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
