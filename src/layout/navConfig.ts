import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowLeftRight,
  BarChart2,
  Blocks,
  BookOpen,
  ClipboardList,
  Cpu,
  Database,
  GitBranch,
  Layers,
  Layers2,
  LayoutDashboard,
  LineChart,
  Network,
  Palette,
  PieChart,
  Plug,
  Radio,
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

/** A home page: a route whose pages beneath it start open. */
function home(label: string, to: string, icon: LucideIcon, children: ShellNavItem[]): ShellNavItem {
  return { ...route(label, to, icon, children), defaultOpen: true }
}

/**
 * A fold whose header is also one of its rows.
 *
 * `route()` keys an item by its path, which collides when the fold and its
 * first child are the same destination — as `Data` and `Coverage` are. The
 * fold gets its own id so the two are distinct rows to React and to the
 * open-groups store.
 */
function fold(
  id: string,
  label: string,
  to: string,
  icon: LucideIcon,
  children: ShellNavItem[],
): ShellNavItem {
  return { id, label, to, icon, children, defaultOpen: true }
}

/**
 * The business tree.
 *
 * `Market` was a top-level group here with exactly one row in it — a heading
 * over a single page. The design files Market as a fold inside Research
 * (`shell-registry.js` `fold:market`), on the reasoning that a group is
 * defined by whose facts it states and the market's are Research's subject.
 * It lives in `researchNavCatalog.ts` now, in all three seats.
 */
export const NAV_GROUPS: ShellNavGroup[] = [
  {
    label: 'Portfolio',
    icon: LayoutDashboard,
    // Two homes, each with its pages beneath, and no section labels — the
    // homes are the labels (Owner decision, 2026-09-07). Performance is the
    // book: how it is doing, then what is in it, then what backs it. Accounts
    // is the ledger: what the broker says, then what was traded, then what
    // cash moved. The Trading Copilot lives with the Copilot seat under Research.
    items: [
      home('Performance', '/portfolio/performance', LineChart, [
        route('Positions', '/portfolio/positions', TrendingUp),
        route('Backing & Model', '/portfolio/backing', Layers),
      ]),
      home('Accounts', '/portfolio/accounts', LayoutDashboard, [
        route('Trade Ledger', '/portfolio/ledger', ClipboardList),
        route('Transfer & Pay', '/portfolio/transfer', ArrowLeftRight),
      ]),
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
    // Two homes, same as Portfolio and Research: the headings are pages
    // (Owner decision, extended here 2026-09-08). "Operations" and
    // "Configuration" were labels you could not click, and they split the
    // one chain this domain is built on — a structure becomes an
    // opportunity, opportunities are bundled into an allocation, the daemon
    // runs that allocation as instances, and the instances produce a win
    // rate. Instances is what is running, with how it has gone beneath it.
    // Allocations is what the daemon was told to run, with the parts it was
    // assembled from beneath it, in the order they nest.
    items: [
      home('Instances', '/strategy/instances', GitBranch, [
        route('Win Rate', '/strategy/win-rate', Trophy),
      ]),
      home('Allocations', '/strategy/allocations', PieChart, [
        route('Opportunity', '/strategy/opportunities', Star),
        route('Structure', '/strategy/structures', Cpu),
        route('Option Category', '/strategy/option-category', Layers),
        route('Gates', '/strategy/gates', Shield),
      ]),
    ],
  },
]

/**
 * The machine under the desk.
 *
 * This replaces the business tree rather than joining it as a ninth group
 * (`isSystemRoute` in `routeRegistry.ts` decides which one renders). Before,
 * it was `SettingsLayout`: a second navigation aside that took the breadcrumb,
 * the Omnibar, the symbol chip and the Inbox with it every time you opened a
 * settings page. Same rows, one shell.
 *
 * `Data` / `Runtime` / `Configuration` split by what a row can tell you: what
 * we hold, whether the machinery is answering, and what it was told to do.
 * `/settings/*` and `/operations/*` were two names for this one thing.
 */
export const SYSTEM_NAV_GROUPS: ShellNavGroup[] = [
  {
    label: 'System',
    icon: Settings,
    defaultOpen: true,
    items: [
      fold('system:data', 'Data', '/system/coverage', Database, [
        route('Coverage', '/system/coverage', BarChart2),
        route('Feed', '/system/feed', Radio),
        route('Data Readiness', '/system/data-readiness', Database),
      ]),
      fold('system:runtime', 'Runtime', '/system/topology', Cpu, [
        route('Topology', '/system/topology', Network),
        route('Daemon', '/system/daemon', Cpu),
        route('API Health', '/system/api', Activity),
        route('Socket', '/system/socket', Radio),
        route('Platform', '/system/platform', Blocks),
      ]),
      fold('system:config', 'Configuration', '/system/ib', Plug, [
        route('IB Connection', '/system/ib', Plug),
      ]),
      fold('system:reference', 'Reference', '/docs/research-blueprint', BookOpen, [
        route('Research Blueprint', '/docs/research-blueprint', BookOpen),
        route('Research Calibration', '/docs/research-calibration', BookOpen),
        route('Tech Stack', '/docs/tech-stack', Layers2),
        route('UI Design System', '/docs/ui-design-system', Palette),
      ]),
    ],
  },
]

/** The way in, from the sidebar footer. */
export const SYSTEM_ITEM: ShellNavItem = route('System', '/system/topology', Settings)

export { Settings as SYSTEM_ICON }

/** @deprecated Use getAllNavItems from @bifrost/ui */
export const getAllItems = getAllNavItems

export type NavItem = ShellNavItem
export type NavGroup = ShellNavGroup
