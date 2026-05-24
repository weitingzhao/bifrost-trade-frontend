import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertCircle,
  BarChart2,
  BookOpen,
  ClipboardList,
  Cpu,
  Database,
  Eye,
  GitBranch,
  History,
  Layers,
  LayoutDashboard,
  LineChart,
  ListFilter,
  PieChart,
  ScrollText,
  Settings,
  Shield,
  Star,
  Terminal,
  TrendingUp,
  Trophy,
  Wand2,
} from 'lucide-react'

export interface NavItem { label: string; to: string; icon: LucideIcon }
export interface NavGroup { label: string; icon: LucideIcon; defaultOpen?: boolean; items: NavItem[]; dividerBefore?: boolean }

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Market',
    icon: Activity,
    defaultOpen: true,
    items: [
      { label: 'Live', to: '/market/live', icon: Activity },
      { label: 'Watchlist', to: '/market/watchlist', icon: Star },
    ],
  },
  {
    label: 'Portfolio',
    icon: LayoutDashboard,
    items: [
      { label: 'Accounts', to: '/portfolio/accounts', icon: LayoutDashboard },
      { label: 'Positions', to: '/portfolio/positions', icon: TrendingUp },
      { label: 'Performance', to: '/portfolio/performance', icon: LineChart },
      { label: 'Model Analysis', to: '/portfolio/model-analysis', icon: BarChart2 },
      { label: 'Trade Ledger', to: '/portfolio/ledger', icon: ClipboardList },
    ],
  },
  {
    label: 'Research',
    icon: BookOpen,
    items: [
      { label: 'SEPA', to: '/research/sepa', icon: BookOpen },
      { label: 'Screener', to: '/research/screener', icon: ListFilter },
      { label: 'Stock Data', to: '/research/stock-data', icon: Database },
      { label: 'Discovery', to: '/research/discovery', icon: Eye },
      { label: 'Greeks', to: '/research/greeks', icon: Wand2 },
      { label: 'Risk Model', to: '/research/risk', icon: AlertCircle },
      { label: 'Backtest', to: '/research/backtest', icon: History },
    ],
  },
  {
    label: 'Strategy',
    icon: GitBranch,
    items: [
      { label: 'Instances', to: '/strategy/instances', icon: GitBranch },
      { label: 'Win Rate', to: '/strategy/win-rate', icon: Trophy },
      { label: 'Structures', to: '/strategy/structures', icon: Cpu },
      { label: 'Opportunities', to: '/strategy/opportunities', icon: Star },
      { label: 'Allocations', to: '/strategy/allocations', icon: PieChart },
      { label: 'Gates', to: '/strategy/gates', icon: Shield },
      { label: 'Option Category', to: '/strategy/option-category', icon: Layers },
    ],
  },
  {
    label: 'System',
    icon: Terminal,
    dividerBefore: true,
    items: [
      { label: 'Daemon', to: '/operations/daemon', icon: Cpu },
      { label: 'Celery', to: '/operations/celery', icon: Terminal },
      { label: 'Logs', to: '/operations/logs', icon: ScrollText },
    ],
  },
]

export const SETTINGS_ITEM: NavItem = { label: 'Settings', to: '/settings/daemon', icon: Settings }
