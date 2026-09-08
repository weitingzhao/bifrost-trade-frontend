/**
 * The Research pages as a catalog, and the sidebar group each seat builds
 * from it.
 *
 * Every seat reads the same way: this seat's home open with its pages under
 * it, the other two homes folded, Overview last. Every route appears in every
 * seat exactly once (a test holds that), so switching seats re-lays the same
 * twenty-seven pages rather than hiding any.
 *
 * There are no section headings. A heading you cannot click costs a row and
 * answers nothing, and the three headings here — "Now", "Objects", "Copilot ·
 * on request" — sat directly above a row of the same name that did the same
 * job and was a link. The home page is the heading, which is how Portfolio
 * has read since 2026-09-07 (Owner decision, extended to Research
 * 2026-09-08). The chevron still folds; the row still navigates.
 */
import type { ReactNode } from 'react'
import {
  Activity,
  BarChart2,
  BookOpen,
  ClipboardList,
  Compass,
  Eye,
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
    icon: Compass,
    items: [route('Stock Explorer', '/research/explorer', Compass), route('Option Scan', '/research/scan', ScanSearch)],
  },
  {
    id: 'analyze',
    label: 'Analyze',
    icon: Radar,
    items: [
      route('Vol Regime', '/research/vol-regime', Radar),
      route('Dealer Levels', '/research/dealer-levels', BarChart2),
      route('Scenario Model', '/research/scenario', TrendingUp),
      route('Flow', '/research/flow', Activity),
      route('Option Discovery', '/research/discovery', Eye),
    ],
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
    items: [
      route('Stock Data Readiness', '/settings/data-readiness', Server),
      route('Signal Health', '/research/signal-health', Activity),
      route('Stock Watchlist', '/research/watchlist', Star),
      route('Stock Screener', '/research/stock-screener', ListFilter),
      route('Option Screener', '/research/screener', ListFilter),
      route('Contract Greeks', '/research/greeks', Wand2),
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
  ].map((i) => i.to ?? i.id)
}

/** The seat-less group: the three levels top down, every page visible. */
export function staticResearchSubGroups(): ShellNavSubGroup[] {
  return [
    { label: '', items: [OVERVIEW_PAGE] },
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
  { open = false }: { open?: boolean } = {},
): ShellNavItem {
  return {
    id: `home:${seat}:${page.id}`,
    label,
    to: page.to,
    icon: page.icon,
    children,
    defaultOpen: open,
  }
}

function objectivesItem(seat: ResearchSeat, objectives: ObjectiveNavRow[]): ShellNavItem[] {
  if (objectives.length === 0) return []
  return [
    {
      id: `fold:${seat}:Objectives`,
      label: 'Objectives',
      icon: Target,
      to: AUTOPILOT_PAGES.autopilot.to,
      children: objectives.map((o) => route(o.title, objectivePath(o.id), Target)),
    },
  ]
}

/**
 * The seat's sidebar: three homes and Overview, in the order this seat works.
 *
 * The seat's own home is open; the other two are folded but one click from
 * their landing page. Nothing is hidden — the same twenty-seven pages are
 * reachable from every seat, just at different depths.
 */
export function seatItems(seat: ResearchSeat, ctx: SeatNavContext): ShellNavItem[] {
  const A = AUTOPILOT_PAGES
  const C = COPILOT_PAGES
  const [discover, analyze, validate, data] = BENCHES
  const objectives = objectivesItem(seat, ctx.objectives)

  /** Every bench page under Workbench, with the three page-less benches folded. */
  const benchPages = (lead: ShellNavItem[], dataItems: ShellNavItem[]): ShellNavItem[] => [
    ...lead,
    fold(seat, analyze.label, analyze.icon, analyze.items),
    fold(seat, validate.label, validate.icon, validate.items),
    fold(seat, data.label, data.icon, dataItems),
  ]

  const copilotRest = [C.brief, C.ask, C.trading, C.personas, C.playbook]

  switch (seat) {
    case 'autopilot':
      return [
        home(seat, 'Autopilot', A.autopilot, [A.inbox, ...objectives, A.hypotheses, A.candidates], { open: true }),
        home(seat, 'Copilot', C.desk, copilotRest),
        home(seat, 'Workbench', WORKBENCH_PAGE, benchPages(discover.items, data.items)),
        OVERVIEW_PAGE,
      ]
    case 'copilot':
      return [
        home(seat, 'Copilot Desk', C.desk, [...copilotRest, A.hypotheses, ...objectives], { open: true }),
        home(seat, 'Autopilot', A.autopilot, [A.inbox, A.candidates]),
        home(seat, 'Workbench', WORKBENCH_PAGE, benchPages(discover.items, data.items)),
        OVERVIEW_PAGE,
      ]
    case 'workbench': {
      // Signal Health rides up out of Data: on this seat it is the first thing
      // you check before trusting anything else on the bench.
      const health = data.items[1]
      return [
        home(
          seat,
          'Workbench',
          WORKBENCH_PAGE,
          benchPages([...discover.items, health], data.items.filter((i) => i !== health)),
          { open: true },
        ),
        home(seat, 'Autopilot', A.autopilot, [A.inbox, A.hypotheses, A.candidates]),
        home(seat, 'Copilot', C.desk, copilotRest),
        OVERVIEW_PAGE,
      ]
    }
  }
}

export function buildResearchNavGroup(seat: ResearchSeat, ctx: SeatNavContext): ShellNavGroup {
  return {
    label: 'Research',
    icon: BookOpen,
    prefix: ctx.prefix,
    items: seatItems(seat, ctx),
  }
}
