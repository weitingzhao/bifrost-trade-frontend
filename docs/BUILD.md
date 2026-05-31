# Production build notes

`npm run build` exits **0** even when Vite prints `(!)` hints. Those are bundle-size advisories, not compile failures.

## Resolved (2026-05-31)

1. **Dynamic + static import clash** — `DiscoveryPage` duplicated `optionDiscovery` via `import()` while the same module was already statically imported. Removed the redundant dynamic import; use top-level imports only.

2. **Route code-splitting** — Lazy routes (React Router `lazy` + `Suspense` on `AppLayout` outlet):
   - `/research/discovery` → `DiscoveryPage` + `discoveryScoped.css` (lazy chunk CSS ~71 kB)
   - `/portfolio/ledger` → `TradeLedgerPage`
   - `/portfolio/performance` → `PerformancePage`

3. **Vendor chunks** — `vite.config.ts` `manualChunks` splits React, TanStack Query, Radix, Lucide.

## Remaining `> 500 kB` hint

The main `index-*.js` chunk (~790 kB) still holds eagerly loaded pages (Live, Positions, Strategy, Settings, etc.). Further reduction = lazy-load more routes or feature-level `import()` (e.g. heavy chart panels).

Do **not** only raise `chunkSizeWarningLimit` unless the team accepts the current split; prefer more route lazy loading over silencing the warning.

## Verify locally

```bash
npm run build
# Expect: no "dynamically imported ... also statically imported" message
# May still see: "Some chunks are larger than 500 kB" on index-*.js
```
