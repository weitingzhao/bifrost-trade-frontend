# Phase 1 UI canvas — visual acceptance checklist

**Stage**: New Frontend + Legacy API (phase 1). Compare **bifrost-trade-frontend** (port 5173) with **bifrost-trader-engine/frontend** on the **same** Legacy API endpoints (`VITE_API_*`).

## Pages to verify side-by-side

| Route | Focus |
|-------|--------|
| `/portfolio/accounts` | Canvas matches sidebar (`#13171d`); KPI / Overview blocks visibly elevated (`#1a1f26`) |
| `/research/discovery` | Outer shell same canvas color; **function** matches Legacy (Phase 2 CSS/页头见 `PHASE2_DISCOVERY_ACCEPTANCE.md`) |
| `/market/live` | `PageHeader` + strategy badges; table/summary bar hierarchy |
| `/operations/celery` | `PageHeader`; queue cards readable on canvas |
| `/strategy/instances` | Large title + filters + table / inspector |
| `/settings/ib-connection` | Header actions; connection / Flex sections |
| `/research/sepa` (Stock Screener) | Filter elevated block (`bg-secondary`); table vs canvas |

## Pass criteria

- No page root sits on deepest `bg-background` only (except intentional inset charts).
- No major content panel is indistinguishable from canvas (same `bg-card` flat merge).
- Primary actions in page header still reachable (refresh, save, create, etc.).
- No regression in data loading or navigation vs Legacy on the same API.

## Mechanical checks (automated in CI / local)

**Last run (2026-05-31)**: `npm run build` OK · `npm run lint` 0 errors · page-level `<h1>` only in `RouteErrorPage.tsx`.

```bash
cd bifrost-trade-frontend
npm run build
npm run lint
```

Optional grep (pages should use `PageHeader`, not raw page-level `h1`):

```bash
rg '<h1' src/pages --glob '*.tsx'
# Expected: RouteErrorPage only (error route, no PageShell)
```

## Sign-off

- [x] Phase 2 code complete: Discovery `PageHeader`、去全局 Legacy shell、删除 `optionDiscovery.css`（2026-05-31）
- [ ] Owner verified all rows above including Discovery functional regression (date: ________)
- [ ] Phase 2 Owner sign-off: `docs/PHASE2_DISCOVERY_ACCEPTANCE.md`
