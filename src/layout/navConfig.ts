import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowLeftRight,
  BarChart2,
  Sigma,
  BookOpen,
  CalendarClock,
  Briefcase,
  ClipboardList,
  List,
  Database,
  Gauge,
  Layers,
  Layers2,
  ListChecks,
  ListTodo,
  LayoutDashboard,
  LineChart,
  Palette,
  PieChart,
  Radar,
  Settings,
  ShieldAlert,
  Split,
  Target,
  TrendingUp,
  Trophy,
  Workflow,
  Users,
} from 'lucide-react'
import { getAllNavItems, type ShellNavGroup, type ShellNavItem } from '@bifrost/ui'
import { foldGlyph, routeGlyph } from '@/lib/design/glyphs'
import {
  AUTOPILOT_PAGES,
  COPILOT_PAGES,
  MARKET_PAGES,
  staticResearchSubGroups,
} from './researchNavCatalog'

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
    to: '/home',
    // Live, Alerts and Events moved here from Research (design §5a.1). The
    // old placement read the content — these state the market's facts, and
    // that is Research's subject — and missed the axis: Home is organised by
    // time of day, and these three are the market's own clock. What is
    // trading now, what I armed and what has fired, what arrives inside
    // thirty days. Their routes did not move, so every deep link still works.
    //
    // The heading is Today (§5a.1): the layer wrapped exactly one row and
    // that row was the layer, so the row is gone and the word goes there.
    //
    // Daily Brief joined them on 2026-09-22 (design Rev 2026-09-22.2, §5a.8):
    // it left Copilot with the fold, and it is the 9am read — the same class
    // as Live, Event Radar and Events, which is what is true right now.
    items: [...Object.values(MARKET_PAGES), COPILOT_PAGES.brief],
  },
  {
    label: 'Trade',
    icon: Briefcase,
    // The heading is the Desk (§5a.1). The layer wrapped one row and that row
    // was the layer, so its six pages come up a level: Plans first, because a
    // trade starts as a plan, and Assignment last, because that is where one
    // ends when it goes to stock.
    to: '/trade/desk',
    items: [
      route('Plans', '/trade/plans', ClipboardList),
      route('Orders & Fills', '/trade/fills', ListChecks),
      route('Rules', '/trade/rules', Workflow),
      route('Playbook', '/trade/playbook', BookOpen),
      route('Expiration', '/trade/expiration', CalendarClock),
      route('Assignment', '/trade/assignment', ArrowLeftRight),
    ],
  },
  {
    label: 'Portfolio',
    icon: LayoutDashboard,
    to: '/portfolio',
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
    to: '/risk',
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
    // The design files Review as its own group after Risk: what was closed,
    // and what it argues for. The heading is the Queue (§5a.1) — reviewing a
    // trade there is what produces the labels the rest of the group counts —
    // and its four pages come up a level with it.
    to: '/review',
    items: [
      route('Single trade', '/review/fit', Target),
      route('Habits', '/review/habits', Activity),
      route('Playbook stats', '/review/playbook-stats', BarChart2),
      route('Objectives', '/review/objectives', Target),
      // One inbox, not two (design Rev 2026-09-22.2, §5a.8). Decision Inbox
      // sat under Autopilot and Rule proposals sat here: the same act — a
      // machine proposes, I approve — with a row each, because the engine
      // touches both ends of the loop. It seats here for the reason Objectives
      // does: the subject of judging the machine I built is myself.
      //
      // A `Rule proposals` child sat under it while the rows were still a page
      // of their own, so the route the Owner was asked to review could be
      // found. Package 2026-09-23.1 draws the merge and withdraws the row:
      // it is the second row §5a.8 deleted, wearing an indent. The proposals
      // are reachable as what they became — cards in this queue, counted in
      // its badge — and by the deep link, which the Queue and Habits pages
      // both offer a button to.
      AUTOPILOT_PAGES.inbox,
    ],
  },
  {
    label: 'Research',
    icon: BookOpen,
    // The heading is the Overview (§5a.1); the Overview row retires into it.
    to: '/research/overview',
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
      // The design's System landing (Owner ruling 2026-09-15): the three
      // questions a trader asks, above the folds that answer how.
      route('Status', '/system/status', Gauge),
      route('Settings', '/settings', Settings),
      // Signal Health and Lens Coverage arrived from Research (design package
      // 2026-09-20.1). The design's rule is about what a page takes: one that
      // takes a symbol is a read and stays in Research › Analyze; one that
      // takes none is pipeline plumbing, and what these two answer is whether
      // the machinery is filling up — System's question. Data Readiness was
      // already here and had a second row under Research pointing at this same
      // `/system/*` path; that duplicate is gone with the move.
      fold('system:data', 'Data', '/research/signal-health', Database, [
        route('Signal Health', '/research/signal-health', Activity),
        route('Lens Coverage', '/research/lens-coverage', Radar),
        // The design's two `/research/lab/*` System pages sit after them
        // (sys:data, Rev 2026-09-20.4). Calibration joined 2026-09-24, when
        // its page landed — a nav row must navigate.
        route('Discover model', '/research/lab/discover-model', BookOpen),
        route('Calibration', '/research/lab/calibration', Gauge),
      ]),
      // Personas and Orchestration arrived from Copilot (design Rev
      // 2026-09-22.2, §5a.8 · `SYS_ROUTES`). Neither is a trader's page: the
      // roster says whose readings to trust and the diagram says who hands to
      // whom, which are the operator's question and the engineer's. They keep
      // their `/research/*` paths — every deep link still works — and only the
      // row moved, the way Signal Health's did.
      fold('system:agents', 'Agents', '/research/agent-personas', Users, [
        COPILOT_PAGES.personas,
        COPILOT_PAGES.orchestration,
      ]),
      fold('system:reference', 'Reference', '/docs/design-adoption', BookOpen, [
        route('Design Adoption', '/docs/design-adoption', ListChecks),
        route('Research Blueprint', '/docs/research-blueprint', BookOpen),
        route('Research Calibration', '/docs/research-calibration', BookOpen),
        route('Tech Stack', '/docs/tech-stack', Layers2),
        route('UI Design System', '/docs/ui-design-system', Palette),
        route('Options Kit', '/docs/options-kit', Sigma),
      ]),
    ],
  },
]

/** The way in, from the sidebar footer. */
export const SYSTEM_ITEM: ShellNavItem = route('System', '/system/status', Settings)

export { Settings as SYSTEM_ICON }

/** @deprecated Use getAllNavItems from @bifrost/ui */
export const getAllItems = getAllNavItems

export type NavItem = ShellNavItem
export type NavGroup = ShellNavGroup
