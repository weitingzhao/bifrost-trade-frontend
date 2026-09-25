# Tech Stack — Bifrost Trade Frontend

Authoritative reference for technology choices, UI standards, and governance.  
In-app view: **System › Reference › Tech Stack** (`/docs/tech-stack`) — the page renders this file, so edit it here; there is no second copy.

---

## 1. Product context

Bifrost Trade Frontend is an **internal monitoring console** for a single operator:

- Data-dense tables, collapsible groups, right-hand inspectors, SSE streams
- Strong domain semantics: PnL coloring, multi-account (Host / Secondary), options / instances
- The Legacy frontend and its API are retired (spine **D8**, 2026-06-29); the app runs against the Trade API domains, the Research API and the platform plugins
- No SEO, no SSR — pure SPA

---

## 2. Locked stack (do not replace without explicit decision)

| Layer | Choice | Role |
|-------|--------|------|
| Framework | React 19 + TypeScript + Vite | SPA, fast dev/build |
| Routing | React Router v7 (data router) | URL state, lazy routes |
| Server state | TanStack Query v5 | API cache, polling, SSE cache updates |
| Generic UI | **shadcn/ui** on **Radix UI** (`radix-ui` package, style `radix-nova`) | Dialog, Tabs, Select, Sidebar, forms |
| Styling | Tailwind CSS v4 + CSS variables in `src/index.css` | Theme, density tokens |
| Icons | Lucide React | Nav, inspector section tones |
| Validation | Zod | API response shapes where used |

**Explicitly excluded:** Next.js (no SSR/RSC need), Ant Design / MUI as primary DS, wholesale AG Grid skin.

---

## 3. Radix vs Base UI vs visual design

| | Used? | Notes |
|---|-------|------|
| **Radix UI primitives** | Yes | Via shadcn `src/components/ui/*` — headless a11y/behavior only |
| **Radix Themes / Radix Colors** | No | Visual layer is Tailwind + project tokens |
| **Base UI (@mui/base)** | No | Not in dependencies |
| **Dense UI** | Yes (internal) | See §4 — not an npm package |

Radix covers **interactive shells** (modals, tabs, popovers). It does **not** provide data grids; dense tables are custom.

---

## 4. Dense UI — Data-Display Design System

**Dense UI** is the project’s **internal** standard for data-heavy pages (Positions, Trade Ledger, Performance, Live). It is documented in `docs/DENSE_UI.md` and enforced by `.cursor/rules/dense-ui-system.mdc` / `.claude/skills/dense-ui/` and `npm run check:legacy-css`.

### Layer stack

1. **Tokens** — `src/index.css` (`--text-dense`, `--text-dense-meta`, `--table-cell-py/px`, trading semantics)
2. **Layout** — `PageShell`, `PageHeader`, `RightInspectorShell`
3. **Data display** — `src/components/data-display/` (tables, PnL, segments, collapsible groups)
4. **Domain** — page-specific columns, hooks, API wiring (minimal styling)

### Page canvas (three surfaces)

1. **Canvas** — `PageShell` + `bg-card` (same as sidebar)
2. **Elevated** — `Card variant="elevated"` or `bg-secondary` (KPI bars, chart panels, filters)
3. **Inset** — `bg-background` (nested chart wells)

### Mandatory primitives (same interaction → same component)

| Interaction | Use | Never |
|-------------|-----|-------|
| Data table | `DenseDataTable` + head/row/cell | New `*.module.css` tables, `replay-*` classes |
| PnL color | `pnlColorClass` / `PnlCell` / `InlinePnl` | `pnl-positive`, inline hex green/red |
| Segment / toggle pills | `SegmentControl` | Custom pill CSS per page |
| Row icon actions | `IconActionButton` | Hand-rolled 20×20 buttons |
| Nested strategy/instance | `CollapsibleGroup` | Legacy `strategyGroup` module classes |
| Destructive confirm | App `ConfirmDialog` | `window.confirm` |

