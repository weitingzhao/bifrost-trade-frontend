/**
 * The companion rail — the equipment's own edge, present on every page.
 *
 * `equip.ts` holds why the three modules are not in the business tree;
 * `equipRail.module.css` holds the material and the motion, transcribed from
 * the design's own stylesheet. This holds the states: which icon is lit, and
 * what a click does.
 *
 * ## Two states, and what each one means
 *
 * - **`here`** — you are standing on one of the module's pages. These pages
 *   have no row in the tree, so the group is their "you are here": the box
 *   takes the hue on its border and the page's icon takes it on its ink.
 * - **`open`** — this surface is open, in the float or in the panel. Dock
 *   semantics: an open surface rides across navigation until you close it,
 *   and its icon stays filled the whole time. That is the whole of what the
 *   retired pin button did.
 *
 * Both can be true, neither can be, and they are drawn differently on purpose:
 * standing somewhere is a fact about the page, having something open is a fact
 * about your desk.
 *
 * ## One click, three outcomes
 *
 * **Visible → close · open but behind another tab → bring it forward · not
 * open → open where you last put it** (§5a.8, seventeenth round). The tooltip
 * says which of the two places it is in, so the icon never just means "on".
 *
 * **A click opens a surface, it does not navigate**: *from the rail =
 * floating, from the address bar = a page*. `⤢` in the header is there for
 * when you want the real thing.
 */
import { useLocation } from 'react-router-dom'
import { useAutopilotStanding } from '@/hooks/useLoopHarness'
import { EQUIP_GROUPS, EQUIP_HUE, equipGroupOf, type EquipGroup, type EquipPage } from './equip'
import { placeOf, surfaceForRoute, toggleSurface, useSurfaces } from './equipSurface'
import css from './equipRail.module.css'

/** What the tooltip adds once something is open — "on" alone is not a place. */
function placeNote(to: string): string {
  const at = placeOf(to)
  return at === 'float' ? ' · in a float' : at === 'panel' ? ' · in the side panel' : ''
}

function RailButton({
  page,
  head,
  open,
  here,
  children,
}: {
  page: EquipPage
  head?: boolean
  /** This surface is open, wherever it is. */
  open: boolean
  /** The frame page is this route. */
  here: boolean
  children?: React.ReactNode
}) {
  const Icon = page.icon
  return (
    <button
      type="button"
      onClick={() => {
        const surface = surfaceForRoute(page.to)
        if (surface) toggleSurface(surface)
      }}
      aria-label={page.label}
      aria-pressed={open}
      title={page.label + placeNote(page.to)}
      className={`${css.btn} ${head ? css.head : css.item}`}
      style={{
        // Opaque tiles, not holes in the glass: the group's box is what stays
        // translucent, the icons keep full ink (the design says so in its own
        // stylesheet, after the first build dimmed the whole group to 40% and
        // made them unreadable). Open is the loud state, standing here is the
        // quiet one — a surface you left open is news, a page you are on is not.
        background: open
          ? 'color-mix(in oklab, var(--rh) 26%, var(--sk-raised2))'
          : here
            ? 'color-mix(in oklab, var(--rh) 16%, var(--sk-raised2))'
            : 'var(--sk-surface)',
        color: open || here ? 'var(--rh)' : 'var(--sk-mute)',
        ...(head
          ? {
              ['--rh-head-border' as string]: open
                ? 'var(--rh)'
                : here
                  ? 'color-mix(in oklab, var(--rh) 60%, transparent)'
                  : 'var(--sk-line2)',
            }
          : {}),
      }}
    >
      <Icon className={head ? 'size-[17px]' : 'size-4'} aria-hidden />
      <span className={css.label}>{page.label}</span>
      {children}
    </button>
  )
}

function Group({
  group,
  activePath,
  lamp,
  count,
}: {
  group: EquipGroup
  activePath: string
  lamp?: boolean
  count?: number
}) {
  // Subscribed so the lit states follow the surfaces; `placeOf` reads the same
  // store, and this is what tells React to look again.
  useSurfaces()
  const openAt = (to: string) => placeOf(to) != null
  const here = equipGroupOf(activePath)?.id === group.id
  const anyOpen = openAt(group.hub.to) || group.pages.some((p) => openAt(p.to))

  return (
    <div
      className={css.group}
      style={{
        ['--rh' as string]: EQUIP_HUE[group.id],
        ['--rh-box' as string]:
          anyOpen || here
            ? 'color-mix(in oklab, var(--rh) 40%, transparent)'
            : 'color-mix(in srgb, var(--sk-ink) 10%, transparent)',
      }}
      aria-label={group.label}
    >
      <RailButton
        page={group.hub}
        head
        open={openAt(group.hub.to)}
        here={activePath === group.hub.to}
      >
        {/* Only Autopilot carries one: it is the one module with state that
            changes without your hand. Green for a run in flight. */}
        {lamp ? <span className={css.dot} title="A loop run is in flight" /> : null}
      </RailButton>
      {/* The count is its own line under the head, not a badge on it — the
          design's own placement, and it keeps the 28px button square. */}
      {(count ?? 0) > 0 ? (
        <span className={css.count} title={`${count} waiting on a call`}>
          {count}
        </span>
      ) : null}
      {group.pages.length > 0 ? <span className={css.rule} aria-hidden /> : null}
      {group.pages.map((p) => (
        <RailButton key={p.to} page={p} open={openAt(p.to)} here={activePath === p.to} />
      ))}
    </div>
  )
}

export function EquipRail() {
  const { pathname } = useLocation()
  const standing = useAutopilotStanding().data

  // The two readings that earn Autopilot its indicator, read where the sidebar
  // used to read them — the badge moved with the row.
  const waiting = standing ? (standing.pending_decisions?.calls ?? standing.pending_memos) : 0
  const running = standing?.objectives.some((o) => o.last_run?.status === 'running') ?? false

  return (
    <div className={css.rail} aria-label="Equipment">
      {EQUIP_GROUPS.map((g) => (
        <Group
          key={g.id}
          group={g}
          activePath={pathname}
          lamp={g.id === 'autopilot' && running}
          count={g.id === 'autopilot' ? waiting : 0}
        />
      ))}
    </div>
  )
}
