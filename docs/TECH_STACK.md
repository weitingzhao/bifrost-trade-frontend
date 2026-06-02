# Tech Stack — Bifrost Trade Frontend

Authoritative reference for technology choices, UI standards, and governance.  
In-app view: **Settings → Configuration → Tech Stack** (`/settings/tech-stack`).

---

## 1. Product context

Bifrost Trade Frontend is an **internal monitoring console** for a single operator:

- Data-dense tables, collapsible groups, right-hand inspectors, SSE streams
- Strong domain semantics: PnL coloring, multi-account (Host / Secondary), options / instances
- **Phase 1**: New Frontend + Legacy API — business parity validated against Legacy Frontend
- No SEO, no SSR — pure SPA

---

## 2. Locked stack (do not replace without explicit decision)

| Layer | Choice | Role |
|-------|--------|------|
| Framework | React 18 + TypeScript + Vite | SPA, fast dev/build |
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

**Dense UI** is the project’s **internal** standard for data-heavy pages (Positions, Trade Ledger, Performance, Live). It is documented in `docs/DENSE_UI.md` and enforced by `.cursor/rules/dense-ui-system.mdc`.

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
| Line tabs | `InspectorSectionNav` + `InspectorNavItem` (icon + tone) |
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

- **Phase 1 (current):** New Frontend → Legacy API (`VITE_API_*`)
- Do not migrate `bifrost-trade-api` domains until frontend business parity is proven
- Legacy Frontend is read-only reference; no `App.css` imports

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

When changing locked choices, update this file, the in-app Tech Stack page, and note in PR / `MIGRATION_TRACKING.md` if migration impact exists.
