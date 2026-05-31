# Phase 2 — Option Discovery UI acceptance

**Stage**: New Frontend + Legacy API (unchanged). Compare **bifrost-trade-frontend** `/research/discovery` with **bifrost-trader-engine/frontend** Option Discovery on the same `VITE_API_*`.

## Structural done criteria (code)

| Item | Status |
|------|--------|
| `DiscoveryPage` uses `PageHeader` via `DiscoveryPageHeader` + Research breadcrumb → `/research/screener` | Done |
| No `legacy-monitoring-shell`; root class `option-discovery-root` | Done |
| No global `legacyMonitoringShell.css` in `index.css` | Done |
| `optionDiscovery.css` removed; styles in `discoveryScoped.css` + `discoveryShell.css` (page-only import) | Done |
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
# No legacy global shell or old discovery CSS file
test ! -f src/styles/optionDiscovery.css
test ! -f src/styles/legacyMonitoringShell.css
rg 'legacyMonitoringShell|optionDiscovery\.css|SectionPageTitle|legacy-monitoring-shell' src
# Expected: no matches (except comments in docs)
```

## Sign-off

- [ ] Owner verified functional table above (date: ________)
- [ ] Optional follow-up: shrink `discoveryScoped.css` by Tailwind-migrating strike ladder / chain tables (Phase 2b)
