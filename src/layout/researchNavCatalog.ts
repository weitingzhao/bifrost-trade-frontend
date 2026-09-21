/**
 * The Research pages as a catalog, and the one sidebar tree built from it.
 *
 * One tree, no seats (Owner ruling 2026-09-19, deciding Vision §15 Q2 the way
 * §12.3 argued: with the object layer out in the Book, both halves are short
 * enough to stand together, and a switcher that hides one of them answers
 * nothing). The Workbench seat's four folds live on as **Pipeline** — the
 * design's own destination for them (Vision §12.2: "Workbench seat (四折) →
 * Pipeline — 改名, 去 seat 化") — beside Autopilot, the engine. The seat rail,
 * the header chip and the `?seat=` deep link retired with the split.
 *
 * History, because the shape keeps its reasons: the menu once carried all
 * twenty-seven pages in every posture (Owner 2026-09-08: "why do the Copilot
 * and Workbench menus appear under the Autopilot view?"); the seats fixed
 * that by splitting, at the cost the Owner then caught — the two homes could
 * never be seen at once.
 *
 * There are no section headings either. A heading you cannot click costs a
 * row and answers nothing. The home page is the heading, which is how
 * Portfolio has read since 2026-09-07. The chevron folds; the row navigates.
 */
import {
  Activity,
  BookOpen,
  ClipboardList,
  Compass,
  Gauge,
  History,
  LayoutGrid,
  ListFilter,
  MessageCircle,
  Radar,
  ScanSearch,
  Star,
  Target,
  Terminal,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { IconComponent, ShellNavGroup, ShellNavItem, ShellNavSubGroup } from '@bifrost/ui'
import { foldGlyph, routeGlyph } from '@/lib/design/glyphs'
import { objectivePath } from '@/lib/harness/objectivePolicy'

/**
 * The design's glyph for this route when it has one, the lucide icon as the
 * fallback. Folded to an icon rail the shape is the only thing left to read,
 * and the design redrew the set so that no two rows share one — see
 * `lib/design/glyphs.tsx` for why a near-synonym from a library undoes that.
 */
function route(label: string, to: string, icon: LucideIcon, children?: ShellNavItem[]): ShellNavItem {
  return { id: to, label, to, icon: routeGlyph(to) ?? icon, children }
}

// ── The pages ────────────────────────────────────────────────────────────
export const AUTOPILOT_PAGES = {
  autopilot: route('Autopilot', '/research/loop/harness', Terminal),
  inbox: route('Decision Inbox', '/research/loop/decisions', ClipboardList),
}

/**
 * The object layer — hypotheses, candidates, the watchlist — out of the seat
 * (Vision §1.1, Rev 2026-09-18.2). A hypothesis is born on Symbol, Compare or
 * Review as often as in the loop; kept under Autopilot, your own beliefs had
 * no menu row while you worked the bench. The loop is only the most diligent
 * writer, so the Book belongs to all three operators. Paths keep the
 * `/research/loop/` stem — deep links and app routes stay valid — but the
 * crumbs no longer claim them for the loop.
 */
export const BOOK_PAGES = {
  hypotheses: route('Hypothesis Board', '/research/loop/hypotheses', BookOpen),
  candidates: route('Candidate Pool', '/research/loop/candidates', ListFilter),
  watchlist: route('Watchlist', '/research/watchlist', Star),
  // The fourth row the design's `fold:book` has always carried. It waited on
  // the page, not on the ruling — built 2026-09-21, routed the same hour,
  // because a page nobody can reach is a page nobody reads.
  journal: route('Journal', '/research/journal', History),
}

/** One id, the design's own `fold:book`. */
/**
 * A dual row since §5a.4: the fold has a page of its own now.
 *
 * It was a container because its `to` was an alias of its first child — four
 * parallel children and none of them is The Book. `/research/book` is the
 * fold's own page, so `navRowKind` reads it as dual without anything being
 * hand-set, and the id is the path so the row lights while you stand on it.
 */
export const BOOK_PAGE = '/research/book'

export const BOOK_ITEM: ShellNavItem = {
  id: BOOK_PAGE,
  label: 'The Book',
  to: BOOK_PAGE,
  icon: foldGlyph('The Book') ?? BookOpen,
  children: Object.values(BOOK_PAGES),
}

/**
 * The conversation's sediment — pages, where the conversation itself is not
 * one (Owner 2026-09-14, §11.0). "Ask the Copilot" is a command (⌘J, the
 * top-bar button, a page's Ask — `?copilot=open` stays as the deep-link
 * convention), and the Trading Copilot is a prompt catalogue reached from the
 * empty state's "The book" group, its route kept as a deep-link alias.
 */
export const COPILOT_PAGES = {
  brief: route('Daily Brief', '/research/daily-brief', ClipboardList),
  personas: route('Personas', '/research/agent-personas', Users),
}

/** The Desk itself — the fold's own page since §5a, not a row beneath it. */
export const COPILOT_DESK = '/research/copilot'

/**
 * A dual row, not a container (design §5a, 2026-09-20).
 *
 * It used to carry a `Desk` child whose route was the fold's own `to` — the
 * fold was an alias of the row directly beneath it, so clicking `Copilot`
 * selected `Desk` and left two rows lit for one page. The Desk is the fold
 * now: the label goes there, the caret opens Daily Brief and Personas.
 *
 * The id is the path, not `fold:copilot`. The sidebar matches the active row
 * by id alone, so a fold that grew into a page but kept a `fold:*` id never
 * lights while you are standing on it.
 */
export const COPILOT_ITEM: ShellNavItem = {
  id: COPILOT_DESK,
  label: 'Copilot',
  to: COPILOT_DESK,
  icon: routeGlyph(COPILOT_DESK) ?? foldGlyph('Copilot') ?? MessageCircle,
  children: Object.values(COPILOT_PAGES),
}

/**
 * The tape — under **Home** since design §5a.1, not Research.
 *
 * The old ruling read the content (these state the market's facts, and facts
 * about the market are Research's subject) and missed the axis: Home is
 * organised by time of day, and these three are the market's own clock. The
 * routes are untouched; only where they hang changed.
 */
export const MARKET_PAGES = {
  live: route('Live', '/market/live', Activity),
  /**
   * The design splits this in two — `/research/events` for the 30-day
   * calendar and `/research/event-radar` labelled `Alerts`. This page is
   * still both: it fetches the calendar alongside the alerts. It keeps its
   * own name until Events exists to take the calendar off it (W5).
   */
  radar: route('Event Radar', '/research/event-radar', Radar),
}

export const MARKET_ITEM: ShellNavItem = {
  id: 'fold:market',
  label: 'Market',
  to: MARKET_PAGES.live.to,
  icon: foldGlyph('Market') ?? Activity,
  children: [MARKET_PAGES.live, MARKET_PAGES.radar],
}

export interface Bench {
  id: 'discover' | 'analyze' | 'validate'
  label: string
  /** The design's fold glyph where it has one; a lucide icon otherwise. */
  icon: IconComponent
  items: ShellNavItem[]
}

/** The stations' own landing: today's discoveries, theses, backtests. */
export const WORKBENCH_PAGE = route('Pipeline', '/research/workbench', Wrench)

/** The module's standing — one dial, three operators, six stations, one book. */
export const OVERVIEW_PAGE = route('Overview', '/research/overview', LayoutGrid)

/**
 * Pipeline's folds. Three, since package 2026-09-20.1 dissolved Data.
 *
 * The design's rule for where a Research page lives is in `shell-registry.js`
 * beside the Discover fold and it is about what the page takes: **a page that
 * takes a symbol is a read and joins Analyze; a page that takes none is
 * pipeline plumbing and moves to System › Data.** So Contract Greeks reads
 * (and holds no row at all — it is a tab of Symbol), while Signal Health and
 * Lens Coverage are plumbing and left for System. What remained of Data after
 * that was one row, and a fold with one row is a heading pretending to be a
 * place.
 */
export const BENCHES: Bench[] = [
  {
    id: 'discover',
    label: 'Discover',
    // The design's Discover holds two homes — Ratings (Stocks · Underlyings)
    // and Screener (Stocks · Contracts) — and neither home page is built yet,
    // so the fold carries their existing children flat, in the design's order
    // and under the design's labels. Folding now would point each heading at
    // its only child's route — two rows, one page, the double-selection the
    // Owner retired on 2026-09-08. `/research/screener` becomes a home in W3,
    // `/research/ratings` in the W5 sweep.
    icon: foldGlyph('Discover') ?? Compass,
    // The design's four rows. Stock ratings landed 2026-09-21 and leads the
    // fold, as this comment said it would: it is the model's own opinion, and
    // the screens below it are ways of asking about that opinion.
    //
    // Stock Explorer left this list on 2026-09-20 (Owner ruling): it is a tab
    // shell over SEPA, Momentum and Event Radar, and the design redistributed
    // all three, so it answers to no row here. Its route stays.
    items: [
      route('Stock ratings', '/research/ratings/stocks', Gauge),
      route('Vol ratings', '/research/scan', ScanSearch),
      route('Stock screen', '/research/screener', ListFilter),
      route('Option screen', '/research/contract-screener', ListFilter),
    ],
  },
  {
    id: 'analyze',
    label: 'Analyze',
    icon: foldGlyph('Analyze') ?? Radar,
    // Six rows became one page with six tabs. A row per tab would put the
    // reader back where the merge found them — leaving the name to read
    // another of its faces. The design's Compare and History rows join when
    // those pages exist (W5).
    items: [route('Symbol', '/research/symbol', BookOpen)],
  },
  {
    id: 'validate',
    label: 'Validate',
    icon: foldGlyph('Validate') ?? History,
    items: [route('Signal Decay', '/research/signal-decay', Activity), route('Backtest', '/research/backtest', History)],
  },
]

/** Every Research route the catalog knows, in one flat list. */
export function allResearchRoutes(): string[] {
  return [
    // Overview is the group's heading, not one of its rows (§5a.1), but it is
    // still a Research route this catalog answers for.
    OVERVIEW_PAGE,
    ...Object.values(AUTOPILOT_PAGES),
    ...Object.values(BOOK_PAGES),
    ...Object.values(COPILOT_PAGES),
    WORKBENCH_PAGE,
    ...BENCHES.flatMap((b) => b.items),
  ]
    .map((i) => i.to ?? i.id)
    // Two folds are pages of their own and so are not rows in any PAGES map:
    // the Copilot Desk (§5a) and The Book (§5a.4). Market's three rows moved
    // to Home (§5a.1).
    .concat(COPILOT_DESK, BOOK_PAGE)
}

/** The flat layout the top nav and the home page read. */
export function staticResearchSubGroups(): ShellNavSubGroup[] {
  return [
    { label: '', items: [OVERVIEW_PAGE] },
    { label: 'The Book', items: Object.values(BOOK_PAGES) },
    { label: 'Autopilot · unattended', items: Object.values(AUTOPILOT_PAGES) },
    { label: 'Copilot · on request', items: Object.values(COPILOT_PAGES) },
    { label: 'Pipeline · Discover', items: [WORKBENCH_PAGE, ...BENCHES[0].items] },
    ...BENCHES.slice(1).map((b) => ({ label: `Pipeline · ${b.label}`, items: b.items })),
  ]
}

// ── The tree ─────────────────────────────────────────────────────────────
export interface ObjectiveNavRow {
  id: string
  title: string
}

export interface ResearchNavContext {
  objectives: ObjectiveNavRow[]
}

/**
 * A folded entry: one row whose children are the pages. Clicking it lands on
 * the first (or where `to` points). Kept for the Objectives fold, which is a
 * row over rows the reader can genuinely go to.
 */
function fold(id: string, label: string, icon: IconComponent, items: ShellNavItem[], to?: string): ShellNavItem {
  const first = items[0]
  return { id: `fold:${id}`, label, icon, to: to ?? first?.to ?? first?.id, children: items }
}

/**
 * A group heading, not a row (§5a.7, Owner 2026-09-21).
 *
 * Discover · Analyze · Validate carried nothing of their own: each row's
 * destination was an alias of the page directly beneath it, so clicking the
 * heading selected a child while the heading stayed lit. §5a answered that
 * with the caret's shape, and the Owner's reading is that the channel is too
 * narrow — every other row in the tree is a place, and a row that looks like
 * a row reads like one whatever its caret does.
 *
 * So they stop being rows. Their nine pages rise to sit beside Autopilot's
 * own children, one depth, always visible; the heading names the run that
 * follows it and folds it away.
 */
function caption(id: string, label: string): ShellNavItem {
  return { id: `cap:${id}`, label, kind: 'caption' }
}

/**
 * A home: a real page that is also the heading for the pages beneath it.
 * The row navigates to its own page — not to the first child, the way a fold
 * does — so the heading is somewhere you can go.
 */
function home(page: ShellNavItem, children: ShellNavItem[]): ShellNavItem {
  return { id: `home:${page.id}`, label: page.label, to: page.to, icon: page.icon, children, defaultOpen: true }
}

/**
 * The objectives, folded under one row. The row lands on the first objective,
 * like every other fold: a row that goes where its children live, not where
 * its parent does (Owner, 2026-09-08: "I clicked Autopilot and Objectives was
 * selected too").
 */
function objectivesItem(objectives: ObjectiveNavRow[]): ShellNavItem[] {
  if (objectives.length === 0) return []
  const rows = objectives.map((o) => route(o.title, objectivePath(o.id), Target))
  return [fold('objectives', 'Objectives', Target, rows)]
}

/**
 * The group, top down: the standing, the engine, the stations, the state, the
 * sediment, the tape. Autopilot before Pipeline because the registry's seat
 * slot sat there and the default seat was the engine — the two homes keep
 * that reading order now that both stand.
 */
export function researchItems(ctx: ResearchNavContext): ShellNavItem[] {
  const [discover, analyze, validate] = BENCHES
  return [
    // Overview is the layer heading now (§5a.1), not a row inside it.
    home(AUTOPILOT_PAGES.autopilot, [AUTOPILOT_PAGES.inbox, ...objectivesItem(ctx.objectives)]),
    // Flat, with headings: §5a.7. Twelve rows fully open — nine pages and the
    // three captions naming them.
    home(WORKBENCH_PAGE, [
      caption(discover.id, discover.label),
      ...discover.items,
      caption(analyze.id, analyze.label),
      ...analyze.items,
      caption(validate.id, validate.label),
      ...validate.items,
    ]),
    BOOK_ITEM,
    COPILOT_ITEM,
  ]
}

export function buildResearchNavGroup(ctx: ResearchNavContext): ShellNavGroup {
  return {
    label: 'Research',
    icon: BookOpen,
    // The heading is the Overview (§5a.1): the layer's own page, so the word
    // goes there and only the chevron folds.
    to: OVERVIEW_PAGE.to,
    items: researchItems(ctx),
  }
}
