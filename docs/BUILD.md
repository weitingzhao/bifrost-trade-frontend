# Production build notes

`npm run build` exits **0** even when Vite prints `(!)` hints. Those are bundle-size advisories, not compile failures.

## Resolved (2026-05-31)

1. **Dynamic + static import clash** — `DiscoveryPage` duplicated `optionDiscovery` via `import()` while the same module was already statically imported. Removed the redundant dynamic import; use top-level imports only.

2. **Route code-splitting** — `src/lib/router.tsx` uses `lazyPage()` helper + React Router `lazy` + `Suspense` on `AppLayout` outlet.

   **Eager** (high-traffic): `/market/live`, `/research/watchlist`, `/portfolio/positions`, `/strategy/instances`.

   **Lazy** (domain groups): portfolio (except positions), research (except watchlist), strategy (except instances), operations, settings (all nested routes).

   **Discovery chunk**: `DiscoveryPage` + `discoveryCharts.css` (~168 lines CSS raw; gzip typically &lt; 6 kB).

3. **Vendor chunks** — `vite.config.ts` `manualChunks` splits React, TanStack Query, Radix, Lucide.

4. **Legacy CSS cutoff** — `discoveryCharts.css` holds only chart hover-expand + SVG aspect-ratio; IV term / tables use Tailwind. See `docs/LEGACY_CSS_CUTOFF.md`.

## `> 500 kB` hint

After route lazy loading, check the latest `index-*.js` size in the build log. If the main chunk is still above 500 kB, consider lazy-loading heavy chart-only modules inside a page.

Do **not** only raise `chunkSizeWarningLimit` unless the team accepts the current split; prefer more route or feature `import()` over silencing the warning.

## Verify locally

```bash
npm run build
# Expect: no "dynamically imported ... also statically imported" message
# Compare index-*.js size in dist/assets/ after lazy route rollout
```
