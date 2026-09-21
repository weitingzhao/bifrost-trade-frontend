/**
 * The route table: every path this app answers, and what the design says
 * about it.
 *
 * Split from `routeRegistry` when it crossed 800 lines. The seam is real
 * rather than a way round the gate: this file is **data** — one row per route,
 * each carrying its label, its trail and its adoption tag — and
 * `routeRegistry` is **how you ask it**, the lookups and the fallbacks. They
 * changed for different reasons and at different rates, which is the test for
 * whether a split is a split or a shuffle.
 *
 * Nothing imports this directly: `routeRegistry` re-exports `RouteEntry` and
 * `ROUTES`, so every call site is unchanged.
 */
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
  DISCOVER,
  DOCS,
  MARKET,
  PORTFOLIO,
  RESEARCH,
  RISK,
  REVIEW,
  SYSTEM_CONFIG,
  SYSTEM_DATA,
  SYSTEM_RUNTIME,
  THE_BOOK,
  TRADE_DESK,
  VALIDATE,
} from './routeCrumbs'

export const ROUTES: readonly RouteEntry[] = [
  {
    path: '/research/overview',
    // A layer's own page carries no trail and the layer's name (§5a.1 ·
    // .23): the heading *is* this page, so "Trade › Trade" would name the
    // same level twice.
    label: 'Research',
    crumbs: [],
    design: {
      state: 'aligned',
      rev: '2026-09-18.2',
      note: DESIGN_NOTES['/research/overview'],
    },
  },
  {
    path: '/research/workbench',
    label: 'Pipeline',
    crumbs: RESEARCH,
    design: {
      state: 'reviewing',
      rev: '2026-09-18.2',
      note: DESIGN_NOTES['/research/workbench'],
    },
  },

  // ── Research · Autopilot ───────────────────────────────────────────────
  {
    path: '/research/loop/harness',
    label: 'Autopilot',
    crumbs: RESEARCH,
    design: {
      state: 'aligned',
      rev: '2026-09-20.1',
      note: DESIGN_NOTES['/research/loop/harness'],
    },
  },
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
  {
    // The fold's own page (design §5a.4). Four parallel children and none of
    // them is The Book, so promoting one would make the fold an alias of one
    // of its own siblings.
    path: '/research/book',
    label: 'The Book',
    crumbs: RESEARCH,
    design: {
      state: 'aligned',
      rev: '2026-09-20.24',
      note: DESIGN_NOTES['/research/book'],
    },
  },
  {
    path: '/research/loop/hypotheses',
    label: 'Hypothesis Board',
    crumbs: THE_BOOK,
    design: {
      state: 'aligned',
      rev: '2026-09-18.2',
      note: DESIGN_NOTES['/research/loop/hypotheses'],
    },
  },
  {
    path: '/research/loop/candidates',
    label: 'Candidate Pool',
    crumbs: THE_BOOK,
    design: {
      state: 'aligned',
      rev: '2026-09-18.2',
      note: DESIGN_NOTES['/research/loop/candidates'],
    },
  },
  { path: '/research/loop/objectives/:objectiveId', label: 'Objective', crumbs: AUTOPILOT },
  { path: '/research/loop/runs/:runId', label: 'Loop Run', crumbs: AUTOPILOT },
  {
    // The Screener's `Rank by` was blocked on this page, and the design gives
    // Momentum Radar and SEPA Daily Core their home in it when they dissolve.
    path: '/research/ratings/stocks',
    label: 'Stock ratings',
    crumbs: DISCOVER,
    scope: 'underlying',
    design: {
      state: 'aligned',
      rev: '2026-09-20.10',
      note: DESIGN_NOTES['/research/ratings/stocks'],
    },
  },

  // ── Research · Copilot (a seat-free fold since 2026-09-14 — §11.0) ─────
  // The menu row and crumbs read Research › Copilot › Desk; the page's own
  // title stays "Copilot Desk" (Design ②: the two are compatible).
  {
    path: '/research/copilot',
    // The Desk is the Copilot itself since §5a: the fold's `to` was this page
    // and its first child was this page, so two rows lit for one. The row that
    // remains is named for what it is, and the trail loses the level that no
    // longer exists.
    label: 'Copilot',
    crumbs: RESEARCH,
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
    // The design's own label since the Copilot fold was drawn: under
    // Research › Copilot, "Personas" is already unambiguous, and the sidebar
    // row has read that way all along.
    label: 'Personas',
    crumbs: COPILOT,
    design: {
      state: 'aligned',
      rev: '2026-09-15.5',
      note: DESIGN_NOTES['/research/agent-personas'],
    },
  },

  // ── Research · Workbench · Discover ────────────────────────────────────
  // Out of the menu, still a route (Owner ruling 2026-09-20). It is a tab
  // shell over SEPA, Momentum and Event Radar, and the design redistributed
  // all three — the first two are lenses of Stock ratings, the third moved to
  // Home as Alerts. So it answers to no design page; what it holds is not
  // lost, it is elsewhere.
  { path: '/research/explorer', label: 'Stock Explorer', crumbs: DISCOVER, scope: 'underlying' },
  // "Vol ratings", the design's own label since package 2026-09-20.1: the page
  // rates the vol on a name, and "Option Scan" described the machinery rather
  // than the reading. `/research/ratings` is its alias in the design registry.
  { path: '/research/scan', label: 'Vol ratings', crumbs: DISCOVER, scope: 'contract' },
  {
    path: '/research/momentum-radar',
    label: 'Momentum Radar',
    crumbs: DISCOVER,
    // Was "a tab on Stock Explorer"; that destination is gone (Owner ruling
    // 2026-09-20). The design makes momentum a lens of Stock ratings —
    // `/research/ratings/stocks`, the composite with the weight sliders —
    // which is unbuilt, so this page stands until it exists.
    design: { state: 'moving', note: 'Stock ratings — a lens of its composite; that page is unbuilt' },
  },
  {
    path: '/research/sepa-daily-core',
    label: 'SEPA Daily Core',
    crumbs: DISCOVER,
    design: { state: 'moving', note: 'Stock ratings — a lens of its composite; that page is unbuilt' },
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
  // Plumbing: neither takes a symbol, and what they answer is whether the
  // machinery is filling up — which is System's question, not Research's.
  { path: '/research/lens-coverage', label: 'Lens Coverage', crumbs: SYSTEM_DATA },
  { path: '/research/signal-health', label: 'Signal Health', crumbs: SYSTEM_DATA },
  { path: '/research/watchlist', label: 'Watchlist', crumbs: THE_BOOK },
  {
    // The Book's index: the object pages hold the objects, this one holds the
    // order they were written in. No artifact store exists on this side, so
    // the page is a join across five — see `journal/journalModel.ts`.
    path: '/research/journal',
    label: 'Journal',
    crumbs: THE_BOOK,
    design: {
      state: 'aligned',
      rev: '2026-09-19.2',
      note: DESIGN_NOTES['/research/journal'],
    },
  },
  {
    // The design's **Stock screen** (Owner ruling 2026-09-20). The earlier note
    // here read the design's Screener as our Explorer; reading the prototype
    // settled it the other way. `Research Screener.dc.html` is universe →
    // criteria stages → results → lineage, and only this page has any of the
    // three: Explorer has no criteria of its own, it is a tab shell over SEPA,
    // Momentum and Event Radar.
    path: '/research/screener',
    label: 'Stock screen',
    crumbs: DISCOVER,
    design: {
      state: 'aligned',
      rev: '2026-09-20.10',
      note: DESIGN_NOTES['/research/screener'],
    },
  },
  // The design's Discover › Screener has Stocks and Contracts under it, and
  // this page is Contracts (Design 2026-09-15). `/research/screener` is the
  // design's screener home, which the app has not built, so the page moves off
  // that path rather than squatting on it.
  { path: '/research/contract-screener', label: 'Option screen', crumbs: DISCOVER },
  // Analyze, not Data. The design's rule (shell-registry, Discover fold): a
  // page that takes a symbol is a read and joins Analyze; a page that takes
  // none is pipeline plumbing and goes to System › Data. Greeks takes a
  // contract, so it reads — and it holds no menu row, because it is a tab of
  // Symbol and the tree gives places, not tabs.
  { path: '/research/greeks', label: 'Contract Greeks', crumbs: ANALYZE, scope: 'contract' },

  // ── Research · Market ──────────────────────────────────────────────────
  { path: '/market/live', label: 'Live', crumbs: MARKET },
  { path: '/research/event-radar', label: 'Event Radar', crumbs: MARKET },

  // ── Today ──────────────────────────────────────────────────
  {
    path: '/home',
    label: 'Today',
    // The design files it under no layer: it cuts across all five by time of
    // day, so it carries no breadcrumb trail of its own.
    crumbs: [],
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/home'],
    },
  },
  // ── Portfolio ──────────────────────────────────────────────────────────
  {
    // The layer's own page (design §5a.1). Two folds and neither is Portfolio,
    // so promoting one would make the layer an alias of its own child.
    path: '/portfolio',
    label: 'Portfolio',
    crumbs: [],
    design: {
      state: 'aligned',
      rev: '2026-09-20.19',
      note: DESIGN_NOTES['/portfolio'],
    },
  },
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
      rev: '2026-09-18.1',
      note: DESIGN_NOTES['/portfolio/positions'],
    },
  },
  {
    path: '/portfolio/pnl-explain',
    label: 'P&L Explain',
    crumbs: PORTFOLIO,
    design: {
      state: 'aligned',
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
  {
    path: '/portfolio/corporate-actions',
    label: 'Corporate Actions',
    crumbs: PORTFOLIO,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/portfolio/corporate-actions'],
    },
  },
  // ── Review ─────────────────────────────────────────────────
  {
    path: '/review',
    // A layer's own page carries no trail and the layer's name (§5a.1 ·
    // .23): the heading *is* this page, so "Trade › Trade" would name the
    // same level twice.
    label: 'Review',
    crumbs: [],
    design: { state: 'aligned', rev: '2026-09-17.1', note: DESIGN_NOTES['/review'] },
  },
  {
    path: '/review/fit',
    label: 'Single trade',
    crumbs: REVIEW,
    design: { state: 'aligned', rev: '2026-09-17.1', note: DESIGN_NOTES['/review/fit'] },
  },
  {
    path: '/review/habits',
    label: 'Habits',
    crumbs: REVIEW,
    design: { state: 'aligned', rev: '2026-09-17.1', note: DESIGN_NOTES['/review/habits'] },
  },
  {
    path: '/review/playbook-stats',
    label: 'Playbook stats',
    crumbs: REVIEW,
    design: { state: 'aligned', rev: '2026-09-18.1', note: DESIGN_NOTES['/review/playbook-stats'] },
  },
  {
    path: '/review/objectives',
    label: 'Objectives',
    crumbs: REVIEW,
    design: {
      state: 'aligned',
      rev: '2026-09-20.5',
      note: DESIGN_NOTES['/review/objectives'],
    },
  },
  {
    path: '/review/proposals',
    label: 'Rule proposals',
    crumbs: REVIEW,
    design: { state: 'aligned', rev: '2026-09-17.1', note: DESIGN_NOTES['/review/proposals'] },
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
    path: '/risk/budget',
    label: 'Risk Budget',
    crumbs: RISK,
    design: {
      state: 'aligned',
      rev: '2026-09-18.1',
      note: DESIGN_NOTES['/risk/budget'],
    },
  },
  {
    // The layer's own page (design §5a.1). Risk has six parallel children and
    // none of them is Risk, so promoting one would make the layer an alias of
    // its own child — the disease taken off Discover and Ratings.
    path: '/risk',
    label: 'Risk',
    crumbs: [],
    design: {
      state: 'aligned',
      rev: '2026-09-20.19',
      note: DESIGN_NOTES['/risk'],
    },
  },
  {
    path: '/risk/sizing',
    label: 'Sizing',
    crumbs: RISK,
    design: {
      state: 'aligned',
      rev: '2026-09-18.1',
      note: DESIGN_NOTES['/risk/sizing'],
    },
  },
  {
    path: '/risk/limits',
    label: 'Limits & Breaches',
    crumbs: RISK,
    design: {
      state: 'aligned',
      rev: '2026-09-18.1',
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
    crumbs: TRADE_DESK,
    design: {
      state: 'aligned',
      rev: '2026-09-18.1',
      note: DESIGN_NOTES['/trade/fills'],
    },
  },
  {
    path: '/trade/assignment',
    label: 'Assignment',
    crumbs: TRADE_DESK,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/trade/assignment'],
    },
  },
  {
    path: '/trade/desk',
    // A layer's own page carries no trail and the layer's name (§5a.1 ·
    // .23): the heading *is* this page, so "Trade › Trade" would name the
    // same level twice.
    label: 'Trade',
    crumbs: [],
    design: {
      state: 'aligned',
      rev: '2026-09-18.1',
      note: DESIGN_NOTES['/trade/desk'],
    },
  },
  {
    path: '/trade/rules',
    label: 'Rules',
    crumbs: TRADE_DESK,
    design: {
      state: 'aligned',
      rev: '2026-09-18.1',
      note: DESIGN_NOTES['/trade/rules'],
    },
  },
  {
    path: '/trade/expiration',
    label: 'Expiration',
    crumbs: TRADE_DESK,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/trade/expiration'],
    },
  },
  {
    path: '/trade/playbook',
    label: 'Playbook',
    crumbs: TRADE_DESK,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/trade/playbook'],
    },
  },
  {
    path: '/trade/plans',
    label: 'Plans',
    crumbs: TRADE_DESK,
    symbolScope: true,
    design: {
      state: 'aligned',
      rev: '2026-09-18.1',
      note: DESIGN_NOTES['/trade/plans'],
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
