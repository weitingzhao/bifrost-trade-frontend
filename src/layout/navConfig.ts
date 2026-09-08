import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowLeftRight,
  BookOpen,
  ClipboardList,
  Cpu,
  GitBranch,
  Layers,
  LayoutDashboard,
  MessageCircle,
  LineChart,
  Network,
  PieChart,
  Server,
  Settings,
  Shield,
  Star,
  Terminal,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { getAllNavItems, type ShellNavGroup, type ShellNavItem } from '@bifrost/ui'
import { staticResearchSubGroups } from './researchNavCatalog'

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
          route('Copilot', '/portfolio/copilot', MessageCircle),
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
    // Grouped by how much the system does for the Owner, top down. The
    // sidebar re-lays this group per seat (researchNavCatalog.ts); this is
    // the seat-less layout the top nav and the home page read.
    subGroups: staticResearchSubGroups(),
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
