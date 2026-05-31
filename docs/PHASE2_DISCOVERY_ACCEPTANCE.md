# Phase 2 — Option Discovery UI acceptance

**Stage**: New Frontend + Legacy API (unchanged). Compare **bifrost-trade-frontend** `/research/discovery` with **bifrost-trader-engine/frontend** Option Discovery on the same `VITE_API_*`.

## Structural done criteria (code)

| Item | Status |
|------|--------|
| `DiscoveryPage` uses `PageHeader` via `DiscoveryPageHeader` + Research breadcrumb → `/research/screener` | Done |
| No `legacy-monitoring-shell`; root class `option-discovery-root` | Done |
| No global `legacyMonitoringShell.css` in `index.css` | Done |
| `optionDiscovery.css` removed; page import `discoveryCharts.css` only (~27 kB raw, **gzip ~4.7 kB**) | Done (Phase 2b) |
| Phase 2b: `StrikeLadderPanel`, `OptionChainQuotesSection`, shadcn Checkbox/ToggleGroup, Tailwind strike/chain/drawers | Done |
| `SectionPageTitle` removed; `useDiscoveryNav` in `hooks/useDiscoveryNav.ts` | Done |
| Legacy primitives replaced: `DiscoveryHint`, `DiscoveryIconButton`, `DiscoverySection` | Done |
| Layout / session / TOC / underlying / expiry: Tailwind + shadcn where noted in plan | Done |

## Functional regression (vs Legacy)

| Flow | Check |
|------|--------|
| Underlying | Watchlist chips; manual symbol + Apply; empty watchlist hint |
| Expiration | Bubble picker; DTE label; filter All/Std/Wk/Qtr (IV term) |
| Strike ladder | Count / std dev; ATM row; OTM Call/Put columns; select strikes |
| Quotes | Refresh; Snapshot/BS toggle; Greeks columns; chain table click → contract |
| IV Term | Multi-expiry checkboxes; backfill; term + cone charts |
| Max Pain | OI backfill; collapse; live charts |
| Analytics | IV smile / OI / GEX; collapse toggles |
| Contract drawer | Detail tabs; compare drawer (≤4 legs); chart period + backfill |
| Navigation | Research breadcrumb; Settings → Massive feed from session bar |

## Mechanical checks

```bash
cd bifrost-trade-frontend
npm run build
npm run lint
```

```bash
# No legacy global shell or old discovery CSS files
test ! -f src/styles/optionDiscovery.css
test ! -f src/styles/legacyMonitoringShell.css
test ! -f src/styles/discoveryScoped.css
test ! -f src/styles/discoveryStrikeLadder.css
test ! -f src/styles/discoveryShell.css
test -f src/styles/discoveryCharts.css
rg 'legacyMonitoringShell|optionDiscovery\.css|discoveryScoped|discoveryStrikeLadder|discoveryShell' src
# Expected: no matches (except comments in docs)
```

## Dev environment notes (2026-05-31 fix)

- Vite must proxy `/research/massive` and `/ops` (same as Legacy engine) when `massiveUrl` uses same-origin paths in dev.

## Phase 2b done (2026-05-31)

- Deleted `discoveryScoped.css`, `discoveryStrikeLadder.css`, `discoveryShell.css`.
- Strike ladder / chain quotes / contract drawer shells → Tailwind + shadcn; SVG + IV-term data tables remain in `discoveryCharts.css`.

## Sign-off

- [ ] Owner verified functional table above (date: ________)
- [x] Phase 2b CSS shrink (code complete; build chunk gzip &lt; 5 kB)
