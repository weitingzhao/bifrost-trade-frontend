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
import { DESIGN_NOTES } from './designNotes'
import { REDIRECTS } from './redirectRoutes'
import type { DesignTag } from '@/lib/design/tag'

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
  /**
   * Where this page stands against `design/trade`.
   *
   * Written only for the exceptions: a page the design dissolves elsewhere
   * (`moving`), one it has no home for (`staging`), and one already walked
   * (`aligned`). Everything else is `pending` by derivation — see
   * `src/lib/design/adoption.ts`, and `/docs/design-adoption` for the readout.
   */
  design?: DesignTag
}

// Market is a fold inside Research, not a group of its own — see `navConfig.ts`.
import {
  ANALYZE,
  AUTOPILOT,
  COPILOT,
  DATA,
  DISCOVER,
  DOCS,
  MARKET,
  PORTFOLIO,
  RESEARCH,
  RISK,
  STRATEGY,
  SYSTEM_CONFIG,
  SYSTEM_DATA,
  SYSTEM_RUNTIME,
  TRADE,
  VALIDATE,
} from './routeCrumbs'

export const ROUTES: readonly RouteEntry[] = [
  { path: '/research/overview', label: 'Overview', crumbs: RESEARCH },
  { path: '/research/workbench', label: 'Workbench', crumbs: RESEARCH },

  // ── Research · Autopilot ───────────────────────────────────────────────
  { path: '/research/loop/harness', label: 'Autopilot', crumbs: RESEARCH },
  {
    path: '/research/loop/decisions',
    label: 'Decision Inbox',
    crumbs: AUTOPILOT,
    design: {
      state: 'aligned',
      rev: '2026-09-15.5',
      note: DESIGN_NOTES['/research/loop/decisions'],
    },
  },
  { path: '/research/loop/hypotheses', label: 'Hypothesis Board', crumbs: AUTOPILOT },
  { path: '/research/loop/candidates', label: 'Candidate Pool', crumbs: AUTOPILOT },
  { path: '/research/loop/objectives/:objectiveId', label: 'Objective', crumbs: AUTOPILOT },
  { path: '/research/loop/runs/:runId', label: 'Loop Run', crumbs: AUTOPILOT },

  // ── Research · Copilot (a seat-free fold since 2026-09-14 — §11.0) ─────
  // The menu row and crumbs read Research › Copilot › Desk; the page's own
  // title stays "Copilot Desk" (Design ②: the two are compatible).
  {
    path: '/research/copilot',
    label: 'Desk',
    crumbs: COPILOT,
    design: {
      state: 'aligned',
      rev: '2026-09-15.5',
      note: DESIGN_NOTES['/research/copilot'],
    },
  },
  // In the design registry since 2026-09-14 (Owner kept it — a morning agent's
  // written product, filed under the Copilot fold); its state derives from the
  // snapshot now, no tag needed.
  { path: '/research/daily-brief', label: 'Daily Brief', crumbs: COPILOT, symbolScope: true },
  {
    path: '/research/copilot/trading',
    label: 'Trading Copilot',
    crumbs: COPILOT,
    design: {
      state: 'aligned',
      rev: '2026-09-15.5',
      note: DESIGN_NOTES['/research/copilot/trading'],
    },
  },
  {
    path: '/research/agent-personas',
    label: 'Agent Personas',
    crumbs: COPILOT,
    design: {
      state: 'aligned',
      rev: '2026-09-15.5',
      note: DESIGN_NOTES['/research/agent-personas'],
    },
  },

  // ── Research · Workbench · Discover ────────────────────────────────────
  { path: '/research/explorer', label: 'Stock Explorer', crumbs: DISCOVER, scope: 'underlying' },
  { path: '/research/scan', label: 'Option Scan', crumbs: DISCOVER, scope: 'contract' },
  {
    path: '/research/momentum-radar',
    label: 'Momentum Radar',
    crumbs: DISCOVER,
    design: { state: 'moving', note: 'Stock Explorer — a tab on it, page retires (Docs Gaps B4)' },
  },
  {
    path: '/research/sepa-daily-core',
    label: 'SEPA Daily Core',
    crumbs: DISCOVER,
    design: { state: 'moving', note: 'Stock Explorer — a tab on it, page retires (Docs Gaps B4)' },
  },

  // ── Research · Workbench · Analyze ─────────────────────────────────────
  // One name, every face. The six pages this replaced are `?tab=` on it.
  {
    path: '/research/symbol',
    label: 'Symbol',
    crumbs: ANALYZE,
    symbolScope: true,
    scope: 'underlying',
    // rev is the package's own label at the walk; the design did not bump it
    // for the 2026-09-13 and 2026-09-14 rounds.
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/research/symbol'],
    },
  },

  // ── Research · Workbench · Validate ────────────────────────────────────
  { path: '/research/signal-decay', label: 'Signal Decay', crumbs: VALIDATE },
  { path: '/research/signal-decay/:symbol', label: 'Signal Decay', crumbs: VALIDATE },
  {
    path: '/research/backtest',
    label: 'Backtest',
    crumbs: VALIDATE,
    symbolScope: true,
    design: {
      state: 'moving',
      note: DESIGN_NOTES['/research/backtest'],
    },
  },

  // ── Research · Workbench · Data ────────────────────────────────────────
  { path: '/research/lens-coverage', label: 'Lens Coverage', crumbs: DATA },
  { path: '/research/signal-health', label: 'Signal Health', crumbs: DATA },
  { path: '/research/watchlist', label: 'Stock Watchlist', crumbs: DATA },
  {
    path: '/research/stock-screener',
    label: 'Stock Screener',
    crumbs: DATA,
    design: {
      state: 'staging',
      note: "The design's Discover › Screener has Stocks (= our Explorer) and Contracts; /research/screener there is the screener home, which is our Option Screener. Same paths, different meanings — needs untangling",
    },
  },
  // The design's Discover › Screener has Stocks and Contracts under it, and
  // this page is Contracts (Design 2026-09-15). `/research/screener` is the
  // design's screener home, which the app has not built, so the page moves off
  // that path rather than squatting on it.
  { path: '/research/contract-screener', label: 'Option Screener', crumbs: DISCOVER },
  { path: '/research/greeks', label: 'Contract Greeks', crumbs: DATA, scope: 'contract' },

  // ── Research · Market ──────────────────────────────────────────────────
  { path: '/market/live', label: 'Live', crumbs: MARKET },
  { path: '/research/event-radar', label: 'Event Radar', crumbs: MARKET },

  // ── Portfolio ──────────────────────────────────────────────────────────
  {
    path: '/portfolio/performance',
    label: 'Performance',
    crumbs: PORTFOLIO,
    design: {
      state: 'aligned',
      rev: '2026-09-17.2',
      note: DESIGN_NOTES['/portfolio/performance'],
    },
  },
  {
    path: '/portfolio/positions',
    label: 'Positions',
    crumbs: PORTFOLIO,
    symbolScope: true,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/portfolio/positions'],
    },
  },
  {
    path: '/portfolio/pnl-explain',
    label: 'P&L Explain',
    crumbs: PORTFOLIO,
    design: {
      state: 'reviewing',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/portfolio/pnl-explain'],
    },
  },
  {
    path: '/portfolio/backing',
    label: 'Backing & Model',
    crumbs: PORTFOLIO,
    symbolScope: true,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/portfolio/backing'],
    },
  },
  {
    path: '/portfolio/outcome',
    label: 'Outcome',
    crumbs: PORTFOLIO,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/portfolio/outcome'],
    },
  },
  // ── Risk ───────────────────────────────────────────────────────────────
  {
    path: '/risk/portfolio',
    label: 'Portfolio Exposure',
    crumbs: RISK,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/risk/portfolio'],
    },
  },
  {
    path: '/risk/limits',
    label: 'Limits & Breaches',
    crumbs: RISK,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/risk/limits'],
    },
  },
  {
    path: '/risk/margin',
    label: 'Margin & Buying Power',
    crumbs: RISK,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/risk/margin'],
    },
  },
  {
    path: '/risk/stress',
    label: 'Stress & Scenario',
    crumbs: RISK,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/risk/stress'],
    },
  },
  {
    path: '/portfolio/accounts',
    label: 'Accounts',
    crumbs: PORTFOLIO,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/portfolio/accounts'],
    },
  },
  {
    path: '/portfolio/ledger',
    label: 'Trade Ledger',
    crumbs: PORTFOLIO,
    symbolScope: true,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/portfolio/ledger'],
    },
  },
  {
    path: '/portfolio/transfer',
    label: 'Transfer & Pay',
    crumbs: PORTFOLIO,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/portfolio/transfer'],
    },
  },

  // ── Trade ──────────────────────────────────────────────────────────────
  {
    path: '/trade/fills',
    label: 'Orders & Fills',
    crumbs: TRADE,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/trade/fills'],
    },
  },
  {
    path: '/trade/assignment',
    label: 'Assignment',
    crumbs: TRADE,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/trade/assignment'],
    },
  },
  {
    path: '/trade/expiration',
    label: 'Expiration',
    crumbs: TRADE,
    design: {
      state: 'reviewing',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/trade/expiration'],
    },
  },
  {
    path: '/trade/playbook',
    label: 'Playbook',
    crumbs: TRADE,
  },
  {
    path: '/trade/plans',
    label: 'Plans',
    crumbs: TRADE,
    symbolScope: true,
    design: {
      state: 'reviewing',
      rev: '2026-09-15.5',
      note: DESIGN_NOTES['/trade/plans'],
    },
  },

  // ── Strategy ───────────────────────────────────────────────────────────
  {
    path: '/strategy/instances',
    label: 'Instances',
    crumbs: STRATEGY,
    symbolScope: true,
    design: {
      state: 'moving',
      note: DESIGN_NOTES['/strategy/instances'],
    },
  },
  {
    path: '/strategy/instances/:instanceId',
    label: 'Instances',
    crumbs: STRATEGY,
    symbolScope: true,
  },
  {
    path: '/strategy/win-rate',
    label: 'Win Rate',
    crumbs: STRATEGY,
    design: {
      state: 'moving',
      note: DESIGN_NOTES['/strategy/win-rate'],
    },
  },
  {
    path: '/strategy/allocations',
    label: 'Allocations',
    crumbs: STRATEGY,
    design: { state: 'moving', note: 'Trade › Rules — the Allocations · gates column' },
  },
  {
    path: '/strategy/opportunities',
    label: 'Opportunity',
    crumbs: STRATEGY,
    design: { state: 'moving', note: 'Trade › Rules — the Opportunities column' },
  },
  {
    path: '/strategy/structures',
    label: 'Structure',
    crumbs: STRATEGY,
    design: { state: 'moving', note: 'Trade › Rules — the Structures column' },
  },
  {
    path: '/strategy/option-category',
    label: 'Option Category',
    crumbs: STRATEGY,
    design: {
      state: 'moving',
      note: DESIGN_NOTES['/strategy/option-category'],
    },
  },
  {
    path: '/strategy/gates',
    label: 'Gates',
    crumbs: STRATEGY,
    design: {
      state: 'moving',
      note: DESIGN_NOTES['/strategy/gates'],
    },
  },

  // ── System ─────────────────────────────────────────────────────────────
  // Design Rev 2026-09-15.13 collapsed these nine into `/system/status` plus
  // `/settings` (the Owner's OLTP/OLAP/Ops ruling): this console answers the
  // trader's three questions — can I trade, can I see, did the data land —
  // while diagnosis and operation belong to the Ops Console the sidebar footer
  // already links. The pages stay until that split is built here; each says
  // where the design sends it, so none of them sits in "to ask" without an
  // answer.
  {
    path: '/system/coverage',
    label: 'Coverage',
    crumbs: SYSTEM_DATA,
    design: {
      state: 'staging',
      note: DESIGN_NOTES['/system/coverage'],
    },
  },
  {
    path: '/system/feed',
    label: 'Feed',
    crumbs: SYSTEM_DATA,
    design: {
      state: 'staging',
      note: DESIGN_NOTES['/system/feed'],
    },
  },
  {
    path: '/system/data-readiness',
    label: 'Data Readiness',
    crumbs: SYSTEM_DATA,
    design: {
      state: 'staging',
      note: DESIGN_NOTES['/system/data-readiness'],
    },
  },
  {
    path: '/system/topology',
    label: 'Topology',
    crumbs: SYSTEM_RUNTIME,
    design: {
      state: 'staging',
      note: DESIGN_NOTES['/system/topology'],
    },
  },
  {
    path: '/system/daemon',
    label: 'Daemon',
    crumbs: SYSTEM_RUNTIME,
    design: {
      state: 'staging',
      note: DESIGN_NOTES['/system/daemon'],
    },
  },
  {
    path: '/system/api',
    label: 'API Health',
    crumbs: SYSTEM_RUNTIME,
    design: {
      state: 'staging',
      note: DESIGN_NOTES['/system/api'],
    },
  },
  {
    path: '/system/socket',
    label: 'Socket',
    crumbs: SYSTEM_RUNTIME,
    design: {
      state: 'staging',
      note: DESIGN_NOTES['/system/socket'],
    },
  },
  {
    path: '/system/platform',
    label: 'Platform',
    crumbs: SYSTEM_RUNTIME,
    design: {
      state: 'staging',
      note: DESIGN_NOTES['/system/platform'],
    },
  },
  {
    path: '/system/ib',
    label: 'IB Connection',
    crumbs: SYSTEM_CONFIG,
    design: {
      state: 'staging',
      note: DESIGN_NOTES['/system/ib'],
    },
  },

  // ── System · Reference ─────────────────────────────────────────────────
  { path: '/docs/design-adoption', label: 'Design Adoption', crumbs: DOCS },
  { path: '/docs/research-blueprint', label: 'Research Blueprint', crumbs: DOCS },
  { path: '/docs/research-calibration', label: 'Research Calibration', crumbs: DOCS },
  { path: '/docs/tech-stack', label: 'Tech Stack', crumbs: DOCS },
  { path: '/docs/ui-design-system', label: 'UI Design System', crumbs: DOCS },
  ...REDIRECTS,
]

/** Everywhere you can actually go — what the Omnibar and any page list offer. */
export const PAGE_ROUTES: readonly RouteEntry[] = ROUTES.filter((r) => !r.redirect)

/** The old names, each with the path it now resolves to. `router.tsx` builds its rows from this. */
export const REDIRECT_ROUTES: readonly (RouteEntry & { redirect: string })[] = ROUTES.filter(
  (r): r is RouteEntry & { redirect: string } => typeof r.redirect === 'string'
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
