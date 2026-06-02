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

## Trade Ledger

Content tables (Instance, Options, Stocks / Fixed Income / Cash-like) use the same dense primitives as Positions:

| Pattern | Reference |
|---------|-----------|
| Collapsible opportunity / instance cards | [LedgerStrategyGroup.tsx](../src/pages/portfolio/ledger/LedgerStrategyGroup.tsx), [LedgerInstanceCard.tsx](../src/pages/portfolio/ledger/LedgerInstanceCard.tsx) |
| Shared option group table (expand + fill rows) | [OptGroupsTable.tsx](../src/pages/portfolio/ledger/OptGroupsTable.tsx), [OptGroupRow.tsx](../src/pages/portfolio/ledger/OptGroupRow.tsx) |
| Options Closed / Open main views | [LedgerClosedOptionSection.tsx](../src/pages/portfolio/ledger/LedgerClosedOptionSection.tsx), [LedgerOpenOptionSection.tsx](../src/pages/portfolio/ledger/LedgerOpenOptionSection.tsx) |
| Stocks position grouping + fills | [LedgerStkTable.tsx](../src/pages/portfolio/ledger/LedgerStkTable.tsx) |
| Detail subhead / fill rows | `DenseTableSubheadRow`, `DenseTableDetailRow` in [DenseTable.tsx](../src/components/data-display/DenseTable.tsx) |
| Pagination (page-local) | [ledgerPaginationClasses.ts](../src/pages/portfolio/ledger/ledgerPaginationClasses.ts) |

Toolbar, summary bar, and filter segments still use `ledgerStyles.module.css` until a follow-up PR.

## PnL coloring

Always use `pnlColorClass` from `@/utils/dailyChange` or `InlinePnl` / `PnlCell` from `data-display`. Do not use legacy strings (`pnl-positive`, `pos-opt-pnl-*`).

## Numbers

- Monetary and quantity columns: `font-mono tabular-nums`
- Meta captions: `denseTable.mutedMeta` or `text-[length:var(--text-dense-meta)]`

## Segment controls

Use `SegmentControl` / `IncludeExcludeToggle` from `data-display` instead of custom CSS pill groups.

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
