import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertCircle,
  ArrowLeftRight,
  BarChart2,
  BookOpen,
  CalendarDays,
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
        label: 'Home',
        items: [route('Research Home', '/research', Home)],
      },
      {
        label: 'Discover',
        items: [
          route('Daily Brief', '/research/daily-brief', ClipboardList),
          route('Event Radar', '/research/event-radar', Zap),
          route('SEPA Daily Core', '/research/sepa-daily-core', Compass),
          route('Stock Screener', '/research/sepa', BookOpen),
          route('Option Discovery', '/research/discovery', Eye),
          route('Momentum Radar', '/research/momentum-radar', Radar),
        ],
      },
      {
        label: 'Analyze',
        items: [
          route('IV Radar', '/research/iv-radar', Radar),
          route('IV-RV Spread', '/research/vrp-lab', Activity),
          route('Vol Surface', '/research/vol-surface-lab', LineChart),
          route('OpEx Cycle', '/research/opex-cycle-lab', CalendarDays),
          route('GEX Intraday', '/research/gex-intraday', BarChart2),
          route('Analysis Model', '/research/analysis-model', BarChart2),
          route('Order Sentiment', '/research/order-sentiment', Activity),
          route('Multi-leg Flow', '/research/order-sentiment#multi-leg', Network),
          route('Forecast Sessions', '/research/forecast-sessions', TrendingUp),
          route('Intraday Playbook', '/research/intraday-playbook', LineChart),
        ],
      },
      {
        label: 'Validate',
        items: [
          route('Backtest', '/research/backtest', History),
          route('My Trading System', '/research/playbook', BookOpen),
          route('Contract Greeks', '/research/greeks', Wand2),
          route('Risk Model', '/research/risk', AlertCircle),
        ],
      },
      {
        label: 'Data',
        items: [
          route('Stock Data Readiness', '/settings/data-readiness', Server),
          route('Stock Watchlist', '/research/watchlist', Star),
          route('Option Screener', '/research/screener', ListFilter),
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
