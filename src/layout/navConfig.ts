import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowLeftRight,
  BarChart2,
  Blocks,
  BookOpen,
  CalendarClock,
  Briefcase,
  ClipboardList,
  List,
  Cpu,
  Database,
  Layers,
  Layers2,
  ListChecks,
  ListTodo,
  LayoutDashboard,
  LineChart,
  Network,
  Palette,
  PieChart,
  Plug,
  Radar,
  Radio,
  Settings,
  ShieldAlert,
  Split,
  Target,
  TrendingUp,
  Trophy,
  Workflow,
} from 'lucide-react'
import { getAllNavItems, type ShellNavGroup, type ShellNavItem } from '@bifrost/ui'
import { foldGlyph, routeGlyph } from '@/lib/design/glyphs'
import { MARKET_PAGES, staticResearchSubGroups } from './researchNavCatalog'

export { getAllNavItems }

/**
 * Trade route nav item — `id` and `to` both set to the path.
 *
 * The glyph comes from the design's own table when it has one for this route,
 * and the `icon` argument is the fallback for rows the design's menu does not
 * carry. That order, and not the reverse: the set was redrawn so no two rows
 * share a shape, so a library icon that merely means the right thing is the
 * one choice that can undo it.
 */
function route(
  label: string,
  to: string,
  icon: LucideIcon,
  children?: ShellNavItem[],
): ShellNavItem {
  return { id: to, label, to, icon: routeGlyph(to) ?? icon, children }
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
  // Keyed by label, because a heading borrows a child's route to be clickable
  // — the path would fetch the child's shape, not the heading's.
  return { id, label, to, icon: foldGlyph(label) ?? icon, children, defaultOpen: true }
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
    // Home is one row: it belongs to no layer, and cuts across all five by
    // time of day. The groups below are declared in lifecycle order; the
    // sidebar re-orders them per the design's loop/reach modes (`navOrder.ts`)
    // and replaces their icons with the lifecycle numerals.
    label: 'Home',
    icon: ListTodo,
    // Live, Alerts and Events moved here from Research (design §5a.1). The
    // old placement read the content — these state the market's facts, and
    // that is Research's subject — and missed the axis: Home is organised by
    // time of day, and these three are the market's own clock. What is
    // trading now, what I armed and what has fired, what arrives inside
    // thirty days. Their routes did not move, so every deep link still works.
    //
    // `Today` is still a row of its own here. The design makes the layer
    // heading itself the page (§5a.1) and this shell has no navigable group
    // header yet; until it does, dropping the row would take Today out of the
    // tree rather than promote it.
    items: [route('Today', '/home', ListTodo), ...Object.values(MARKET_PAGES)],
  },
  {
    label: 'Trade',
    icon: Briefcase,
    // The design's shape exactly (shell-registry `G.Trade`): one home row,
    // the Desk, with all six pages beneath it — Plans first, because a trade
    // starts as a plan, and Assignment last, because that is where one ends
    // when it goes to stock. An earlier note here said "Plans stays a route,
    // not a row"; the design says the opposite, and the design wins.
    items: [
      home('Desk', '/trade/desk', Briefcase, [
        route('Plans', '/trade/plans', ClipboardList),
        route('Orders & Fills', '/trade/fills', ListChecks),
        route('Rules', '/trade/rules', Workflow),
        route('Playbook', '/trade/playbook', BookOpen),
        route('Expiration', '/trade/expiration', CalendarClock),
        route('Assignment', '/trade/assignment', ArrowLeftRight),
      ]),
    ],
  },
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
        route('P&L Explain', '/portfolio/pnl-explain', PieChart),
        route('Backing & Model', '/portfolio/backing', Layers),
        route('Outcome', '/portfolio/outcome', Target),
      ]),
      home('Accounts', '/portfolio/accounts', LayoutDashboard, [
        route('Trade Ledger', '/portfolio/ledger', List),
        route('Transfer & Pay', '/portfolio/transfer', ArrowLeftRight),
        route('Corporate Actions', '/portfolio/corporate-actions', Split),
      ]),
    ],
  },
  {
    label: 'Risk',
    icon: ShieldAlert,
    // The design's own order (shell-registry `G.Risk`), adopted 2026-09-18.
    //
    // It reads forwards through a decision rather than backwards from a
    // measurement: how big should this be, what have I got left to spend, what
    // am I not allowed to do, what does the broker say I can do, what am I
    // holding, and what happens if it moves. The app had the reverse — the
    // measurements first — which is the order you read *after* the fact.
    items: [
      route('Sizing', '/risk/sizing', Target),
      route('Risk Budget', '/risk/budget', Layers2),
      route('Limits & Breaches', '/risk/limits', ListChecks),
      route('Margin & Buying Power', '/risk/margin', Database),
      // The design puts its generic dashboard glyph here, which it also uses
      // for Home and for Accounts. Radar stays: three identical icons in one
      // sidebar cost more than matching a glyph the design reuses everywhere.
      route('Portfolio Exposure', '/risk/portfolio', Radar),
      route('Stress & Scenario', '/risk/stress', Activity),
    ],
  },
  {
    label: 'Review',
    icon: Trophy,
    // The design files Review as its own group after Risk: what was closed, and
    // what it argues for. Queue is the root and the other four hang off it
    // (shell-registry.js:197) — reviewing a trade there is what produces the
    // labels the rest of the group counts.
    items: [
      home('Queue', '/review', ListChecks, [
        route('Single trade', '/review/fit', Target),
        route('Habits', '/review/habits', Activity),
        route('Playbook stats', '/review/playbook-stats', BarChart2),
        route('Rule proposals', '/review/proposals', ListTodo),
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
]

/**
 * The machine under the desk.
 *
 * This replaces the business tree rather than joining it as a ninth group
 * (`isSystemRoute` in `routeRegistry.ts` decides which one renders). Before,
 * it was `SettingsLayout`: a second navigation aside that took the breadcrumb,
 * the Omnibar, the Lens and Alerts with it every time you opened a
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
      // Signal Health and Lens Coverage arrived from Research (design package
      // 2026-09-20.1). The design's rule is about what a page takes: one that
      // takes a symbol is a read and stays in Research › Analyze; one that
      // takes none is pipeline plumbing, and what these two answer is whether
      // the machinery is filling up — System's question. Data Readiness was
      // already here and had a second row under Research pointing at this same
      // `/system/*` path; that duplicate is gone with the move.
      fold('system:data', 'Data', '/system/coverage', Database, [
        route('Coverage', '/system/coverage', BarChart2),
        route('Feed', '/system/feed', Radio),
        route('Data Readiness', '/system/data-readiness', Database),
        route('Signal Health', '/research/signal-health', Activity),
        route('Lens Coverage', '/research/lens-coverage', Radar),
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
      fold('system:reference', 'Reference', '/docs/design-adoption', BookOpen, [
        route('Design Adoption', '/docs/design-adoption', ListChecks),
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
