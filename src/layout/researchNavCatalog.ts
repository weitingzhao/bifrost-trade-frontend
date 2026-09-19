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
import type { ShellNavGroup, ShellNavItem, ShellNavSubGroup } from '@bifrost/ui'
import { objectivePath } from '@/lib/harness/objectivePolicy'

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
 * writer, so the Book belongs to all three operators. Paths keep the
 * `/research/loop/` stem — deep links and app routes stay valid — but the
 * crumbs no longer claim them for the loop.
 */
export const BOOK_PAGES = {
  hypotheses: route('Hypothesis Board', '/research/loop/hypotheses', BookOpen),
  candidates: route('Candidate Pool', '/research/loop/candidates', ListFilter),
  watchlist: route('Watchlist', '/research/watchlist', Star),
}

/** One id, the design's own `fold:book`. The Journal row joins beside it in W4. */
export const BOOK_ITEM: ShellNavItem = {
  id: 'fold:book',
  label: 'The Book',
  to: BOOK_PAGES.hypotheses.to,
  icon: BookOpen,
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
  desk: route('Desk', '/research/copilot', MessageCircle),
  brief: route('Daily Brief', '/research/daily-brief', ClipboardList),
  personas: route('Personas', '/research/agent-personas', Users),
}

export const COPILOT_ITEM: ShellNavItem = {
  id: 'fold:copilot',
  label: 'Copilot',
  to: COPILOT_PAGES.desk.to,
  icon: MessageCircle,
  children: Object.values(COPILOT_PAGES),
}

/**
 * The tape. Facts, not work, so it closes the group the way the design's
 * registry draws it (`fold:market`): the market's state is worth knowing from
 * any row above it, and none of them owns it.
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
  icon: Activity,
  children: [MARKET_PAGES.live, MARKET_PAGES.radar],
}

export interface Bench {
  id: 'discover' | 'analyze' | 'validate' | 'data'
  label: string
  icon: LucideIcon
  items: ShellNavItem[]
}

/** The stations' own landing: today's discoveries, theses, backtests. */
export const WORKBENCH_PAGE = route('Pipeline', '/research/workbench', Wrench)

/** The module's standing — one dial, three operators, six stations, one book. */
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
    // those pages exist (W5).
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
    // The design's order — Signal Health leads (shell-registry `fold:data`).
    // Watchlist left for The Book (Rev 2026-09-18.2): a watchlist row is a
    // standing nomination, which makes it object layer, not data plumbing.
    // The last two rows are this side's own: Stock Screener is `staging`
    // (no design home yet, Owner to place), and Data Readiness is the one
    // business row that earns a `/system/*` crossing — kept off the front so
    // the fold's heading never leaves the domain.
    icon: Server,
    items: [
      route('Signal Health', '/research/signal-health', Activity),
      route('Lens Coverage', '/research/lens-coverage', Radar),
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

/** The flat layout the top nav and the home page read. */
export function staticResearchSubGroups(): ShellNavSubGroup[] {
  return [
    { label: '', items: [OVERVIEW_PAGE] },
    { label: 'Market', items: Object.values(MARKET_PAGES) },
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
 * the first (or where `to` points — Validate's heading lands on Backtest by
 * the design's own `to`). For a category that owns no page, this is as close
 * to a home as it gets: the row still goes somewhere.
 */
function fold(id: string, label: string, icon: LucideIcon, items: ShellNavItem[], to?: string): ShellNavItem {
  const first = items[0]
  return { id: `fold:${id}`, label, icon, to: to ?? first?.to ?? first?.id, children: items }
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
  const [discover, analyze, validate, data] = BENCHES
  return [
    OVERVIEW_PAGE,
    home(AUTOPILOT_PAGES.autopilot, [AUTOPILOT_PAGES.inbox, ...objectivesItem(ctx.objectives)]),
    home(WORKBENCH_PAGE, [
      fold(discover.id, discover.label, discover.icon, discover.items),
      fold(analyze.id, analyze.label, analyze.icon, analyze.items),
      fold(validate.id, validate.label, validate.icon, validate.items, '/research/backtest'),
      fold(data.id, data.label, data.icon, data.items),
    ]),
    BOOK_ITEM,
    COPILOT_ITEM,
    MARKET_ITEM,
  ]
}

export function buildResearchNavGroup(ctx: ResearchNavContext): ShellNavGroup {
  return {
    label: 'Research',
    icon: BookOpen,
    items: researchItems(ctx),
  }
}
