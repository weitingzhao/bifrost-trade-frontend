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
    subGroups: [
      {
        label: 'Home',
        items: [route('Research Home', '/research', Home)],
      },
      {
        label: 'Loop',
        items: [
          route('Candidate Pool', '/research/loop/candidates', ListFilter),
          route('Hypothesis Board', '/research/loop/hypotheses', BookOpen),
          route('Decision Inbox', '/research/loop/decisions', ClipboardList),
          route('Harness Console', '/research/loop/harness', Terminal),
        ],
      },
      {
        label: 'Discover',
        items: [
          route('Overview', '/research/daily-brief', ClipboardList),
          route('Stock Explorer', '/research/explorer', Compass),
          route('Option Scan', '/research/scan', ScanSearch),
        ],
      },
      {
        label: 'Analyze',
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
        label: 'Validate',
        items: [
          route('Signal Decay', '/research/signal-decay', Activity),
          route('Backtest', '/research/backtest', History),
          route('Agent Personas', '/research/agent-personas', Users),
          route('My Trading System', '/research/playbook', BookOpen),
        ],
      },
      {
        label: 'Data',
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
