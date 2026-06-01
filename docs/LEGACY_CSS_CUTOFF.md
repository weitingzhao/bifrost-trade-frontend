# Frontend Legacy CSS cutoff (mechanical checks)

After the migration-prep baseline (2026-05-31), new pages must not reintroduce engine-era CSS patterns.

## Verify locally

```bash
cd bifrost-trade-frontend

npm run build
npm run lint

# No Legacy alias tokens in src (product tokens like --color-lamp-* are OK)
grep -rE '(--color-text-main|--color-bg|--color-surface|--space-[0-9])' src --include='*.ts' --include='*.tsx' --include='*.css'

# No removed Discovery scoped files or class names
rg 'discoveryScoped|discoveryStrikeLadder|legacyMonitoringShell' src
test ! -f src/styles/discoveryScoped.css

# Discovery components: no fake global table / exp-filter classes
rg 'data-table|option-discovery-exp-filter' src/components/optionDiscovery

# Chart CSS file size budget
wc -l src/styles/discoveryCharts.css
# Expect: < 200 lines
```

## Allowed patterns

- **Charts**: `import '@/lib/chartTokens'` for SVG `fill` / `stroke` (or `odChartConstants` re-exports).
- **Discovery layout**: Tailwind on components; optional `discoveryCharts.css` only for `od-chart-expand-*` and SVG sizing under `.option-discovery-root`.
- **Product semantics**: `--color-lamp-*`, `--color-danger`, `--color-surface-elevated`, `--color-border-strong` in `index.css` `@theme` / `:root`.

## Route splitting

Eager routes (see `src/lib/router.tsx`): Live, Watchlist, Positions, Strategy Instances.

All other top-level pages load via React Router `lazy` + `AppLayout` `Suspense` (`PageRouteFallback`).

Build notes: `docs/BUILD.md`.

## Paydown checks (Legacy CSS debt)

Track progress in [`LEGACY_CSS_PAYDOWN.md`](./LEGACY_CSS_PAYDOWN.md).

```bash
cd bifrost-trade-frontend
npm run check:legacy-css
```

### No new Legacy imports

```bash
# Must be empty: imports of Legacy/theme files from TS/TSX
grep -rE "Legacy\.css|positionsTheme\.css" src --include='*.ts' --include='*.tsx' \
  | grep -v Legacy.css || true
```

### `!important` budget (baseline 27 lines — decrease only)

```bash
grep -r '!important' src --include='*.css' | wc -l
```

### Ledger module line budget (baseline ~1388 — decrease each phase)

```bash
wc -l src/pages/portfolio/ledger/TradeLedgerPage.module.css
```

### Positions legacy class names (should trend to 0 in `components/positions`)

```bash
grep -rE 'pnl-positive|pnl-negative|replay-portfolio-group' src/components/positions --include='*.tsx' || true
```

### Freeze rules

- Do **not** add new `*Legacy.css` files or extend `positionsTheme.css`.
- New PnL coloring: `pnlColorClass()` from `@/utils/dailyChange`, not `pnl-positive` strings.
- New tables: `@/components/positions/ui` dense table primitives + shadcn `Table`.
