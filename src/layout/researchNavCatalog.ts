/**
 * The Research pages as a catalog, and the sidebar group each seat builds
 * from it.
 *
 * Each seat carries its own pages and no others, and the seat follows the
 * route (`seatForRoute`) — there is no rail: the Vision-baseline registry
 * draws no switcher, the home row itself is the seat. You cross by the
 * design's own doors — Overview's operator cards, ⌘K, any page of the other
 * seat — so the menu answers "what can I do from here", not "what exists in
 * Research".
 *
 * It used to carry all twenty-seven pages in every seat, the other two seats
 * folded into a row each — every menu mostly other menus (Owner, 2026-09-08:
 * "why do the Copilot and Workbench menus appear under the Autopilot view?").
 * A rail then switched seats from the group top until the Vision baseline
 * retired it (2026-09-19): nothing is unreachable without it, because landing
 * on another seat's page moves the seat with you. One page, one row, one lit
 * seat.
 *
 * There are no section headings either. A heading you cannot click costs a row
 * and answers nothing, and the three that were here — "Now", "Objects",
 * "Copilot · on request" — sat directly above a row of the same name that did
 * the same job and was a link. The home page is the heading, which is how
 * Portfolio has read since 2026-09-07. The chevron folds; the row navigates.
 */
import {
  Activity,
  BookOpen,
  ClipboardList,
  Compass,
  History,
  LayoutGrid,
  ListFilter,
  MessageCircle,
  Radar,
  ScanSearch,
  Server,
  Star,
  Target,
  Terminal,
  Users,
  Wand2,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { IconComponent, ShellNavGroup, ShellNavItem, ShellNavSubGroup } from '@bifrost/ui'
import { objectivePath } from '@/lib/harness/objectivePolicy'
import type { ResearchSeat } from '@/lib/research/seat'

function route(label: string, to: string, icon: LucideIcon, children?: ShellNavItem[]): ShellNavItem {
  return { id: to, label, to, icon, children }
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
 * writer, so the Book belongs to all three operators and to no seat. Paths
 * keep the `/research/loop/` stem — deep links and app routes stay valid —
 * but the crumbs and the rail no longer claim them.
 */
export const BOOK_PAGES = {
  hypotheses: route('Hypothesis Board', '/research/loop/hypotheses', BookOpen),
  candidates: route('Candidate Pool', '/research/loop/candidates', ListFilter),
  watchlist: route('Watchlist', '/research/watchlist', Star),
}

/**
 * Seat-free like Market and Copilot: one id in every seat (`fold:book`, the
 * design's own), the row borrowing its first child's route. The design's
 * Journal row joins beside it when the page exists (batch W4).
 */
export const BOOK_ITEM: ShellNavItem = {
  id: 'fold:book',
  label: 'The Book',
  to: BOOK_PAGES.hypotheses.to,
  icon: BookOpen,
  children: Object.values(BOOK_PAGES),
}

/**
 * The conversation's sediment — pages, where the conversation itself is not
 * one (Owner 2026-09-14, §11.0). Two former rows are gone on the same
 * decision: "Ask the Copilot" is a command (⌘J, the top-bar button, a page's
 * Ask — `?copilot=open` stays as the deep-link convention), and the Trading
 * Copilot is a prompt catalogue reached from the empty state's "The book"
 * group (`all starters →`), its route kept as a deep-link alias.
 */
export const COPILOT_PAGES = {
  desk: route('Desk', '/research/copilot', MessageCircle),
  brief: route('Daily Brief', '/research/daily-brief', ClipboardList),
  personas: route('Personas', '/research/agent-personas', Users),
}

/**
 * The seat-free Copilot fold, beside Market and shaped like it: one id in
 * every seat (`fold:copilot`, the design's own), the row borrowing its first
 * child's route. Order per the design registry: Desk · Daily Brief · Personas.
 */
export const COPILOT_ITEM: ShellNavItem = {
  id: 'fold:copilot',
  label: 'Copilot',
  to: COPILOT_PAGES.desk.to,
  icon: MessageCircle,
  children: Object.values(COPILOT_PAGES),
}

/**
 * The tape. Not a posture, so not a seat.
 *
 * Design (`shell-registry.js`, `fold:market`) puts Market inside Research
 * rather than beside it: a group is defined by whose facts it states, and
 * these state the market's — the same subject Research is about. It used to be
 * a top-level group of one page here, which is a group only in the sense that
 * it had a heading.
 *
 * In the design it is a peer of the seats. Here that means it stands in all
 * three of them: whether the session is open is worth knowing from Autopilot
 * as much as from the bench, and none of the three owns it.
 */
export const MARKET_PAGES = {
  live: route('Live', '/market/live', Activity),
  /**
   * The design splits this in two — `/research/events` for the 30-day calendar
   * and `/research/event-radar` labelled `Alerts`. This page is still both: it
   * fetches the calendar alongside the alerts. It keeps its own name until
   * Events exists to take the calendar off it.
   *
   * It had no row at all before this — a live route, in the registry and the
   * breadcrumb, that the menu could not reach.
   */
  radar: route('Event Radar', '/research/event-radar', Radar),
}

/**
 * One id, not one per seat.
 *
 * `fold()` below keys by seat so an open fold in one seat is not an open fold
 * in the next. Market is the exception on purpose: it is the same fold in all
 * three, so opening it once should open it everywhere. The id matches the
 * design's own `fold:market`.
 */
export const MARKET_ITEM: ShellNavItem = {
  id: 'fold:market',
  label: 'Market',
  to: MARKET_PAGES.live.to,
  icon: Activity,
  children: [MARKET_PAGES.live, MARKET_PAGES.radar],
}

export interface Bench {
  id: 'discover' | 'analyze' | 'validate' | 'data'
  label: string
  icon: LucideIcon
  items: ShellNavItem[]
}

/** The workbench's own landing: today's discoveries, theses, backtests. */
export const WORKBENCH_PAGE = route('Workbench', '/research/workbench', Wrench)

/** The seat overview — the three postures side by side. */
export const OVERVIEW_PAGE = route('Overview', '/research/overview', LayoutGrid)

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
    icon: Compass,
    items: [
      route('Underlyings', '/research/scan', ScanSearch),
      route('Stocks', '/research/explorer', Compass),
      route('Contracts', '/research/contract-screener', ListFilter),
    ],
  },
  {
    id: 'analyze',
    label: 'Analyze',
    icon: Radar,
    // Six rows became one page with six tabs. A row per tab would put the
    // reader back where the merge found them — leaving the name to read
    // another of its faces. The design's Compare and History rows join when
    // those pages exist (batch R7).
    items: [route('Symbol', '/research/symbol', BookOpen)],
  },
  {
    id: 'validate',
    label: 'Validate',
    icon: History,
    items: [route('Signal Decay', '/research/signal-decay', Activity), route('Backtest', '/research/backtest', History)],
  },
  {
    id: 'data',
    label: 'Data',
    // The design's order — Signal Health leads (shell-registry `fold:data`),
    // which also ends the bench's old habit of lifting it out of the fold.
    // The last two rows are this side's own: Stock Screener is `staging`
    // (no design home yet, Owner to place), and Data Readiness is the one
    // business row that earns a `/system/*` crossing — kept off the front so
    // the fold's heading never leaves the domain.
    icon: Server,
    items: [
      route('Signal Health', '/research/signal-health', Activity),
      route('Lens Coverage', '/research/lens-coverage', Radar),
      // Watchlist left for The Book (Rev 2026-09-18.2): a watchlist row is a
      // standing nomination, which makes it object layer, not data plumbing.
      route('Contract Greeks', '/research/greeks', Wand2),
      route('Stock Screener', '/research/stock-screener', ListFilter),
      route('Stock Data Readiness', '/system/data-readiness', Server),
    ],
  },
]

