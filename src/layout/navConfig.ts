import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertCircle,
  ArrowLeftRight,
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
  Network,
  PieChart,
  Server,
  Settings,
  Shield,
  Star,
  Terminal,
  TrendingUp,
  Trophy,
  Wand2,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Optional nested children — renders as collapsible sub-list under this item */
  children?: NavItem[]
}

export interface NavSubGroup {
  label: string
  items: NavItem[]
}

export interface NavGroup {
  label: string
  icon: LucideIcon
  defaultOpen?: boolean
  dividerBefore?: boolean
  /** Flat items (no sub-group labels) */
  items?: NavItem[]
  /** Grouped items with section labels (Legacy-style Groups) */
  subGroups?: NavSubGroup[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Market',
    icon: Activity,
    defaultOpen: true,
    items: [
      { label: 'Live', to: '/market/live', icon: Activity },
    ],
  },
  {
    label: 'Portfolio',
    icon: LayoutDashboard,
    subGroups: [
      {
        label: 'Overview',
        items: [
          { label: 'Accounts', to: '/portfolio/accounts', icon: LayoutDashboard },
          { label: 'Positions', to: '/portfolio/positions', icon: TrendingUp },
          { label: 'Performance', to: '/portfolio/performance', icon: LineChart },
          { label: 'Model Analysis', to: '/portfolio/model-analysis', icon: BarChart2 },
        ],
      },
      {
        label: 'Activity & Cash',
        items: [
          { label: 'Trade Ledger', to: '/portfolio/ledger', icon: ClipboardList },
          { label: 'Transfer & Pay', to: '/portfolio/transfer', icon: ArrowLeftRight },
        ],
      },
    ],
  },
  {
    label: 'Research',
    icon: BookOpen,
    subGroups: [
      {
        label: 'Screener',
        items: [
          { label: 'Stock Screener', to: '/research/sepa', icon: BookOpen },
          { label: 'Stock Data Readiness', to: '/research/stock-data', icon: Database },
          { label: 'Option Screener', to: '/research/screener', icon: ListFilter },
          { label: 'Watchlist', to: '/market/watchlist', icon: Star },
        ],
      },
      {
        label: 'Discovery',
        items: [
          { label: 'Option Discovery', to: '/research/discovery', icon: Eye },
        ],
      },
      {
        label: 'Risk & Tools',
        items: [
          { label: 'Risk Model', to: '/research/risk', icon: AlertCircle },
          { label: 'Backtest', to: '/research/backtest', icon: History },
          { label: 'IV & Greeks', to: '/research/greeks', icon: Wand2 },
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
          { label: 'Instances', to: '/strategy/instances', icon: GitBranch },
          { label: 'Win Rate', to: '/strategy/win-rate', icon: Trophy },
        ],
      },
      {
        label: 'Configuration',
        items: [
          { label: 'Structure', to: '/strategy/structures', icon: Cpu },
          { label: 'Opportunity', to: '/strategy/opportunities', icon: Star },
          { label: 'Allocations', to: '/strategy/allocations', icon: PieChart },
          { label: 'Gates', to: '/strategy/gates', icon: Shield },
          { label: 'Option Category', to: '/strategy/option-category', icon: Layers },
        ],
      },
    ],
  },
  {
    label: 'System',
    icon: Terminal,
    dividerBefore: true,
    items: [
      { label: 'API',    to: '/settings/api',      icon: Server   },
      { label: 'Daemon', to: '/operations/daemon',  icon: Cpu      },
      { label: 'Celery', to: '/operations/celery',  icon: Terminal },
      { label: 'Socket', to: '/settings/socket',    icon: Network  },
    ],
  },
]

export const SETTINGS_ITEM: NavItem = { label: 'Settings', to: '/settings/coverage/overview', icon: Settings }

/** Flatten all items from a group (across subGroups or items) — used for active-state detection */
export function getAllItems(group: NavGroup): NavItem[] {
  if (group.items) return group.items
  return group.subGroups?.flatMap((sg) => sg.items) ?? []
}
