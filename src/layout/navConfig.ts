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
  LineChart,
  PieChart,
  Settings,
  Shield,
  Star,
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
    // Two homes, each with its pages beneath (Owner decision, 2026-09-07).
    // The book: Performance is how it is doing, Positions what is in it,
    // Backing & Model what backs it. The ledger: Accounts is what the broker
    // says, Trade Ledger what was traded, Transfer & Pay what cash moved.
    // The Trading Copilot lives with the Copilot seat under Research.
    subGroups: [
      {
        label: 'Book',
        items: [
          route('Performance', '/portfolio/performance', LineChart, [
            route('Positions', '/portfolio/positions', TrendingUp),
            route('Backing & Model', '/portfolio/backing', Layers),
          ]),
        ],
      },
      {
        label: 'Ledger',
        items: [
          route('Accounts', '/portfolio/accounts', LayoutDashboard, [
            route('Trade Ledger', '/portfolio/ledger', ClipboardList),
            route('Transfer & Pay', '/portfolio/transfer', ArrowLeftRight),
          ]),
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
]

export const SETTINGS_ITEM: ShellNavItem = route(
  'Settings',
  '/settings/coverage',
  Settings,
)

export { Settings as SETTINGS_ICON }

/** @deprecated Use getAllNavItems from @bifrost/ui */
export const getAllItems = getAllNavItems

export type NavItem = ShellNavItem
export type NavGroup = ShellNavGroup