/** Every Research route the catalog knows, in one flat list. */
export function allResearchRoutes(): string[] {
  return [
    OVERVIEW_PAGE,
    ...Object.values(AUTOPILOT_PAGES),
    ...Object.values(BOOK_PAGES),
    ...Object.values(COPILOT_PAGES),
    WORKBENCH_PAGE,
    ...BENCHES.flatMap((b) => b.items),
    ...Object.values(MARKET_PAGES),
  ].map((i) => i.to ?? i.id)
}

/** The seat-less group: the three levels top down, every page visible. */
export function staticResearchSubGroups(): ShellNavSubGroup[] {
  return [
    { label: '', items: [OVERVIEW_PAGE] },
    { label: 'Market', items: Object.values(MARKET_PAGES) },
    { label: 'The Book', items: Object.values(BOOK_PAGES) },
    { label: 'Autopilot · unattended', items: Object.values(AUTOPILOT_PAGES) },
    { label: 'Copilot · on request', items: Object.values(COPILOT_PAGES) },
    { label: 'Workbench · Discover', items: [WORKBENCH_PAGE, ...BENCHES[0].items] },
    ...BENCHES.slice(1).map((b) => ({ label: `Workbench · ${b.label}`, items: b.items })),
  ]
}

// ── Seat layouts ─────────────────────────────────────────────────────────
export interface ObjectiveNavRow {
  id: string
  title: string
}

