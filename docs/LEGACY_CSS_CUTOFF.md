# Frontend Legacy CSS cutoff (mechanical checks)

After the migration-prep baseline (2026-05-31), new pages must not reintroduce engine-era CSS patterns.

## Verify locally

```bash
cd bifrost-trade-frontend

npm run build
npm run lint

# No Legacy alias tokens in src (product tokens like --color-lamp-* are OK)
rg '--color-text-main|--color-bg\b|--color-surface\b|--space-[0-9]' src

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
