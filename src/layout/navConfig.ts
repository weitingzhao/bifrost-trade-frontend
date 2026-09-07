import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowLeftRight,
  BarChart2,
  BookOpen,
  ClipboardList,
  Compass,
  Cpu,
  Eye,
  GitBranch,
  Home,
  History,
  Layers,
  LayoutDashboard,
  LineChart,
  ListFilter,
  Network,
  PieChart,
  Radar,
  ScanSearch,
  Server,
  Settings,
  Shield,
  Star,
  Terminal,
  TrendingUp,
  Trophy,
  Users,
  Wand2,
} from 'lucide-react'
import { getAllNavItems, type ShellNavGroup, type ShellNavItem } from '@bifrost/ui'

export { getAllNavItems }

/** Trade route nav item — `id` and `to` both set to the path. */
function route(
  label: string,
  to: string,
  icon: LucideIcon,
  children?: ShellNavItem[],
): ShellNavItem {
  return { id: to, label, to, icon, children }
}

export const NAV_GROUPS: ShellNavGroup[] = [
  {
    label: 'Market',
    icon: Activity,
    defaultOpen: true,
    items: [route('Live', '/market/live', Activity)],
  },
  {
    label: 'Portfolio',
    icon: LayoutDashboard,
    subGroups: [
      {
        label: 'Overview',
        items: [
          route('Accounts', '/portfolio/accounts', LayoutDashboard),
          route('Positions', '/portfolio/positions', TrendingUp),
          route('Backing & Model', '/portfolio/backing', Layers),
          route('Performance', '/portfolio/performance', LineChart),
        ],
      },
      {
        label: 'Activity & Cash',
        items: [
          route('Trade Ledger', '/portfolio/ledger', ClipboardList),
          route('Transfer & Pay', '/portfolio/transfer', ArrowLeftRight),
        ],
      },
    ],
  },
  {
    label: 'Research',
    icon: BookOpen,
    // Grouped by how much the system does for the Owner, top down — the
    // reading the product is built around — rather than by what kind of page
    // a thing is. Routes are unchanged; only labels and order moved.
    subGroups: [
      {
        // Level 3. Objectives run unattended, get judged, rated and leashed;
        // the Owner approves. The most capable page sits first, not fourth in
        // a group named after a mechanism.
        label: 'Autopilot · unattended',
        items: [
          route('Autopilot', '/research/loop/harness', Terminal),
          route('Decision Inbox', '/research/loop/decisions', ClipboardList),
          route('Hypothesis Board', '/research/loop/hypotheses', BookOpen),
          route('Candidate Pool', '/research/loop/candidates', ListFilter),
        ],
      },
      {
        // Level 2. The models work when asked: a brief each morning, a chat
        // that reads every page, the personas and the playbook they follow.
        label: 'Copilot · on request',
        items: [
          route('Daily Brief', '/research/daily-brief', ClipboardList),
          route('Ask the Copilot', '/research?copilot=open', Home),
          route('Agent Personas', '/research/agent-personas', Users),
          route('My Trading System', '/research/playbook', BookOpen),
        ],
      },
      {
        // Level 1. The Owner opens the pages.
        label: 'Workbench · Discover',
        items: [
          route('Stock Explorer', '/research/explorer', Compass),
          route('Option Scan', '/research/scan', ScanSearch),
        ],
      },
      {
        label: 'Workbench · Analyze',
        // research-loop-automation C1 (D-RLA-1): five hubs, each with ?view= tabs.
        items: [
          route('Vol Regime', '/research/vol-regime', Radar),
          route('Dealer Levels', '/research/dealer-levels', BarChart2),
          route('Scenario Model', '/research/scenario', TrendingUp),
          route('Flow', '/research/flow', Activity),
          route('Option Discovery', '/research/discovery', Eye),
        ],
      },
      {
        label: 'Workbench · Validate',
        items: [
          route('Signal Decay', '/research/signal-decay', Activity),
          route('Backtest', '/research/backtest', History),
        ],
      },
      {
        label: 'Workbench · Data',
        items: [
          route('Stock Data Readiness', '/settings/data-readiness', Server),
          route('Signal Health', '/research/signal-health', Activity),
          route('Stock Watchlist', '/research/watchlist', Star),
          route('Stock Screener', '/research/stock-screener', ListFilter),
          route('Option Screener', '/research/screener', ListFilter),
          route('Contract Greeks', '/research/greeks', Wand2),
        ],
      },
    ],
  },
  {
    label: 'Strategy',
    icon: GitBranch,
    subGroups: [
      {
        label: 'Operations',
        items: [
          route('Instances', '/strategy/instances', GitBranch),
          route('Win Rate', '/strategy/win-rate', Trophy),
        ],
      },
      {
        label: 'Configuration',
        items: [
          route('Structure', '/strategy/structures', Cpu),
          route('Opportunity', '/strategy/opportunities', Star),
          route('Allocations', '/strategy/allocations', PieChart),
          route('Gates', '/strategy/gates', Shield),
          route('Option Category', '/strategy/option-category', Layers),
        ],
      },
    ],
  },
  {
    label: 'System',
    icon: Terminal,
    dividerBefore: true,
    items: [
      route('API', '/settings/api', Server),
      route('Daemon', '/operations/daemon', Cpu),
      route('Socket', '/settings/socket', Network),
    ],
  },
]

export const SETTINGS_ITEM: ShellNavItem = route(
  'Settings',
  '/settings/coverage/overview',
  Settings,
)

export { Settings as SETTINGS_ICON }

/** @deprecated Use getAllNavItems from @bifrost/ui */
export const getAllItems = getAllNavItems

export type NavItem = ShellNavItem
export type NavGroup = ShellNavGroup
