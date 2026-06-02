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
| `DenseDataTable` adopters | ~14 | Positions Stocks/Options, Trade Ledger content tables |
| shadcn `@/components/ui/table` in `src/` | ~40 | Admin / Strategy / Accounts Option (Phase 1) |
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

- `src/components/accounts/**` must not import `@/components/ui/table` except [OptionPositionsTable.tsx](../src/components/accounts/OptionPositionsTable.tsx) (Phase 1 allowlist)

**Acceptance**

- Row density matches Positions → Stocks tab (`--table-cell-py/px`)
- Category click opens Categories modal; subtotals / Stock Total match Legacy API

---

## Phase 1 — Accounts Option + Positions Strategy

| File | Action |
|------|--------|
| `OptionPositionsTable.tsx` | Migrate to DenseDataTable |
| `InstanceTab.tsx` + subtables | Main table Dense; nested `NestedDenseTable` |
| `instancePanelClasses.ts` | Delete table rules after migration |

Remove Option allowlist from `check-legacy-css`.

---

## Phase 2 — Live market tables

| File | Action |
|------|--------|
| `live.module.css` | Replace padding/font with `--table-cell-*`, `--text-dense` |
| `MarketStreamsTable.tsx`, panes | Use `InlinePnl` / `denseTableNumCell`; keep sticky headers as thin wrapper |

---

## Phase 3 — Ops / Research / Settings grids

Migrate remaining shadcn `Table` usages in Celery, Strategy admin, Screener, etc. Prioritize high-traffic monitoring pages.

Track remaining count:

```bash
grep -rl "@/components/ui/table" src --include='*.tsx' | wc -l
```

---

## Phase 4 — Module CSS shrink

- Reduce `ledgerStyles.module.css` to toolbar/summary only (target < 600 lines)
- Delete obsolete page table modules after Dense migration
- Tighten `check-legacy-css` budgets monotonically
