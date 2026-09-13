/**
 * Every route this app renders, in one table.
 *
 * The header used to carry a 61-line map of pathname → title, and it was the
 * only thing in the app that knew a page had a name. Anything else that needs
 * to name a route — a breadcrumb, a command palette, a recent-pages list — had
 * to either duplicate that map or invent its own. This is that map, promoted to
 * the shared place, and widened by the one thing a title alone cannot say:
 * where the page sits.
 *
 * `label` is the page's own name — the leaf. `crumbs` are its ancestors,
 * outermost first, and never repeat the label. So the header can render
 * `System / Runtime / API Health` from one entry, where before it rendered
 * the hand-punctuated string `Settings · API Health`.
 *
 * Redirect-only paths are in here too, each carrying where it goes. They render
 * for one frame before the `<Navigate>` fires, and naming them keeps that frame
 * from flashing the fallback. `router.tsx` builds its redirect rows from them,
 * and the Omnibar searches them so a retired name still finds the page.
 */
import { matchPath } from 'react-router-dom'

export interface RouteEntry {
  /** Absolute path, exactly as `router.tsx` resolves it. May carry `:params`. */
  path: string
  /** The page's own name. */
  label: string
  /** Ancestors, outermost first. Omitted for top-level pages. */
  crumbs?: readonly string[]
  /**
   * The page reads `?symbol=`. Set from what the code actually does — a page
   * that only receives symbol-carrying links is not scoped; a page that reads
   * the param and narrows itself is.
   */
  symbolScope?: boolean
  /**
   * Unit of analysis, which is not the same question as where the data comes
   * from: `underlying` is one answer per symbol, `contract` is an answer per
   * strike x expiry. The sidebar marks the row `stk` or `opt` from this.
   */
  scope?: 'underlying' | 'contract'
  /**
   * The path only redirects, and this is where to.
   *
   * The target lives here rather than in `router.tsx` because it was in both:
   * 43 hand-written `<Navigate>` rows against 43 `redirect` rows, kept in step
   * by hand (`Docs Gaps.dc.html` F5). The router derives its rows from this
   * now, so a rename is one edit and the two cannot drift.
   *
   * The row keeps its own `label` and `crumbs`: they name what the path used
   * to be, which is both what the breadcrumb shows during the frame before the
   * redirect fires, and what the Omnibar searches so an old name still finds
   * the page (F5's `aliases`, kept on the old name so the name survives).
   *
   * May carry a query or hash — `/system/coverage?view=option`. Never another
   * redirect: `routeRegistry.test.ts` fails a two-hop.
   */
  redirect?: string
}

const MARKET = ['Market'] as const
const PORTFOLIO = ['Portfolio'] as const
const RESEARCH = ['Research'] as const
const AUTOPILOT = ['Research', 'Autopilot'] as const
const COPILOT = ['Research', 'Copilot'] as const
const DISCOVER = ['Research', 'Discover'] as const
const ANALYZE = ['Research', 'Analyze'] as const
const VALIDATE = ['Research', 'Validate'] as const
const DATA = ['Research', 'Data'] as const
const STRATEGY = ['Strategy'] as const
// One group, three folds. `/settings` and `/operations` were two names for one
// thing — the machine under the desk — and Settings additionally ran a second
// navigation shell of its own. Both are `/system/*` now; the old paths redirect.
const SYSTEM_DATA = ['System', 'Data'] as const
const SYSTEM_RUNTIME = ['System', 'Runtime'] as const
const SYSTEM_CONFIG = ['System', 'Configuration'] as const
const DOCS = ['System', 'Reference'] as const