Reference implementation: `src/components/positions/StocksTab.tsx`.

### Allowed CSS exceptions (narrow)

- Chart geometry: `PositionsChartsSection.module.css`, `DonutChart.module.css`, payoff layout in `riskProfile.module.css`
- SVG colors: `@/lib/chartTokens`
- Toolbar/summary bars under active migration (Ledger) — do not copy into new pages

### Forbidden

- `*Legacy.css`, side-effect `import './x.module.css'`, `:global()` in new module CSS
- Legacy class strings: `replay-*`, `pnl-positive` / `pnl-negative`
- Reimplementing shadcn `Button` / `Select` in module CSS

Verify after UI changes: `npm run lint && npm run build && npm run check:legacy-css`.

---

## 5. Right inspector pattern

Shared across Stock / Option / Instance detail sidebars:

| Piece | Location |
|-------|----------|
| Shell | `RightInspectorShell`, `rightInspectorShell.module.css` |
| Line tabs | `InspectorSectionNav` + `InspectorNavItem` (icon + label; the active underline is the layer accent) |
| Collapsible sections | `RightInspectorCollapsibleSection` — **same `navItem` as tabs** |
| Tones | `inspectorNavTones.ts` |
| Config per domain | `stockInspectorSections.ts`, `optionInspectorSections.ts`, `instanceInspectorSections.ts` |

---

## 6. Charts

- **Donut / coverage pies** — scoped CSS modules + React (`DonutChart`, legend in `ChartLegend`)
- **K-line / bars** — `BarsCandlestickChart` (SVG) + `chartTokens`
- **No** Recharts / Lightweight Charts in core stack unless a future ADR adds them for advanced trading interactions

Optional later (headless only, keep Dense UI skin):

- `@tanstack/react-virtual` — long lists
- `@tanstack/react-table` — column state only; render with `DenseTable*` components

---

## 7. What we do not adopt as primary

| Option | Reason |
|--------|--------|
| AG Grid / MUI X | Heavy; hard to match shadcn + Legacy parity |
| Ant Design / MUI full stack | Second visual system |
| Tremor | KPI-focused; not Ledger/instance tables |
| Radix Themes as skin | We use Tailwind + tokens |

Borrow **patterns** from Carbon / Atlassian compact tables; do not import their React packages for greenfield UI.

---

## 8. Migration & API phase

- **Done.** Phase 1 (new frontend on the Legacy API) and Phase 2 (domain by domain onto `bifrost-trade-api`) are complete; the Legacy frontend and API were archived under spine **D8** (2026-06-29)
- API targets come from `.env.development.local` / `.env.development.k3s` (`VITE_API_*`); daily acceptance is local Vite `:5173` against DEV (D-IL1)
- No `App.css` imports; Legacy CSS is guarded by `npm run check:legacy-css`

---

## 9. Key repo paths

| Topic | Path |
|-------|------|
| Dense UI overview | `docs/DENSE_UI.md` |
| Agent rule | `.cursor/rules/dense-ui-system.mdc` |
| Data-display primitives | `src/components/data-display/` |
| shadcn config | `components.json` (`style: radix-nova`) |
| Legacy CSS guards | `scripts/check-legacy-css.sh`, `docs/LEGACY_CSS_CUTOFF.md` |
| Frontend architecture | `CLAUDE.md` |

---

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-05 | shadcn + Tailwind + TanStack Query locked; Next.js excluded |
| 2026-05 | Dense UI layer introduced; Legacy CSS paydown + `check:legacy-css` |
| 2026-05 | Inspector nav: shared icon + tone for tabs and collapsible section headers |
| 2026-05 | Tech Stack page added under Settings → Configuration |
| 2026-09-25 | The page moved to System › Reference and renders this file; the hand-written copy it replaced had drifted from it |

When changing locked choices, update this file (the in-app page renders it) and note in PR / `MIGRATION_TRACKING.md` if migration impact exists.
