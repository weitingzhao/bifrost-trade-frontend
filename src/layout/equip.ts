/**
 * The equipment — three modules that are worn while playing the script, not
 * places in it.
 *
 * Research → Risk → Trade → Portfolio → Review is the script: five phases, one
 * dependency chain, a lifecycle numeral each. **Autopilot runs it, The Book
 * remembers it, the Copilot is held while playing it.** None of the three is a
 * phase, and for two days the design tried to say so inside the tree and could
 * not: a tree row reads as a place however thin you draw it (§5a.8, first
 * version, one round to failure). Twelve rounds later the answer is a rail at
 * the right edge — present on every page, which is what cross-phase means.
 *
 * ## What earns a permanent pixel
 *
 * The Owner's criterion, and the reason the three are not treated alike:
 * **does it have state that changes without my hand?**
 *
 * - **Autopilot has will** — it runs itself and accumulates decisions waiting
 *   on a call. It is the only one that earns an indicator, and it carries two:
 *   a lamp while a run is in flight and the count of what is waiting.
 * - **The Book has memory** — it only grows when I put something in it, so
 *   there is never news to announce.
 * - **The Copilot has neither**; it is inert until invoked. ⌘J already says
 *   everything a permanent pixel could.
 *
 * ## One table, every surface
 *
 * The design's `equip()` feeds its rail, its floats and its drawers from one
 * object, and so does this. Phase B reads `hub` and `pages` to navigate; the
 * float geometry (`size`, `kind`) is carried now and used when the surfaces
 * land, so the table does not have to be revisited to grow them.
 *
 * **One icon the design has and this side does not draw: Loop Run.** It is a
 * drawer over the Console in the design; this app has no `/research/loop/runs`
 * route at all, so the rail would be offering a door to nothing. It returns
 * with the route.
 */
import {
  BookOpen,
  ClipboardList,
  GitFork,
  History,
  ListFilter,
  MessageCircle,
  NotebookPen,
  Star,
  Terminal,
  type LucideIcon,
} from 'lucide-react'

/** Which surface a page opens as. Only `page` is built in this phase. */
export type EquipKind = 'page' | 'float' | 'drawer'

/** The float's default device grade — the design's Phone / Pad / Full. */
export type EquipSize = 'phone' | 'pad' | 'full'

export interface EquipPage {
  to: string
  label: string
  icon: LucideIcon
  size?: EquipSize
  kind?: EquipKind
}

export interface EquipGroup {
  id: 'autopilot' | 'book' | 'copilot'
  label: string
  icon: LucideIcon
  /** The module's home — what the group's head icon opens. */
  hub: EquipPage
  /** One icon each, in the design's order. */
  pages: EquipPage[]
  /**
   * Paths the group owns without drawing an icon for them.
   *
   * An objective and a run are **data**, not places: the design keeps them out
   * of the tree for the same reason it keeps hypotheses out, and out of the
   * rail because an icon strip cannot hold a list that grows. But standing on
   * one is still standing inside Autopilot, and the group frame should say so
   * — otherwise the one page that walked you there goes dark behind you.
   *
   * Prefixes, and explicit ones: `/research/loop/` is not Autopilot's, because
   * the Hypothesis Board and the Candidate Pool live under it too.
   */
  owns?: string[]
}

/**
 * Three hues, one per group, from the layer skins rather than invented:
 * Autopilot takes the shell's own lime (it is the engine), The Book takes the
 * analysis blue (it is Research's sediment), the Copilot takes the violet the
 * Lens family already wears. Declared in `index.css` as `--equip-*` so a group
 * cannot drift between the rail and anything that grows beside it later.
 *
 * The design's rule, kept: the group shares one colour and the buttons inside
 * it do **not** each get their own. In this DS a colour variation carries
 * meaning, so a row of different hues reads as a row of status lamps.
 */
export const EQUIP_HUE: Record<EquipGroup['id'], string> = {
  autopilot: 'var(--equip-autopilot)',
  book: 'var(--equip-book)',
  copilot: 'var(--equip-copilot)',
}

export const EQUIP_GROUPS: readonly EquipGroup[] = [
  {
    id: 'autopilot',
    label: 'Autopilot',
    icon: Terminal,
    hub: { to: '/research/loop/harness', label: 'Autopilot Console', icon: Terminal, size: 'pad' },
    // The Inbox seats in Review as a menu row (§5a.8) *and* rides here: the
    // rail is not a second tree, it is the equipment's own reach, and the one
    // page that accumulates work without me is the one I most want one click
    // from wherever I am standing.
    pages: [
      {
        to: '/research/loop/decisions',
        label: 'Decision Inbox',
        icon: ClipboardList,
        size: 'phone',
      },
    ],
    owns: ['/research/loop/objectives/', '/research/loop/runs'],
  },
  {
    id: 'book',
    label: 'The Book',
    icon: BookOpen,
    hub: { to: '/research/book', label: 'The Book', icon: BookOpen, size: 'pad' },
    pages: [
      { to: '/research/loop/hypotheses', label: 'Hypothesis Board', icon: GitFork },
      { to: '/research/loop/candidates', label: 'Candidate Pool', icon: ListFilter },
      { to: '/research/watchlist', label: 'Watchlist', icon: Star, size: 'phone' },
      { to: '/research/journal', label: 'Journal', icon: History },
    ],
  },
  {
    id: 'copilot',
    label: 'Copilot',
    icon: MessageCircle,
    hub: { to: '/research/copilot', label: 'Copilot Desk', icon: MessageCircle, size: 'pad' },
    pages: [
      { to: '/research/copilot/trading', label: 'Book starters', icon: NotebookPen },
    ],
  },
]

/** Every page the rail reaches — the hub and its pages, per group. */
export function equipRoutes(): string[] {
  return EQUIP_GROUPS.flatMap((g) => [g.hub.to, ...g.pages.map((p) => p.to)])
}

/** The group a route belongs to, or null when it is not equipment. */
export function equipGroupOf(path: string): EquipGroup | null {
  return (
    EQUIP_GROUPS.find(
      (g) =>
        g.hub.to === path ||
        g.pages.some((p) => p.to === path) ||
        (g.owns ?? []).some((prefix) => path.startsWith(prefix)),
    ) ?? null
  )
}
