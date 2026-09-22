/**
 * The Research layer's routes — and the equipment's, which no longer sit in it.
 *
 * Split out of `routeTable.ts` on 2026-09-22, when the shell restructure
 * (design Rev 2026-09-22.2) pushed that file past the 800-line ratchet. The
 * seam is the one the tree draws: Research is well over half of the table, and
 * it is the half this package moved.
 *
 * "Research's" is the wrong word for a third of what is here, which is the
 * point of §5a.8: Autopilot, The Book and the Copilot keep their `/research/*`
 * paths — every deep link written against them still works — while their rows
 * and their trails left the layer. They are grouped here by path, not by
 * standing.
 */
import type { RouteEntry } from './routeRegistry'
import { DESIGN_NOTES } from './designNotes'
import {
  AGENTS,
  ANALYZE,
  AUTOPILOT,
  COPILOT,
  DISCOVER,
  MARKET,
  RESEARCH,
  REVIEW,
  SYSTEM_DATA,
  THE_BOOK,
  VALIDATE,
} from './routeCrumbs'

export const RESEARCH_ROUTES: readonly RouteEntry[] = [
  {
    path: '/research/overview',
    // A layer's own page carries no trail and the layer's name (§5a.1 ·
    // .23): the heading *is* this page, so "Trade › Trade" would name the
    // same level twice.
    label: 'Research',
    crumbs: [],
    design: {
      state: 'reviewing',
      rev: '2026-09-22.2',
      note: DESIGN_NOTES['/research/overview'],
    },
  },
  {
    // §5a.9: a menu-less alias onto the layer page's census face. Its label
    // names the reading for the crumb and the Omnibar; the h1 stays the
    // layer's, which is the one row `pageTitles` excuses.
    path: '/research/workbench',
    label: 'Pipeline census',
    crumbs: RESEARCH,
    design: {
      state: 'reviewing',
      rev: '2026-09-22.2',
      note: DESIGN_NOTES['/research/workbench'],
    },
  },

  // ── Research · Autopilot ───────────────────────────────────────────────
  {
    path: '/research/loop/harness',
    label: 'Autopilot',
    crumbs: [],
    design: {
      // Package 2026-09-22.3 retired this page's own run drawer and pointed
      // its Copilot button at the one Thread. Both are landed; the Owner has
      // not looked since, and only the Owner marks a page aligned.
      state: 'reviewing',
      rev: '2026-09-22.6',
      note: DESIGN_NOTES['/research/loop/harness'],
    },
  },
  {
    path: '/research/loop/decisions',
    label: 'Decision Inbox',
    // One inbox, and it seats in Review (§5a.8). The trail follows the row.
    crumbs: REVIEW,
    design: {
      state: 'aligned',
      rev: '2026-09-18.2',
      note: DESIGN_NOTES['/research/loop/decisions'],
    },
  },
  {
    // The fold's own page (design §5a.4). Four parallel children and none of
    // them is The Book, so promoting one would make the fold an alias of one
    // of its own siblings.
    path: '/research/book',
    label: 'The Book',
    // A module home carries no trail (§5a.8): there is nothing above it now —
    // the equipment is not inside a layer, it is worn while working in one.
    crumbs: [],
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
  {
    path: '/research/loop/objectives/:objectiveId',
    label: 'Objective',
    crumbs: AUTOPILOT,
    design: {
      state: 'reviewing',
      rev: '2026-09-20.3',
      note: DESIGN_NOTES['/research/loop/objectives/:objectiveId'],
    },
  },
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
      // Package 2026-09-21.4 moved all three Copilot rows' rev while changing
      // only the Personas face; Today and Threads were untouched, so the walk
      // held at the newer stamp. Package 2026-09-22.3 then retired the page's
      // own conversation aside — which this side never grew: the Desk is a
      // page and the Thread is the shell's surface, which is exactly the two
      // avatars the design arrived at.
      state: 'reviewing',
      rev: '2026-09-22.6',
      note: DESIGN_NOTES['/research/copilot'],
    },
  },
  // In the design registry since 2026-09-14 (Owner kept it — a morning agent's
  // written product, filed under the Copilot fold); its state derives from the
  // snapshot now, no tag needed.
  // Left Copilot with the fold (§5a.8): the 9am read is Home's own clock.
  {
    path: '/research/daily-brief',
    label: 'Daily Brief',
    crumbs: MARKET,
    // It stopped reading a symbol on 2026-09-22: the design's brief is the
    // morning's reading of the book, and the per-symbol dashboard it used to
    // be is the Symbol page's six faces.
    design: {
      state: 'reviewing',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/research/daily-brief'],
    },
  },
  {
    path: '/research/copilot/trading',
    // The design's own word since Rev 2026-09-21.1, and §5a.5 keeps the h1
    // equal to it: the page is the book's starter catalogue, not a second
    // Copilot.
    label: 'Book starters',
    crumbs: COPILOT,
    design: {
      state: 'aligned',
      rev: '2026-09-21.1',
      note: DESIGN_NOTES['/research/copilot/trading'],
    },
  },
  {
    path: '/research/agent-personas',
    // §5a.8 moved the row to System › Agents — the roster answers the
    // operator's question, not the trader's — and the trail moved with it.
    label: 'Personas',
    crumbs: AGENTS,
    design: {
      state: 'aligned',
      rev: '2026-09-21.1',
      note: DESIGN_NOTES['/research/agent-personas'],
    },
  },
  {
    // Split out of Personas at Rev 2026-09-21.6: the wiring diagram answers
    // the engineer's question, the bench answers the trader's (§11.4).
    path: '/research/orchestration',
    label: 'Orchestration',
    crumbs: AGENTS,
    design: {
      state: 'aligned',
      rev: '2026-09-21.1',
      note: DESIGN_NOTES['/research/orchestration'],
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
  {
    path: '/research/scan',
    label: 'Vol ratings',
    crumbs: DISCOVER,
    scope: 'contract',
    design: {
      state: 'reviewing',
      rev: '2026-09-20.10',
      note: DESIGN_NOTES['/research/scan'],
    },
  },
  {
    path: '/research/momentum-radar',
    label: 'Momentum Radar',
    crumbs: DISCOVER,
    // Was "a tab on Stock Explorer"; that destination is gone (Owner ruling
    // 2026-09-20). The design makes momentum a lens of Stock ratings —
    // `/research/ratings/stocks`, the composite with the weight sliders —
    // which is unbuilt, so this page stands until it exists.
    design: { state: 'moving', note: 'Stock ratings — a lens of its composite, and that page is now built' },
  },
  {
    path: '/research/sepa-daily-core',
    label: 'SEPA Daily Core',
    crumbs: DISCOVER,
    design: { state: 'moving', note: 'Stock ratings — a lens of its composite, and that page is now built' },
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
      state: 'reviewing',
      rev: '2026-09-18.2',
      note: DESIGN_NOTES['/research/symbol'],
    },
  },

  // ── Research · Workbench · Validate ────────────────────────────────────
  {
    path: '/research/signal-decay',
    label: 'Signal Decay',
    crumbs: VALIDATE,
    design: {
      state: 'reviewing',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/research/signal-decay'],
    },
  },
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
  {
    path: '/research/lens-coverage',
    label: 'Lens Coverage',
    crumbs: SYSTEM_DATA,
    design: {
      state: 'reviewing',
      rev: '2026-09-19.2',
      note: DESIGN_NOTES['/research/lens-coverage'],
    },
  },
  {
    path: '/research/signal-health',
    label: 'Signal Health',
    crumbs: SYSTEM_DATA,
    design: {
      state: 'reviewing',
      rev: '2026-09-19.2',
      note: DESIGN_NOTES['/research/signal-health'],
    },
  },
  {
    path: '/research/watchlist',
    label: 'Watchlist',
    crumbs: THE_BOOK,
    design: {
      state: 'reviewing',
      rev: '2026-09-18.2',
      note: DESIGN_NOTES['/research/watchlist'],
    },
  },
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
  {
    path: '/research/contract-screener',
    label: 'Option screen',
    crumbs: DISCOVER,
    design: {
      state: 'reviewing',
      rev: '2026-09-19.2',
      note: DESIGN_NOTES['/research/contract-screener'],
    },
  },
  // Analyze, not Data. The design's rule (shell-registry, Discover fold): a
  // page that takes a symbol is a read and joins Analyze; a page that takes
  // none is pipeline plumbing and goes to System › Data. Greeks takes a
  // contract, so it reads — and it holds no menu row, because it is a tab of
  // Symbol and the tree gives places, not tabs.
  { path: '/research/greeks', label: 'Contract Greeks', crumbs: ANALYZE, scope: 'contract' },

  // ── Research · Market ──────────────────────────────────────────────────
  {
    path: '/market/live',
    label: 'Live',
    crumbs: MARKET,
    design: {
      state: 'reviewing',
      rev: '2026-09-20.16',
      note: DESIGN_NOTES['/market/live'],
    },
  },
  {
    // The design's `bell` glyph and its own label. The events board this route
    // used to hold is on the Stock Explorer's `events` tab, unchanged.
    path: '/research/event-radar',
    label: 'Alerts',
    crumbs: MARKET,
    design: {
      state: 'reviewing',
      rev: '2026-09-20.16',
      note: DESIGN_NOTES['/research/event-radar'],
    },
  },
]