export interface SeatNavContext {
  objectives: ObjectiveNavRow[]
}

/**
 * A folded entry: one row whose children are the pages. Clicking it lands on
 * the first. For a category that owns no page of its own — Analyze, Validate,
 * Data — this is as close to a home as it gets: the row still goes somewhere.
 *
 * The id carries the seat so an open fold in one seat is not an open fold in
 * the next — React keeps state by key, and the same key across two layouts
 * read as the layout remembering something it never chose.
 */
function fold(
  seat: ResearchSeat,
  label: string,
  icon: IconComponent,
  items: ShellNavItem[],
  to?: string,
): ShellNavItem {
  const first = items[0]
  return { id: `fold:${seat}:${label}`, label, icon, to: to ?? first?.to ?? first?.id, children: items }
}

/**
 * A home: a real page that is also the heading for the pages beneath it.
 *
 * This is the Portfolio pattern. The row navigates to its own page — not to
 * the first child, the way a fold does — so the heading is somewhere you can
 * go, and the pages under it are the rest of that area rather than an
 * expansion of a label.
 */
function home(
  seat: ResearchSeat,
  label: string,
  page: ShellNavItem,
  children: ShellNavItem[],
): ShellNavItem {
  return {
    id: `home:${seat}:${page.id}`,
    label,
    to: page.to,
    icon: page.icon,
    children,
    // The seat's only home, so it opens with the seat.
    defaultOpen: true,
  }
}

/**
 * The objectives, folded under one row.
 *
 * The row used to point at the Autopilot console, which is also the seat home
 * — so standing on the console lit two rows, and clicking either went to the
 * same place (Owner, 2026-09-08: "I clicked Autopilot and Objectives was
 * selected too"). It now lands on the first objective, like every other fold:
 * a row that goes where its children live, not where its parent does.
 */
function objectivesItem(seat: ResearchSeat, objectives: ObjectiveNavRow[]): ShellNavItem[] {
  if (objectives.length === 0) return []
  const rows = objectives.map((o) => route(o.title, objectivePath(o.id), Target))
  return [fold(seat, 'Objectives', Target, rows)]
}

/**
 * The seat's sidebar: Overview, one home with its pages, then Copilot and
 * Market — the two seat-free folds.
 *
 * The order is the design's (`shell-registry.js` `navGroups`, 2026-09-14):
 * Overview, the seat home, `fold:copilot`, `fold:market`. Overview and the
 * folds state facts rather than belonging to a workflow, so they bracket the
 * seat instead of trailing it. The home is open. Everything under it belongs
 * to this seat and to no other, so the menu is short enough to read at a
 * glance and every row is something this posture actually does.
 */
