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
- [ ] Empty states use denseTable.emptyHint
- [ ] No window.confirm / window.alert
- [ ] npm run lint && npm run build && npm run check:legacy-css pass
```

## Reference implementations

| Pattern | File |
|---------|------|
| Stock positions table | `src/components/positions/StocksTab.tsx` |
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
