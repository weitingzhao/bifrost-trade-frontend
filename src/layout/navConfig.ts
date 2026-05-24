import type { LucideIcon } from 'lucide-react'
import {
  Activity, BookOpen, Cpu, Eye, GitBranch, LayoutDashboard, LineChart,
  ListFilter, ScrollText, Settings, Shield, Star, Terminal, TrendingUp, Wand2,
} from 'lucide-react'

export interface NavItem { label: string; to: string; icon: LucideIcon }
export interface NavGroup { label: string; icon: LucideIcon; defaultOpen?: boolean; items: NavItem[] }

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
    ],
  },
  {
    label: 'Research',
    icon: BookOpen,
    items: [
      { label: 'Screener', to: '/research/screener', icon: ListFilter },
      { label: 'Discovery', to: '/research/discovery', icon: Eye },
      { label: 'Greeks', to: '/research/greeks', icon: Wand2 },
      { label: 'SEPA', to: '/research/sepa', icon: BookOpen },
    ],
  },
  {
    label: 'Strategy',
    icon: GitBranch,
    items: [
      { label: 'Instances', to: '/strategy/instances', icon: GitBranch },
      { label: 'Structures', to: '/strategy/structures', icon: Cpu },
      { label: 'Opportunities', to: '/strategy/opportunities', icon: Star },
      { label: 'Gates', to: '/strategy/gates', icon: Shield },
    ],
  },
  {
    label: 'Operations',
    icon: Terminal,
    items: [
      { label: 'Daemon', to: '/operations/daemon', icon: Cpu },
      { label: 'Celery', to: '/operations/celery', icon: Terminal },
      { label: 'Logs', to: '/operations/logs', icon: ScrollText },
    ],
  },
]

export const SETTINGS_ITEM: NavItem = { label: 'Settings', to: '/settings/daemon', icon: Settings }