export function seatItems(seat: ResearchSeat, ctx: SeatNavContext): ShellNavItem[] {
  const A = AUTOPILOT_PAGES
  const [discover, analyze, validate, data] = BENCHES

  switch (seat) {
    case 'autopilot':
      // The seat is the engine only (Rev 2026-09-18.2): Inbox and the
      // objectives. Its former Hypotheses and Candidates rows sit in the
      // seat-free Book below — the loop writes them, it does not own them.
      return [
        OVERVIEW_PAGE,
        home(seat, 'Autopilot', A.autopilot, [A.inbox, ...objectivesItem(seat, ctx.objectives)]),
        BOOK_ITEM,
        COPILOT_ITEM,
        MARKET_ITEM,
      ]
    case 'workbench':
      // The design's Workbench home carries exactly four folds (shell-registry
      // SEAT_HOME.workbench): Discover · Analyze · Validate · Data. Validate's
      // heading lands on Backtest by the design's own `to`, not on its first
      // row.
      return [
        OVERVIEW_PAGE,
        home(seat, 'Workbench', WORKBENCH_PAGE, [
          fold(seat, discover.label, discover.icon, discover.items),
          fold(seat, analyze.label, analyze.icon, analyze.items),
          fold(seat, validate.label, validate.icon, validate.items, '/research/backtest'),
          fold(seat, data.label, data.icon, data.items),
        ]),
        BOOK_ITEM,
        COPILOT_ITEM,
        MARKET_ITEM,
      ]
  }
}

/**
 * The seat a Research route belongs to, or null when it belongs to none.
 *
 * This is what lets a seat carry only its own pages: land on a page from
 * another posture — a link out of a memo, a deep link, the browser's back
 * button — and the rail moves to the seat that page lives in, so the sidebar
 * is never showing a menu the current page is absent from. Overview is
 * deliberately seatless: it is the page about all three, so it leaves the rail
 * where it was.
 */
export function seatForRoute(pathname: string): ResearchSeat | null {
  for (const [seat, paths] of SEAT_ROUTES) {
    if (paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return seat
  }
  return null
}

/** The Research landing page. Seatless, like Overview — it introduces all three. */
const RESEARCH_ROOT = '/research'

/**
 * Pages that stand in every seat, so none of them owns one.
 *
 * `seatForRoute` must return null for these or landing on Live would drag the
 * rail to whichever seat happened to list it first.
 */
export const SEATLESS_ROUTES: readonly string[] = [
  OVERVIEW_PAGE.to!,
  ...Object.values(MARKET_PAGES).map((p) => p.to!),
  // The Book stands in both seats (Vision §12): landing on a hypothesis from
  // the bench must not drag the rail to Autopilot — the object layer belongs
  // to every operator, so it moves no seat.
  ...Object.values(BOOK_PAGES).map((p) => p.to!),
  // The Copilot fold's pages stand in both seats, as Market's do (§11.0).
  ...Object.values(COPILOT_PAGES).map((p) => p.to!),
  // Not a menu row — a deep-link alias reached from the empty state's "The
  // book" group — but landing on it must not drag the rail either.
  '/research/copilot/trading',
]

/**
 * A nav item's own path.
 *
 * The query string goes: "Ask the Copilot" is `/research?copilot=open`, a
 * command that opens the panel and strips the parameter, not a page. Stripped
 * it becomes the Research root, which is every other Research route's prefix —
 * so it is dropped from the map rather than allowed to claim the whole domain
 * for the Copilot seat.
 */
function seatPaths(items: ShellNavItem[]): string[] {
  return items.map((i) => (i.to ?? i.id).split('?')[0]).filter((p) => p !== RESEARCH_ROOT)
}

/** Where an objective's own page lives. The rows are per objective, the prefix is not. */
const OBJECTIVES_PREFIX = '/research/loop/objectives'

const SEAT_ROUTES: [ResearchSeat, string[]][] = [
  ['autopilot', [...seatPaths(Object.values(AUTOPILOT_PAGES)), OBJECTIVES_PREFIX]],
  ['workbench', seatPaths([WORKBENCH_PAGE, ...BENCHES.flatMap((b) => b.items)])],
]

export function buildResearchNavGroup(seat: ResearchSeat, ctx: SeatNavContext): ShellNavGroup {
  return {
    label: 'Research',
    icon: BookOpen,
    items: seatItems(seat, ctx),
  }
}
