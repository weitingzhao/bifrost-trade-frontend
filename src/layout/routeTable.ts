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
   * strike x expiry. The sidebar marks the row `stk` or `opt` from it.
   *
   * **Only for a page the design has no row for.** The design keeps this per
   * route and `ScopeMark` reads `DESIGN_SCOPE` first; the four that used to be
   * typed here were four of its nineteen, so two of the Discover leaves sat
   * unmarked beside two that did not — which reads as "this page has no unit"
   * rather than "nobody wrote it down". `scopeMark.test.ts` fails on any
   * disagreement, so a tag set here is a claim the design has not made.
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
  DOCS,
  MARKET,
  PORTFOLIO,
  REVIEW,
  RISK,
  SYSTEM,
  SYSTEM_ALIGNMENT,
  TRADE_DESK,
} from './routeCrumbs'

import { RESEARCH_ROUTES } from './routeTable.research'

export const ROUTES: readonly RouteEntry[] = [
  ...RESEARCH_ROUTES,
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
      // Package 2026-09-22.3 changed one thing here: Ask Copilot has a single
      // destination, the shell's Thread. Landed with the Ask bus. Rev
      // 2026-09-23.3 added one more: the contract face's third door into
      // Contract Greeks. Built 2026-09-23. Rev 2026-09-23.21 redrew it as the
      // §16 north-star page (hero band, tooltips, type scale, motion); built
      // the same day; the Owner signed it 2026-09-24.
      state: 'reviewing',
      rev: '2026-09-25.55',
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
    design: { state: 'aligned', rev: '2026-09-20.23', note: DESIGN_NOTES['/review'] },
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
    // Home since Rev .55 (the path stays for every link written to it).
    crumbs: MARKET,
    design: {
      state: 'reviewing',
      rev: '2026-09-25.55',
      note: DESIGN_NOTES['/review/objectives'],
    },
  },
  {
    path: '/review/proposals',
    label: 'Rule proposals',
    crumbs: REVIEW,
    design: {
      state: 'aligned',
      rev: '2026-09-23.1',
      note: DESIGN_NOTES['/review/proposals'],
    },
  },
  // ── Risk ───────────────────────────────────────────────────────────────
  {
    path: '/risk/portfolio',
    label: 'Portfolio Exposure',
    crumbs: RISK,
    design: {
      // Rev 2026-09-23.3 added the two doors into Contract Greeks, which the
      // design re-homed here: the Legs cell per row (carrying `?sym=`) and the
      // header's unfiltered one. Built 2026-09-23.
      state: 'aligned',
      rev: '2026-09-23.3',
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
      state: 'reviewing',
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
      state: 'reviewing',
      rev: '2026-09-25.55',
      note: DESIGN_NOTES['/risk/limits'],
    },
  },
  {
    path: '/risk/margin',
    label: 'Margin & Buying Power',
    crumbs: RISK,
    design: {
      state: 'reviewing',
      rev: '2026-09-25.55',
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
      rev: '2026-09-20.23',
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
  // Design Rev 2026-09-15.13 collapsed nine `/system/*` pages into
  // `/system/status` plus `/settings` (the Owner's OLTP/OLAP/Ops ruling): this
  // console answers the trader's three questions — can I trade, can I see, did
  // the data land — while diagnosis and operation belong to the Ops Console.
  // Carried out 2026-09-25: the nine forward (redirectRoutes.ts, with where
  // each capability went).
  {
    path: '/settings',
    label: 'Settings',
    crumbs: SYSTEM,
    design: {
      state: 'reviewing',
      rev: '2026-09-25.52',
      note: DESIGN_NOTES['/settings'],
    },
  },
  {
    // The design's collapse target (Owner ruling 2026-09-15). Built
    // 2026-09-22; the nine `/system/*` pages below it keep their rows and
    // their "to ask" question — where each capability lands is the Owner's.
    path: '/system/status',
    label: 'System Status',
    crumbs: SYSTEM,
    design: {
      state: 'reviewing',
      rev: '2026-09-20.16',
      note: DESIGN_NOTES['/system/status'],
    },
  },

  // ── System · Alignment ─────────────────────────────────────────────────
  // Target against actual (Owner 2026-09-25): the UI against the design, and
  // Research against its blueprint. Calibration itself is a Research route.
  { path: '/docs/design-adoption', label: 'Design Adoption', crumbs: SYSTEM_ALIGNMENT },
  { path: '/docs/research-blueprint', label: 'Blueprint', crumbs: SYSTEM_ALIGNMENT },

  // ── System · Reference ─────────────────────────────────────────────────
  { path: '/docs/tech-stack', label: 'Tech Stack', crumbs: DOCS },
  { path: '/docs/ui-design-system', label: 'UI Design System', crumbs: DOCS },
  {
    // The options half of the gallery `/docs/ui-design-system` already is. The
    // design files it under a third crumb, `Design`; this side keeps the two
    // reference crumbs and lets the page sit beside its sibling, because a
    // fold with one row is a heading pretending to be a place (§5a.1).
    path: '/docs/options-kit',
    label: 'Options Kit',
    crumbs: DOCS,
    design: {
      state: 'reviewing',
      rev: '2026-09-17.2',
      note: DESIGN_NOTES['/docs/options-kit'],
    },
  },
  ...REDIRECTS,
]

/** Everywhere you can actually go — what the Omnibar and any page list offer. */
