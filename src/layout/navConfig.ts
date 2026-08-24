import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertCircle,
  ArrowLeftRight,
  BarChart2,
  BookOpen,
  ClipboardList,
  Compass,
  Cpu,
  Eye,
  GitBranch,
  History,
  Layers,
  LayoutDashboard,
  LineChart,
  ListFilter,
  Network,
  PieChart,
  Radar,
  Server,
  Settings,
  Shield,
  Star,
  Terminal,
  TrendingUp,
  Trophy,
  Wand2,
  Zap,
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
          route('Performance', '/portfolio/performance', LineChart),
          route('Model Analysis', '/portfolio/model-analysis', BarChart2),
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
        label: 'Ideas',
        items: [
          route('Daily Brief', '/research/daily-brief', ClipboardList),
          route('Stock Screener', '/research/sepa', BookOpen),
          route('Option Screener', '/research/screener', ListFilter),
          route('Stock Watchlist', '/research/watchlist', Star),
        ],
      },
      {
        label: 'Engine',
        items: [
          route('Analysis Model', '/research/analysis-model', BarChart2),
          route('Playbook', '/research/intraday-playbook', LineChart),
          route('Momentum Radar', '/research/momentum-radar', Radar),
          route('SEPA Daily Core', '/research/sepa-daily-core', Compass),
        ],
      },
      {
        label: 'Intelligence',
        items: [
          route('GEX Intraday', '/research/gex-intraday', BarChart2),
          route('Forecast', '/research/forecast-sessions', TrendingUp),
          route('Order Sentiment', '/research/order-sentiment', Activity),
          route('Event Radar', '/research/event-radar', Zap),
        ],
      },
      {
        label: 'Volatility',
        items: [
          route('IV Radar', '/research/iv-radar', Radar),
          route('Contract Greeks', '/research/greeks', Wand2),
        ],
      },
      {
        label: 'Structure',
        items: [route('Option Discovery', '/research/discovery', Eye)],
      },
      {
        label: 'Risk',
        items: [route('Risk Model', '/research/risk', AlertCircle)],
      },
      {
        label: 'Lab',
        items: [route('Backtest', '/research/backtest', History)],
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
