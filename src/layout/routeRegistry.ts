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
 * `Settings / API Health` from one entry, where before it rendered the
 * hand-punctuated string `Settings · API Health`.
 *
 * Redirect-only paths are in here too. They render for one frame before the
 * `<Navigate>` fires, and naming them keeps that frame from flashing the
 * fallback.
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
   * The path only redirects. Named so the breadcrumb does not flash the
   * fallback during the frame before `<Navigate>` fires, but never offered as
   * somewhere to go.
   */
  redirect?: boolean
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
const OPERATIONS = ['Operations'] as const
const SETTINGS = ['Settings'] as const
const DOCS = ['Docs'] as const

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
  { path: '/research/dossier', label: 'Dossier', crumbs: ANALYZE, symbolScope: true, scope: 'underlying' },
  { path: '/research/vol-regime', label: 'Vol Regime', crumbs: ANALYZE, symbolScope: true, scope: 'underlying' },
  { path: '/research/dealer-levels', label: 'Dealer Levels', crumbs: ANALYZE, symbolScope: true, scope: 'underlying' },
  { path: '/research/scenario', label: 'Scenario Model', crumbs: ANALYZE, symbolScope: true, scope: 'underlying' },
  { path: '/research/flow', label: 'Flow', crumbs: ANALYZE, symbolScope: true, scope: 'underlying' },
  { path: '/research/discovery', label: 'Option Discovery', crumbs: ANALYZE, symbolScope: true, scope: 'contract' },

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

  // ── Operations ─────────────────────────────────────────────────────────
  { path: '/operations/daemon', label: 'Daemon', crumbs: OPERATIONS },
  { path: '/operations/platform', label: 'Platform Plugins', crumbs: OPERATIONS },

  // ── Settings ───────────────────────────────────────────────────────────
  { path: '/settings', label: 'Settings' },
  { path: '/settings/coverage', label: 'Data Coverage', crumbs: SETTINGS },
  { path: '/settings/feed', label: 'Feed', crumbs: SETTINGS },
  { path: '/settings/data-readiness', label: 'Data Readiness', crumbs: SETTINGS },
  { path: '/settings/ib', label: 'IB Configure', crumbs: SETTINGS },
  { path: '/settings/daemon', label: 'Daemon Status', crumbs: SETTINGS },
  { path: '/settings/api', label: 'API Health', crumbs: SETTINGS },
  { path: '/settings/socket', label: 'Socket', crumbs: SETTINGS },

  // ── Docs ───────────────────────────────────────────────────────────────
  { path: '/docs/tech-stack', label: 'Tech Stack', crumbs: DOCS },
  { path: '/docs/ui-design-system', label: 'UI Design System', crumbs: DOCS },
  { path: '/docs/research-blueprint', label: 'Research Blueprint', crumbs: DOCS },
  { path: '/docs/research-calibration', label: 'Research Calibration', crumbs: DOCS },

  // ── Redirect-only paths ────────────────────────────────────────────────
  // They render for one frame before `<Navigate>` fires. Named so that frame
  // shows where you are going rather than the fallback.
  { path: '/market/watchlist', label: 'Stock Watchlist', crumbs: DATA, redirect: true },
  { path: '/research/sepa', label: 'Stock Screener', crumbs: DATA, redirect: true },
  { path: '/research/stock-data', label: 'Data Readiness', crumbs: SETTINGS, redirect: true },
  { path: '/research/option-scan', label: 'Option Scan', crumbs: DISCOVER, redirect: true },
  { path: '/research/risk', label: 'Daemon', crumbs: OPERATIONS, redirect: true },
  { path: '/research/iv-radar', label: 'IV Radar', crumbs: ANALYZE, redirect: true },
  { path: '/research/vrp-lab', label: 'VRP Lab', crumbs: ANALYZE, redirect: true },
  { path: '/research/vol-surface-lab', label: 'Vol Surface Lab', crumbs: ANALYZE, redirect: true },
  { path: '/research/gex-intraday', label: 'GEX Intraday', crumbs: ANALYZE, redirect: true },
  { path: '/research/opex-cycle-lab', label: 'OpEx Cycle Lab', crumbs: ANALYZE, redirect: true },
  { path: '/research/analysis-model', label: 'Analysis Model', crumbs: ANALYZE, redirect: true },
  { path: '/research/forecast-sessions', label: 'Forecast Sessions', crumbs: ANALYZE, redirect: true },
  { path: '/research/intraday-playbook', label: 'Intraday Playbook', crumbs: ANALYZE, redirect: true },
  { path: '/research/order-sentiment', label: 'Order Sentiment', crumbs: ANALYZE, redirect: true },
  { path: '/portfolio/trade-history', label: 'Trade Ledger', crumbs: PORTFOLIO, redirect: true },
  { path: '/portfolio/copilot', label: 'Trading Copilot', crumbs: COPILOT, redirect: true },
  { path: '/portfolio/model-analysis', label: 'Backing & Model', crumbs: PORTFOLIO, redirect: true },
  { path: '/portfolio/risk', label: 'Daemon', crumbs: OPERATIONS, redirect: true },
  { path: '/settings/subscribe', label: 'Feed', crumbs: SETTINGS, redirect: true },
  { path: '/settings/feed/ib', label: 'Feed', crumbs: SETTINGS, redirect: true },
  { path: '/settings/coverage/overview', label: 'Data Coverage', crumbs: SETTINGS, redirect: true },
  { path: '/settings/coverage/overview-detail', label: 'Data Coverage', crumbs: SETTINGS, redirect: true },
  { path: '/settings/coverage/option', label: 'Data Coverage', crumbs: SETTINGS, redirect: true },
  { path: '/settings/coverage/stock-ib', label: 'Data Coverage', crumbs: SETTINGS, redirect: true },
  { path: '/settings/daemon-app', label: 'Daemon', crumbs: OPERATIONS, redirect: true },
  { path: '/settings/tech-stack', label: 'Tech Stack', crumbs: DOCS, redirect: true },
  { path: '/settings/ui-design-system', label: 'UI Design System', crumbs: DOCS, redirect: true },
]

/** Everywhere you can actually go — what the Omnibar and any page list offer. */
export const PAGE_ROUTES: readonly RouteEntry[] = ROUTES.filter((r) => !r.redirect)

/** Shown when a pathname matches nothing — a 404, or a route added without an entry. */
export const FALLBACK_ROUTE: RouteEntry = { path: '*', label: 'Bifrost Trade', redirect: true }

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
