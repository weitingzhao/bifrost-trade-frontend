/**
 * Paths the app answers with a forward, not a page.
 *
 * Retired routes, old names and deep-link aliases the design still publishes.
 * They are routes like any other — `routeRegistry.ts` concatenates them into
 * `ROUTES` — but they are a different kind of thing from a page, and keeping
 * them here leaves that file a table of pages someone can read at a glance.
 *
 * One hop only: a redirect whose target is itself a redirect fails
 * `routeRegistry.test.ts`.
 */
import type { RouteEntry } from './routeRegistry'
import { ANALYZE, COPILOT, DATA, DISCOVER, DOCS, PORTFOLIO, STRATEGY, SYSTEM_CONFIG, SYSTEM_DATA, SYSTEM_RUNTIME } from './routeCrumbs'

export const REDIRECTS: readonly RouteEntry[] = [
  // ── Strategy, retired 2026-09-18 ───────────────────────────────────────
  // The seven pages dissolved into the chain (design DECISIONS 2026-09-12 and
  // 2026-09-18). They forward rather than 404 because every one of them has
  // been linked to from a note, a commit message and the Owner's own bookmarks
  // for months, and a rule that used to have an address should still lead
  // somewhere true.
  //
  // Each lands where its subject now lives, not all on one page: Win Rate
  // became a cut of Playbook stats, and an instance's sheet is on Positions.
  { path: '/strategy/instances', label: 'Instances', crumbs: STRATEGY, redirect: '/trade/rules?pick=instance:all' },
  // The id has to travel, which a static target cannot do — `router.tsx`
  // renders this one with a component, the way the Lab hubs are handled. The
  // row is here so the registry still names the path and the crumb.
  {
    path: '/strategy/instances/:instanceId',
    label: 'Instances',
    crumbs: STRATEGY,
    redirect: '/portfolio/positions',
  },
  { path: '/strategy/win-rate', label: 'Win Rate', crumbs: STRATEGY, redirect: '/review/playbook-stats?cut=structure' },
  { path: '/strategy/allocations', label: 'Allocations', crumbs: STRATEGY, redirect: '/trade/rules' },
  { path: '/strategy/opportunities', label: 'Opportunity', crumbs: STRATEGY, redirect: '/trade/rules' },
  { path: '/strategy/structures', label: 'Structure', crumbs: STRATEGY, redirect: '/trade/rules' },
  { path: '/strategy/gates', label: 'Gates', crumbs: STRATEGY, redirect: '/trade/rules' },
  { path: '/strategy/option-category', label: 'Option Category', crumbs: STRATEGY, redirect: '/trade/rules' },

  // ── Research · home and seats ──────────────────────────────────────────
  // The design has Overview and the seat homes but no group root, and answered
  // the open question on 2026-09-15: `/research` is Overview. It forwards
  // rather than rendering a landing of its own, so the group has one root and
  // one page behind it.
  { path: '/research', label: 'Research', redirect: '/research/overview' },

  // ── Redirect-only paths ────────────────────────────────────────────────
  // They render for one frame before `<Navigate>` fires. Named so that frame
  // shows where you are going rather than the fallback.
  {
    path: '/market/watchlist',
    label: 'Stock Watchlist',
    crumbs: DATA,
    redirect: '/research/watchlist',
  },
  {
    path: '/research/sepa',
    label: 'Stock screen',
    crumbs: DISCOVER,
    redirect: '/research/screener',
  },
  // Went to `/settings/data-readiness`, which is itself a redirect — two hops
  // and two history entries. Points at the page now; the test forbids the shape.
  {
    path: '/research/stock-data',
    label: 'Data Readiness',
    crumbs: SYSTEM_DATA,
    redirect: '/system/data-readiness',
  },
  {
    path: '/research/option-scan',
    label: 'Option Scan',
    crumbs: DISCOVER,
    redirect: '/research/scan',
  },
  // The design carries `/research/ratings` as an alias of the same page, with
  // the name the page now has. Both spellings reach Vol ratings, which is the
  // point of an alias — the design's registry and this one disagree about the
  // canonical path and agree about the destination.
  {
    path: '/research/ratings',
    label: 'Vol ratings',
    crumbs: DISCOVER,
    redirect: '/research/scan',
  },
  // `/research/screener` was the Option Screener's path until 2026-09-15 and
  // then a redirect to it. It is the **Stock screen** now (Owner ruling
  // 2026-09-20): the design's own address for that page, and reading the
  // prototype settled which of this side's pages it means. So it is a real
  // route again, not a redirect — and an option-screener bookmark from before
  // 2026-09-15 now lands on a stock screen. Five days of history against a
  // permanent fork between the design's address book and this one; the fork
  // costs more.
  {
    path: '/research/stock-screener',
    label: 'Stock screen',
    crumbs: DISCOVER,
    redirect: '/research/screener',
  },
  { path: '/research/risk', label: 'Daemon', crumbs: SYSTEM_RUNTIME, redirect: '/system/daemon' },
  { path: '/research/iv-radar', label: 'IV Radar', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/vrp-lab', label: 'VRP Lab', crumbs: ANALYZE, redirect: '/research/symbol' },
  {
    path: '/research/vol-surface-lab',
    label: 'Vol Surface Lab',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/research/gex-intraday',
    label: 'GEX Intraday',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/research/opex-cycle-lab',
    label: 'OpEx Cycle Lab',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/research/analysis-model',
    label: 'Analysis Model',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/research/forecast-sessions',
    label: 'Forecast Sessions',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/research/intraday-playbook',
    label: 'Intraday Playbook',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/research/order-sentiment',
    label: 'Order Sentiment',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  // The six Analyze pages the Symbol merge retired. They carry the name they
  // were retired under, not the name they resolve to: that is what someone
  // types into the Omnibar looking for them, and the destination's own name is
  // one frame away regardless.
  { path: '/research/dossier', label: 'Dossier', crumbs: ANALYZE, redirect: '/research/symbol' },
  {
    path: '/research/vol-regime',
    label: 'Vol Regime',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/research/dealer-levels',
    label: 'Dealer Levels',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  { path: '/research/scenario', label: 'Scenario', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/flow', label: 'Flow', crumbs: ANALYZE, redirect: '/research/symbol' },
  {
    path: '/research/discovery',
    label: 'Option Discovery',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/portfolio/trade-history',
    label: 'Trade Ledger',
    crumbs: PORTFOLIO,
    redirect: '/portfolio/ledger',
  },
  {
    path: '/portfolio/copilot',
    label: 'Trading Copilot',
    crumbs: COPILOT,
    redirect: '/research/copilot/trading',
  },
  {
    path: '/research/playbook',
    label: 'My Trading System',
    crumbs: COPILOT,
    redirect: '/trade/playbook',
  },
  {
    path: '/portfolio/model-analysis',
    label: 'Backing & Model',
    crumbs: PORTFOLIO,
    redirect: '/portfolio/backing#model',
  },
  { path: '/portfolio/risk', label: 'Daemon', crumbs: SYSTEM_RUNTIME, redirect: '/system/daemon' },
  // The `/settings/*` and `/operations/*` names, kept working. Bookmarks and
  // anything that linked them predate the rename and must not 404.
  { path: '/settings', label: 'Coverage', crumbs: SYSTEM_DATA, redirect: '/system/coverage' },
  {
    path: '/settings/coverage',
    label: 'Coverage',
    crumbs: SYSTEM_DATA,
    redirect: '/system/coverage',
  },
  { path: '/settings/feed', label: 'Feed', crumbs: SYSTEM_DATA, redirect: '/system/feed' },
  {
    path: '/settings/data-readiness',
    label: 'Data Readiness',
    crumbs: SYSTEM_DATA,
    redirect: '/system/data-readiness',
  },
  { path: '/settings/ib', label: 'IB Connection', crumbs: SYSTEM_CONFIG, redirect: '/system/ib' },
  { path: '/settings/api', label: 'API Health', crumbs: SYSTEM_RUNTIME, redirect: '/system/api' },
  { path: '/settings/socket', label: 'Socket', crumbs: SYSTEM_RUNTIME, redirect: '/system/socket' },
  { path: '/settings/daemon', label: 'Daemon', crumbs: SYSTEM_RUNTIME, redirect: '/system/daemon' },
  {
    path: '/operations/daemon',
    label: 'Daemon',
    crumbs: SYSTEM_RUNTIME,
    redirect: '/system/daemon',
  },
  {
    path: '/operations/platform',
    label: 'Platform',
    crumbs: SYSTEM_RUNTIME,
    redirect: '/system/platform',
  },
  { path: '/settings/subscribe', label: 'Feed', crumbs: SYSTEM_DATA, redirect: '/system/feed' },
  { path: '/settings/feed/ib', label: 'Feed', crumbs: SYSTEM_DATA, redirect: '/system/feed' },
  {
    path: '/settings/coverage/overview',
    label: 'Coverage',
    crumbs: SYSTEM_DATA,
    redirect: '/system/coverage?view=watchlist',
  },
  {
    path: '/settings/coverage/overview-detail',
    label: 'Coverage',
    crumbs: SYSTEM_DATA,
    redirect: '/system/coverage?view=watchlist',
  },
  {
    path: '/settings/coverage/option',
    label: 'Coverage',
    crumbs: SYSTEM_DATA,
    redirect: '/system/coverage?view=option',
  },
  {
    path: '/settings/coverage/stock-ib',
    label: 'Coverage',
    crumbs: SYSTEM_DATA,
    redirect: '/system/coverage?view=stock',
  },
  {
    path: '/settings/daemon-app',
    label: 'Daemon',
    crumbs: SYSTEM_RUNTIME,
    redirect: '/system/daemon',
  },
  { path: '/settings/tech-stack', label: 'Tech Stack', crumbs: DOCS, redirect: '/docs/tech-stack' },
  {
    path: '/settings/ui-design-system',
    label: 'UI Design System',
    crumbs: DOCS,
    redirect: '/docs/ui-design-system',
  },
]
