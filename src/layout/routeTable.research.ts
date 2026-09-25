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
  RISK_EXPOSURE,
  AUTOPILOT,
  COPILOT,
  DISCOVER,
  MARKET,
  MARKET_RAIL,
  RESEARCH,
  REVIEW,
  SYSTEM_ALIGNMENT,
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
      state: 'aligned',
      rev: '2026-09-23.24',
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
      state: 'aligned',
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
      state: 'aligned',
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
      rev: '2026-09-23.1',
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
      state: 'aligned',
      rev: '2026-09-20.3',
      note: DESIGN_NOTES['/research/loop/objectives/:objectiveId'],
    },
  },
  {
    // The design's Loop Run is a surface, not a page — this route is its
    // deep-link address, and it lands on the Console with the run in the panel.
    path: '/research/loop/runs/:runId',
    label: 'Loop Run',
    crumbs: AUTOPILOT,
    design: {
      state: 'aligned',
      rev: '2026-09-18.2',
      note: DESIGN_NOTES['/research/loop/runs/:runId'],
    },
  },
  {
    // The Screener's `Rank by` was blocked on this page, and the design gives
    // Momentum Radar and SEPA Daily Core their home in it when they dissolve.
    path: '/research/ratings/stocks',
    label: 'Stock ratings',
    crumbs: DISCOVER,
    design: {
      // Re-walked 2026-09-23 against Rev .6, which is the design answering the
      // §15.2 disposition tables. Back to `reviewing`: the walk and the build
      // are this side's, and only the Owner's look puts a page in place.
      // Rev .9 adds the Leaders view — the design answering this side's own
      // ask about Momentum Radar's ranking. Re-walked 2026-09-23.
      state: 'aligned',
      rev: '2026-09-23.9',
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
      state: 'aligned',
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
      state: 'aligned',
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

  // "Vol ratings", the design's own label since package 2026-09-20.1: the page
  // rates the vol on a name, and "Option Scan" described the machinery rather
  // than the reading. `/research/ratings` is its alias in the design registry.
  {
    path: '/research/scan',
    label: 'Vol ratings',
    crumbs: DISCOVER,
    design: {
      state: 'aligned',
      rev: '2026-09-20.10',
      note: DESIGN_NOTES['/research/scan'],
    },
  },

  // ── Research · Workbench · Analyze ─────────────────────────────────────
  // One name, every face. The six pages this replaced are `?tab=` on it.
  {
    path: '/research/symbol',
    label: 'Symbol',
    crumbs: ANALYZE,
    symbolScope: true,
    // rev is the package's own label at the walk; the design did not bump it
    // for the 2026-09-13 and 2026-09-14 rounds. Built 2026-09-24: the seventh
    // face, Payoff — the one tab this side had deliberately withheld until
    // there was data behind it. Waiting for the Owner's look.
    design: {
      state: 'aligned',
      rev: '2026-09-18.2',
      note: DESIGN_NOTES['/research/symbol'],
    },
  },
  {
    // One view, the structures your rules allow. Three of its inputs are not
    // on the data plan; Rev .24's table says how each owed block is drawn.
    path: '/research/compare',
    label: 'Compare',
    crumbs: ANALYZE,
    symbolScope: true,
    design: {
      state: 'aligned',
      rev: '2026-09-23.24',
      note: DESIGN_NOTES['/research/compare'],
    },
  },
  {
    // One name against its own past. Two of its four panels wait on stores
    // (print dates, a correlation series); the note says which.
    path: '/research/history',
    label: 'History',
    crumbs: ANALYZE,
    symbolScope: true,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/research/history'],
    },
  },
  {
    // The narrative lens: the deterministic half (SEC items, vendor labels) is
    // read from research `/research/narrative`; the model half is owed. Not a
    // menu row in the design (inNav false) — reached by its path and links.
    path: '/research/narrative',
    label: 'Narrative',
    crumbs: ANALYZE,
    design: {
      state: 'reviewing',
      rev: '2026-09-23.24',
      note: DESIGN_NOTES['/research/narrative'],
    },
  },

  // ── Research · Workbench · Validate ────────────────────────────────────
  {
    path: '/research/signal-decay',
    label: 'Signal Decay',
    crumbs: VALIDATE,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: DESIGN_NOTES['/research/signal-decay'],
    },
  },
  { path: '/research/signal-decay/:symbol', label: 'Signal Decay', crumbs: VALIDATE },
  {
    // Not moving. It was tagged `moving` on Docs Index's LAB mark — *handed to
    // lab (2026-09-12.3), the Trade original is deleted* — and the design
    // voided that in Package 2026-09-23.2: the round goes LAB → OLD, the
    // registry has kept it in `Research › Validate` and in its own nav the
    // whole time, and Lab itself was dissolved on 2026-09-20. So it is an
    // ordinary unwalked page with a current prototype (Rev 2026-09-22.6), and
    // carrying a retracted classification in a worklist is clutter: the row
    // takes no tag at all and derives as `pending`.
    path: '/research/backtest',
    label: 'Backtest',
    crumbs: VALIDATE,
    symbolScope: true,
    design: {
      state: 'aligned',
      rev: '2026-09-22.6',
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
    // The Method face of History — the same IV30 recomputed against
    // denominators the reader chooses, over the store's own OHLC. Built
    // 2026-09-24; the ⧉ switch on both faces lights by itself.
    path: '/research/lab/history',
    label: 'History · method',
    crumbs: ANALYZE,
    symbolScope: true,
    design: {
      state: 'aligned',
      rev: '2026-09-20.4',
      note: DESIGN_NOTES['/research/lab/history'],
    },
  },
  {
    // The Method face of Symbol — the raw SVI fit under hand sliders, the
    // what-if grid, and the six-assumption ledger. Built 2026-09-24; the
    // ⧉ switch on both faces lights by itself.
    path: '/research/lab/symbol',
    label: 'Symbol lab',
    crumbs: ANALYZE,
    symbolScope: true,
    design: {
      state: 'aligned',
      rev: '2026-09-20.4',
      note: DESIGN_NOTES['/research/lab/symbol'],
    },
  },
  {
    // The Method face of Ratings · Stocks — the night batch's queue with the
    // evidence behind each name, in the batch's own four states. Built
    // 2026-09-24; the ⧉ switch on both faces lights by itself.
    path: '/research/lab/today',
    label: "Today's candidates",
    crumbs: DISCOVER,
    design: {
      state: 'aligned',
      rev: '2026-09-22.6',
      note: DESIGN_NOTES['/research/lab/today'],
    },
  },
  {
    // The Method face of Stock screen — the authoring face where the filter
    // vocabulary is defined against the SEPA wide table. Built 2026-09-24;
    // the ⧉ switch on both faces lights by itself. The saved-screen store
    // (6A) waits on the Owner's schema sign-off.
    path: '/research/lab/screener',
    label: 'Stock screen · method',
    crumbs: DISCOVER,
    design: {
      state: 'aligned',
      rev: '2026-09-20.4',
      note: DESIGN_NOTES['/research/lab/screener'],
    },
  },
  {
    // The design's vocabulary page for the Discover menu — a System › Data
    // reference with no data behind it, transcribed whole. Built 2026-09-24.
    path: '/research/lab/discover-model',
    label: 'Discover model',
    crumbs: SYSTEM_DATA,
    design: {
      state: 'reviewing',
      rev: '2026-09-20.4',
      note: DESIGN_NOTES['/research/lab/discover-model'],
    },
  },
  {
    // The calibration document rendered as a page — 28 contracts with their
    // evidence, the document's own smallest-change list, and the roll-up
    // disagreement it exists to surface. Built 2026-09-24; the page renders
    // the document and probes its live version stamp, it does not judge.
    path: '/research/lab/calibration',
    label: 'Calibration',
    crumbs: SYSTEM_ALIGNMENT,
    design: {
      state: 'reviewing',
      rev: '2026-09-20.4',
      note: DESIGN_NOTES['/research/lab/calibration'],
    },
  },
  {
    path: '/research/watchlist',
    label: 'Watchlist',
    crumbs: THE_BOOK,
    design: {
      state: 'aligned',
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
  // The Contracts half of the design's screener, on its own path since
  // 2026-09-15 — and since Package 2026-09-23.3 there is no other half to be
  // under. The design found its own two-level Discover to be a false
  // hierarchy (`/research/explorer` is the same file as `/research/screener`,
  // so the parent row was its own child's alias) and flattened it to four
  // leaves, which is row for row what this side already had. `/research/
  // screener` is the Stock screen leaf, not an unbuilt home.
  {
    path: '/research/contract-screener',
    label: 'Option screen',
    crumbs: DISCOVER,
    design: {
      state: 'aligned',
      rev: '2026-09-20.10',
      note: DESIGN_NOTES['/research/contract-screener'],
    },
  },
  // Risk, not Research. The design moved it on 2026-09-23 and said why the
  // earlier reasoning was wrong: the 09-19 rule read "takes a symbol → joins
  // Analyze", but this page's subject is **the whole book's option legs** and
  // the symbol is a filter on it. The 09-20 pass then cut its menu row on the
  // premise that it was a deep-link alias of a Symbol tab — and Symbol has no
  // Greeks tab, so the page was left with a prototype and no way in. The
  // design calls that its own error, not something this side failed to build.
  //
  // It holds no row of its own by design: it is the per-leg detail of
  // Portfolio Exposure, so that row lights and three doors lead here. The
  // path does not move — addresses are cheap to keep and expensive to break.
  {
    path: '/research/greeks',
    label: 'Contract Greeks',
    crumbs: RISK_EXPOSURE,
    design: {
      state: 'aligned',
      rev: '2026-09-23.3',
      note: DESIGN_NOTES['/research/greeks'],
    },
  },

  // ── Research · Market ──────────────────────────────────────────────────
  {
    // Package 2026-09-23.3 (Rev .7) moved the row, not the page: Live left
    // Home for the rail's Market group (§5a.10, Owner option B). Built
    // 2026-09-23 with the fourth rail group; waiting for the Owner's look.
    path: '/market/live',
    label: 'Live',
    crumbs: MARKET_RAIL,
    design: {
      state: 'aligned',
      rev: '2026-09-23.7',
      note: DESIGN_NOTES['/market/live'],
    },
  },
  {
    // The design's Home page for the market's own calendar, and the home
    // Explorer's events board was missing. Built 2026-09-23 against Rev
    // 2026-09-23.8, whose four-state rule is why it did not have to wait on
    // the pipeline: `unfed` is a designed reading, not a blank page.
    path: '/research/events',
    label: 'Events',
    crumbs: MARKET,
    design: {
      // Signed by the Owner 2026-09-24, after the fed rounds (macro lane,
      // themes stack, forward calendar).
      state: 'aligned',
      rev: '2026-09-23.8',
      note: DESIGN_NOTES['/research/events'],
    },
  },
  {
    // The design's `bell` glyph and its own label. The events board this route
    // used to hold is on the Stock Explorer's `events` tab, unchanged. Rev .7
    // moved the row with Live — Home to the rail's Market group; built
    // 2026-09-23; the Owner signed it 2026-09-24, the same round that fixed
    // the rail entry (a surface remembered as a page navigated nowhere).
    path: '/research/event-radar',
    label: 'Alerts',
    crumbs: MARKET_RAIL,
    design: {
      state: 'aligned',
      rev: '2026-09-23.7',
      note: DESIGN_NOTES['/research/event-radar'],
    },
  },
]
