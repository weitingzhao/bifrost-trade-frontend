/**
 * The Research pages as a catalog, and the sidebar group each seat builds
 * from it.
 *
 * Each seat carries its own pages and no others. Every page belongs to exactly
 * one seat, and the rail above the menu is how you move between them — so the
 * menu answers "what can I do from here", not "what exists in Research".
 *
 * It used to carry all twenty-seven pages in every seat, the other two seats
 * folded into a row each. That made every menu mostly other menus: sitting in
 * Autopilot, two of the four top-level rows were Copilot and Workbench, which
 * the rail already offers one click away (Owner, 2026-09-08: "why do the
 * Copilot and Workbench menus appear under the Autopilot view?").
 *
 * Nothing became unreachable, because the seat now follows the route: land on
 * a page belonging to another seat and the rail moves with you
 * (`seatForRoute`). One page, one row, one lit seat.
 *
 * There are no section headings either. A heading you cannot click costs a row
 * and answers nothing, and the three that were here — "Now", "Objects",
 * "Copilot · on request" — sat directly above a row of the same name that did
 * the same job and was a link. The home page is the heading, which is how
 * Portfolio has read since 2026-09-07. The chevron folds; the row navigates.
 */
import type { ReactNode } from 'react'
import {
  Activity,
  BookOpen,
  ClipboardList,
  Compass,
  History,
  Home,
  LayoutGrid,
  ListFilter,
  MessageCircle,
  Radar,
  ScanSearch,
  Server,
  Star,
  Target,
  Terminal,
  TrendingUp,
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
  hypotheses: route('Hypothesis Board', '/research/loop/hypotheses', BookOpen),
  candidates: route('Candidate Pool', '/research/loop/candidates', ListFilter),
}

export const COPILOT_PAGES = {
  desk: route('Copilot Desk', '/research/copilot', MessageCircle),
  brief: route('Daily Brief', '/research/daily-brief', ClipboardList),
  ask: route('Ask the Copilot', '/research?copilot=open', Home),
  /** The book as it stands and the questions worth asking about it — level 2 on the Trade side. */
  trading: route('Trading Copilot', '/research/copilot/trading', TrendingUp),
  personas: route('Agent Personas', '/research/agent-personas', Users),
  playbook: route('My Trading System', '/research/playbook', BookOpen),
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

/**
 * The page the Workbench seat lifts out of `Data`.
 *
 * By path, not by position. It was `data.items[1]`, which was Signal Health
 * when it was written and became Lens Coverage the moment a row was inserted
 * above it (`5079379`, 39 commits later) — so the seat quietly lifted the
 * wrong page and buried the one the comment names. An index into a list
 * someone else maintains is not a reference to anything.
 */
export const WORKBENCH_LIFTED_FROM_DATA = '/research/signal-health'

export const BENCHES: Bench[] = [
  {
    id: 'discover',
    label: 'Discover',
    icon: Compass,
    items: [route('Stock Explorer', '/research/explorer', Compass), route('Option Scan', '/research/scan', ScanSearch)],
  },
  {
    id: 'analyze',
    label: 'Analyze',
    icon: Radar,
    // Six rows became one page with six tabs. A row per tab would put the
    // reader back where the merge found them — leaving the name to read
    // another of its faces.
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
    icon: Server,
    // Data Readiness is last, and that is load-bearing: a fold's heading
    // borrows its first child's route (`fold()` below), and this row is the
    // one business row that points into `/system/*`. First, it made clicking
    // the Research heading `Data` navigate to a System page and swap the whole
    // sidebar for the System tree — the heading of a Research section threw
    // you out of Research. Kept as a row, because "is the data there" is asked
    // from the bench as often as from the machine room; moved off the front,
    // because a heading is not the place to leave the domain.
    items: [
      route('Lens Coverage', '/research/lens-coverage', Radar),
      route('Signal Health', '/research/signal-health', Activity),
      route('Stock Watchlist', '/research/watchlist', Star),
      route('Stock Screener', '/research/stock-screener', ListFilter),
      route('Option Screener', '/research/screener', ListFilter),
      route('Contract Greeks', '/research/greeks', Wand2),
      route('Stock Data Readiness', '/system/data-readiness', Server),
    ],
  },
]

/** Every Research route the catalog knows, in one flat list. */
export function allResearchRoutes(): string[] {
  return [
    OVERVIEW_PAGE,
    ...Object.values(AUTOPILOT_PAGES),
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
  prefix?: ReactNode
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
function fold(seat: ResearchSeat, label: string, icon: IconComponent, items: ShellNavItem[]): ShellNavItem {
  const first = items[0]
  return { id: `fold:${seat}:${label}`, label, icon, to: first?.to ?? first?.id, children: items }
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
 * The seat's sidebar: one home, its pages, and Overview.
 *
 * The home is open. Everything under it belongs to this seat and to no other,
 * so the menu is short enough to read at a glance and every row is something
 * this posture actually does.
 */
export function seatItems(seat: ResearchSeat, ctx: SeatNavContext): ShellNavItem[] {
  const A = AUTOPILOT_PAGES
  const C = COPILOT_PAGES
  const [discover, analyze, validate, data] = BENCHES

  switch (seat) {
    case 'autopilot':
      return [
        home(seat, 'Autopilot', A.autopilot, [
          A.inbox,
          ...objectivesItem(seat, ctx.objectives),
          A.hypotheses,
          A.candidates,
        ]),
        MARKET_ITEM,
        OVERVIEW_PAGE,
      ]
    case 'copilot':
      return [
        home(seat, 'Copilot Desk', C.desk, [C.brief, C.ask, C.trading, C.personas, C.playbook]),
        MARKET_ITEM,
        OVERVIEW_PAGE,
      ]
    case 'workbench': {
      // Signal Health rides up out of Data: on this seat it is the first thing
      // you check before trusting anything else on the bench.
      const health = data.items.find((i) => i.to === WORKBENCH_LIFTED_FROM_DATA)!
      return [
        home(seat, 'Workbench', WORKBENCH_PAGE, [
          ...discover.items,
          health,
          fold(seat, analyze.label, analyze.icon, analyze.items),
          fold(seat, validate.label, validate.icon, validate.items),
          fold(seat, data.label, data.icon, data.items.filter((i) => i !== health)),
        ]),
        MARKET_ITEM,
        OVERVIEW_PAGE,
      ]
    }
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
  ['copilot', seatPaths(Object.values(COPILOT_PAGES))],
  ['workbench', seatPaths([WORKBENCH_PAGE, ...BENCHES.flatMap((b) => b.items)])],
]

export function buildResearchNavGroup(seat: ResearchSeat, ctx: SeatNavContext): ShellNavGroup {
  return {
    label: 'Research',
    icon: BookOpen,
    prefix: ctx.prefix,
    items: seatItems(seat, ctx),
  }
}