export const ROUTES: readonly RouteEntry[] = [
  // ── Research · home and seats ──────────────────────────────────────────
  { path: '/research', label: 'Research' },
  { path: '/research/overview', label: 'Overview', crumbs: RESEARCH },
  { path: '/research/workbench', label: 'Workbench', crumbs: RESEARCH },

  // ── Research · Autopilot ───────────────────────────────────────────────
  { path: '/research/loop/harness', label: 'Autopilot', crumbs: RESEARCH },
  { path: '/research/loop/decisions', label: 'Decision Inbox', crumbs: AUTOPILOT },
  { path: '/research/loop/hypotheses', label: 'Hypothesis Board', crumbs: AUTOPILOT },
  { path: '/research/loop/candidates', label: 'Candidate Pool', crumbs: AUTOPILOT },
  { path: '/research/loop/objectives/:objectiveId', label: 'Objective', crumbs: AUTOPILOT },
  { path: '/research/loop/runs/:runId', label: 'Loop Run', crumbs: AUTOPILOT },

  // ── Research · Copilot ─────────────────────────────────────────────────
  { path: '/research/copilot', label: 'Copilot Desk', crumbs: RESEARCH },
  { path: '/research/daily-brief', label: 'Daily Brief', crumbs: COPILOT, symbolScope: true },
  { path: '/research/copilot/trading', label: 'Trading Copilot', crumbs: COPILOT },
  { path: '/research/agent-personas', label: 'Agent Personas', crumbs: COPILOT },
  { path: '/research/playbook', label: 'My Trading System', crumbs: COPILOT },

  // ── Research · Workbench · Discover ────────────────────────────────────
  { path: '/research/explorer', label: 'Stock Explorer', crumbs: DISCOVER, scope: 'underlying' },
  { path: '/research/scan', label: 'Option Scan', crumbs: DISCOVER, scope: 'contract' },
  { path: '/research/momentum-radar', label: 'Momentum Radar', crumbs: DISCOVER },
  { path: '/research/sepa-daily-core', label: 'SEPA Daily Core', crumbs: DISCOVER },
  { path: '/research/event-radar', label: 'Event Radar', crumbs: DISCOVER },

  // ── Research · Workbench · Analyze ─────────────────────────────────────
  // One name, every face. The six pages this replaced are `?tab=` on it.
  { path: '/research/symbol', label: 'Symbol', crumbs: ANALYZE, symbolScope: true, scope: 'underlying' },

  // ── Research · Workbench · Validate ────────────────────────────────────
  { path: '/research/signal-decay', label: 'Signal Decay', crumbs: VALIDATE },
  { path: '/research/signal-decay/:symbol', label: 'Signal Decay', crumbs: VALIDATE },
  { path: '/research/backtest', label: 'Backtest', crumbs: VALIDATE, symbolScope: true },

  // ── Research · Workbench · Data ────────────────────────────────────────
  { path: '/research/lens-coverage', label: 'Lens Coverage', crumbs: DATA },
  { path: '/research/signal-health', label: 'Signal Health', crumbs: DATA },
  { path: '/research/watchlist', label: 'Stock Watchlist', crumbs: DATA },
  { path: '/research/stock-screener', label: 'Stock Screener', crumbs: DATA },
  { path: '/research/screener', label: 'Option Screener', crumbs: DATA },
  { path: '/research/greeks', label: 'Contract Greeks', crumbs: DATA, scope: 'contract' },

  // ── Market ─────────────────────────────────────────────────────────────
  { path: '/market/live', label: 'Live', crumbs: MARKET },

  // ── Portfolio ──────────────────────────────────────────────────────────
  { path: '/portfolio/performance', label: 'Performance', crumbs: PORTFOLIO },
  { path: '/portfolio/positions', label: 'Positions', crumbs: PORTFOLIO, symbolScope: true },
  { path: '/portfolio/backing', label: 'Backing & Model', crumbs: PORTFOLIO, symbolScope: true },
  { path: '/portfolio/accounts', label: 'Accounts', crumbs: PORTFOLIO },
  { path: '/portfolio/ledger', label: 'Trade Ledger', crumbs: PORTFOLIO },
  { path: '/portfolio/transfer', label: 'Transfer & Pay', crumbs: PORTFOLIO },

  // ── Strategy ───────────────────────────────────────────────────────────
  { path: '/strategy/instances', label: 'Instances', crumbs: STRATEGY, symbolScope: true },
  { path: '/strategy/instances/:instanceId', label: 'Instances', crumbs: STRATEGY, symbolScope: true },
  { path: '/strategy/win-rate', label: 'Win Rate', crumbs: STRATEGY },
  { path: '/strategy/allocations', label: 'Allocations', crumbs: STRATEGY },
  { path: '/strategy/opportunities', label: 'Opportunity', crumbs: STRATEGY },
  { path: '/strategy/structures', label: 'Structure', crumbs: STRATEGY },
  { path: '/strategy/option-category', label: 'Option Category', crumbs: STRATEGY },
  { path: '/strategy/gates', label: 'Gates', crumbs: STRATEGY },

  // ── System ─────────────────────────────────────────────────────────────
  { path: '/system/coverage', label: 'Coverage', crumbs: SYSTEM_DATA },
  { path: '/system/feed', label: 'Feed', crumbs: SYSTEM_DATA },
  { path: '/system/data-readiness', label: 'Data Readiness', crumbs: SYSTEM_DATA },
  { path: '/system/topology', label: 'Topology', crumbs: SYSTEM_RUNTIME },
  { path: '/system/daemon', label: 'Daemon', crumbs: SYSTEM_RUNTIME },
  { path: '/system/api', label: 'API Health', crumbs: SYSTEM_RUNTIME },
  { path: '/system/socket', label: 'Socket', crumbs: SYSTEM_RUNTIME },
  { path: '/system/platform', label: 'Platform', crumbs: SYSTEM_RUNTIME },
  { path: '/system/ib', label: 'IB Connection', crumbs: SYSTEM_CONFIG },

  // ── System · Reference ─────────────────────────────────────────────────
  { path: '/docs/research-blueprint', label: 'Research Blueprint', crumbs: DOCS },
  { path: '/docs/research-calibration', label: 'Research Calibration', crumbs: DOCS },
  { path: '/docs/tech-stack', label: 'Tech Stack', crumbs: DOCS },
  { path: '/docs/ui-design-system', label: 'UI Design System', crumbs: DOCS },

  // ── Redirect-only paths ────────────────────────────────────────────────
  // They render for one frame before `<Navigate>` fires. Named so that frame
  // shows where you are going rather than the fallback.
  { path: '/market/watchlist', label: 'Stock Watchlist', crumbs: DATA, redirect: '/research/watchlist' },
  { path: '/research/sepa', label: 'Stock Screener', crumbs: DATA, redirect: '/research/stock-screener' },
  // Went to `/settings/data-readiness`, which is itself a redirect — two hops
  // and two history entries. Points at the page now; the test forbids the shape.
  { path: '/research/stock-data', label: 'Data Readiness', crumbs: SYSTEM_DATA, redirect: '/system/data-readiness' },
  { path: '/research/option-scan', label: 'Option Scan', crumbs: DISCOVER, redirect: '/research/scan' },
  { path: '/research/risk', label: 'Daemon', crumbs: SYSTEM_RUNTIME, redirect: '/system/daemon' },
  { path: '/research/iv-radar', label: 'IV Radar', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/vrp-lab', label: 'VRP Lab', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/vol-surface-lab', label: 'Vol Surface Lab', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/gex-intraday', label: 'GEX Intraday', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/opex-cycle-lab', label: 'OpEx Cycle Lab', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/analysis-model', label: 'Analysis Model', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/forecast-sessions', label: 'Forecast Sessions', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/intraday-playbook', label: 'Intraday Playbook', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/order-sentiment', label: 'Order Sentiment', crumbs: ANALYZE, redirect: '/research/symbol' },
  // The six Analyze pages the Symbol merge retired. They carry the name they
  // were retired under, not the name they resolve to: that is what someone
  // types into the Omnibar looking for them, and the destination's own name is
  // one frame away regardless.
  { path: '/research/dossier', label: 'Dossier', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/vol-regime', label: 'Vol Regime', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/dealer-levels', label: 'Dealer Levels', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/scenario', label: 'Scenario', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/flow', label: 'Flow', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/discovery', label: 'Option Discovery', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/portfolio/trade-history', label: 'Trade Ledger', crumbs: PORTFOLIO, redirect: '/portfolio/ledger' },
  { path: '/portfolio/copilot', label: 'Trading Copilot', crumbs: COPILOT, redirect: '/research/copilot/trading' },
  { path: '/portfolio/model-analysis', label: 'Backing & Model', crumbs: PORTFOLIO, redirect: '/portfolio/backing#model' },
  { path: '/portfolio/risk', label: 'Daemon', crumbs: SYSTEM_RUNTIME, redirect: '/system/daemon' },
  // The `/settings/*` and `/operations/*` names, kept working. Bookmarks and
  // anything that linked them predate the rename and must not 404.
  { path: '/settings', label: 'Coverage', crumbs: SYSTEM_DATA, redirect: '/system/coverage' },
  { path: '/settings/coverage', label: 'Coverage', crumbs: SYSTEM_DATA, redirect: '/system/coverage' },
  { path: '/settings/feed', label: 'Feed', crumbs: SYSTEM_DATA, redirect: '/system/feed' },
  { path: '/settings/data-readiness', label: 'Data Readiness', crumbs: SYSTEM_DATA, redirect: '/system/data-readiness' },
  { path: '/settings/ib', label: 'IB Connection', crumbs: SYSTEM_CONFIG, redirect: '/system/ib' },
  { path: '/settings/api', label: 'API Health', crumbs: SYSTEM_RUNTIME, redirect: '/system/api' },
  { path: '/settings/socket', label: 'Socket', crumbs: SYSTEM_RUNTIME, redirect: '/system/socket' },
  { path: '/settings/daemon', label: 'Daemon', crumbs: SYSTEM_RUNTIME, redirect: '/system/daemon' },
  { path: '/operations/daemon', label: 'Daemon', crumbs: SYSTEM_RUNTIME, redirect: '/system/daemon' },
  { path: '/operations/platform', label: 'Platform', crumbs: SYSTEM_RUNTIME, redirect: '/system/platform' },
  { path: '/settings/subscribe', label: 'Feed', crumbs: SYSTEM_DATA, redirect: '/system/feed' },
  { path: '/settings/feed/ib', label: 'Feed', crumbs: SYSTEM_DATA, redirect: '/system/feed' },
  { path: '/settings/coverage/overview', label: 'Coverage', crumbs: SYSTEM_DATA, redirect: '/system/coverage?view=watchlist' },
  { path: '/settings/coverage/overview-detail', label: 'Coverage', crumbs: SYSTEM_DATA, redirect: '/system/coverage?view=watchlist' },
  { path: '/settings/coverage/option', label: 'Coverage', crumbs: SYSTEM_DATA, redirect: '/system/coverage?view=option' },
  { path: '/settings/coverage/stock-ib', label: 'Coverage', crumbs: SYSTEM_DATA, redirect: '/system/coverage?view=stock' },
  { path: '/settings/daemon-app', label: 'Daemon', crumbs: SYSTEM_RUNTIME, redirect: '/system/daemon' },
  { path: '/settings/tech-stack', label: 'Tech Stack', crumbs: DOCS, redirect: '/docs/tech-stack' },
  { path: '/settings/ui-design-system', label: 'UI Design System', crumbs: DOCS, redirect: '/docs/ui-design-system' },
]

