/**
 * The Research pages as a catalog, and the sidebar group each seat builds
 * from it.
 *
 * Three zones, in the order the Ops Console taught: what this seat looks at
 * now, the objects the work is about, and everything else folded — reachable,
 * not gone. Every route appears in every seat exactly once (a test holds that),
 * so switching seats re-lays the same twenty-nine pages rather than hiding any.
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
  brief: route('Daily Brief', '/research/daily-brief', ClipboardList),
  ask: route('Ask the Copilot', '/research?copilot=open', Home),
  personas: route('Agent Personas', '/research/agent-personas', Users),
  playbook: route('My Trading System', '/research/playbook', BookOpen),
}

export interface Bench {
  id: 'discover' | 'analyze' | 'validate' | 'data'
  label: string
  icon: LucideIcon
  items: ShellNavItem[]
}

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
    ...Object.values(AUTOPILOT_PAGES),
    ...Object.values(COPILOT_PAGES),
    ...BENCHES.flatMap((b) => b.items),
  ].map((i) => i.to ?? i.id)
}

/** The seat-less group: the three levels top down, every page visible. */
export function staticResearchSubGroups(): ShellNavSubGroup[] {
  return [
    { label: 'Autopilot · unattended', items: Object.values(AUTOPILOT_PAGES) },
    { label: 'Copilot · on request', items: Object.values(COPILOT_PAGES) },
    ...BENCHES.map((b) => ({ label: `Workbench · ${b.label}`, items: b.items })),
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

/** A folded entry: one row whose children are the pages. Clicking it lands on the first. */
function fold(label: string, icon: IconComponent, items: ShellNavItem[]): ShellNavItem {
  const first = items[0]
  return { id: `fold:${label}`, label, icon, to: first?.to ?? first?.id, children: items }
}

function foldedBenches(): ShellNavItem[] {
  return BENCHES.map((b) => fold(b.label, b.icon, b.items))
}

function objectivesItem(objectives: ObjectiveNavRow[]): ShellNavItem {
  return {
    id: 'fold:Objectives',
    label: 'Objectives',
    icon: Target,
    to: AUTOPILOT_PAGES.autopilot.to,
    children: objectives.map((o) => route(o.title, objectivePath(o.id), Target)),
  }
}

export function seatSubGroups(seat: ResearchSeat, ctx: SeatNavContext): ShellNavSubGroup[] {
  const A = AUTOPILOT_PAGES
  const C = COPILOT_PAGES
  switch (seat) {
    case 'autopilot':
      return [
        { label: 'Now', items: [A.autopilot, A.inbox] },
        { label: 'Objects', items: [objectivesItem(ctx.objectives), A.hypotheses, A.candidates] },
        { label: 'Copilot · on request', items: [fold('Copilot', MessageCircle, [C.brief, C.ask, C.personas, C.playbook])] },
        { label: 'Workbench · by hand', items: foldedBenches() },
      ]
    case 'copilot':
      return [
        { label: 'Now', items: [C.brief, C.ask] },
        { label: 'Objects', items: [objectivesItem(ctx.objectives), C.personas, C.playbook, A.hypotheses] },
        { label: 'Autopilot · unattended', items: [fold('Autopilot', Terminal, [A.autopilot, A.inbox, A.candidates])] },
        { label: 'Workbench · by hand', items: foldedBenches() },
      ]
    case 'workbench': {
      const [discover, analyze, validate, data] = BENCHES
      const explorer = discover.items[0]
      const health = data.items[1]
      return [
        { label: 'Now', items: [explorer, health] },
        { label: 'Discover', items: discover.items.filter((i) => i !== explorer) },
        { label: 'Analyze', items: analyze.items },
        { label: 'Validate', items: validate.items },
        { label: 'Data', items: [fold('Data', data.icon, data.items.filter((i) => i !== health))] },
        {
          label: 'Autopilot · Copilot',
          items: [
            fold('Autopilot', Terminal, [A.autopilot, A.inbox, A.hypotheses, A.candidates]),
            fold('Copilot', MessageCircle, [C.brief, C.ask, C.personas, C.playbook]),
          ],
        },
      ]
    }
  }
}

export function buildResearchNavGroup(seat: ResearchSeat, ctx: SeatNavContext): ShellNavGroup {
  return {
    label: 'Research',
    icon: BookOpen,
    prefix: ctx.prefix,
    subGroups: seatSubGroups(seat, ctx),
  }
}