/** Everywhere you can actually go — what the Omnibar and any page list offer. */
export const PAGE_ROUTES: readonly RouteEntry[] = ROUTES.filter((r) => !r.redirect)

/** The old names, each with the path it now resolves to. `router.tsx` builds its rows from this. */
export const REDIRECT_ROUTES: readonly (RouteEntry & { redirect: string })[] = ROUTES.filter(
  (r): r is RouteEntry & { redirect: string } => typeof r.redirect === 'string',
)

/**
 * The old names a page answers to.
 *
 * `Docs Gaps.dc.html` F5 asks for `aliases` so that typing a retired name in
 * the Omnibar still finds the page. Rather than a second list to keep in step,
 * this inverts the redirect table: a redirect row already says "this old name
 * means that page", which is the same fact read the other way.
 *
 * Keyed by the destination with its query and hash stripped, because that is
 * the page — `/system/coverage?view=option` and `/system/coverage` are one
 * destination with two openings.
 */
const ALIASES: ReadonlyMap<string, readonly RouteEntry[]> = REDIRECT_ROUTES.reduce((map, entry) => {
  const page = entry.redirect.split(/[?#]/)[0]
  map.set(page, [...(map.get(page) ?? []), entry])
  return map
}, new Map<string, RouteEntry[]>())

export function aliasesFor(pathname: string): readonly RouteEntry[] {
  return ALIASES.get(pathname) ?? []
}

/**
 * Shown when a pathname matches nothing — a 404, or a route added without an
 * entry. Not a redirect: it has nowhere to send you. `'*'` is what keeps it out
 * of the Omnibar and the recent-pages trail.
 */
export const FALLBACK_ROUTE: RouteEntry = { path: '*', label: 'Bifrost Trade' }

const STATIC_ROUTES = new Map(ROUTES.filter((r) => !r.path.includes(':')).map((r) => [r.path, r]))
const DYNAMIC_ROUTES = ROUTES.filter((r) => r.path.includes(':'))

/**
 * The entry for a pathname, or the fallback.
 *
 * Static paths are a map lookup; only the handful carrying `:params` are
 * matched, and those are matched with the router's own matcher so the registry
 * cannot drift from how `router.tsx` resolves them.
 */
export function routeFor(pathname: string): RouteEntry {
  const exact = STATIC_ROUTES.get(pathname)
  if (exact) return exact
  for (const entry of DYNAMIC_ROUTES) {
    if (matchPath(entry.path, pathname)) return entry
  }
  return FALLBACK_ROUTE
}

/**
 * Whether a pathname belongs to the System tree rather than the business tree.
 *
 * The sidebar swaps its whole tree here instead of carrying System as a ninth
 * business group. The two are read at different times and for different
 * reasons — one is the desk, the other is the machine under it — and a reader
 * inside System is not scanning for a position. What it must NOT do is what
 * the old `SettingsLayout` did: grow a second navigation shell that also
 * dropped the breadcrumb, the Omnibar, the symbol chip and the Inbox.
 */
export function isSystemRoute(pathname: string): boolean {
  return pathname.startsWith('/system/') || pathname.startsWith('/docs/')
}
