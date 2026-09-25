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
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAutopilotStanding } from '@/hooks/useLoopHarness'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { firedTodayCount, useFiredAlerts } from '@/hooks/useFiredAlerts'
import { computeLiveNavLamp } from '@/utils/livePageLamps'
import { EQUIP_GROUPS, EQUIP_HUE, equipGroupOf, type EquipGroup, type EquipPage } from './equip'
import { PANEL_CARD_PX, opensAsPage, placeOf, surfaceForRoute, useSurfaces } from './equipSurface'
import { toggleSurfaceFrom } from './equipMotion'
import { SHELL_TOP_BAR_PX } from './shellChrome'
import css from './equipRail.module.css'

/**
 * The column's natural height with every page icon showing (design Rev .25).
 * Below it the rail keeps only the group heads: the pages stay one ⌘K away,
 * and a rail that ran under the status bar would hide its own last icon.
 */
const FULL_RAIL_PX = 520

/** What the tooltip adds once something is open — "on" alone is not a place. */
function placeNote(to: string): string {
  const at = placeOf(to)
  return at === 'float' ? ' · in a float' : at === 'panel' ? ' · in the side panel' : ''
}

function RailButton({
  page,
  head,
  headOf,
  title,
  open,
  here,
  children,
}: {
  page: EquipPage
  head?: boolean
  /** The group id, stamped on the head so ⌥1–4 can spring the float from it. */
  headOf?: string
  /** The head's tooltip — the group's own words, with its key (Rev .26). */
  title?: string
  /** This surface is open, wherever it is. */
  open: boolean
  /** The frame page is this route. */
  here: boolean
  children?: ReactNode
}) {
  const Icon = page.icon
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={(e) => {
        const surface = surfaceForRoute(page.to)
        if (!surface) return
        // "Open where you last put it" includes the page: `openSurface`'s
        // page branch records the choice and leaves the navigating to the
        // caller, so a closed surface remembered as a page navigates here —
        // without this the click is a silent no-op (found 2026-10-02, the
        // rail's Alerts after the Owner had used ⤢ on it).
        if (surface.canPage && placeOf(surface.key) == null && opensAsPage(surface.key)) {
          navigate(surface.to)
          return
        }
        // The icon is where the float springs from and where it goes back to.
        toggleSurfaceFrom(surface, e.currentTarget)
      }}
      aria-label={page.label}
      aria-pressed={open}
      title={(title ?? page.label) + placeNote(page.to)}
      data-equip-head={headOf}
      className={`${css.btn} ${head ? css.head : css.item}`}
      style={{
        // Opaque tiles, not holes in the glass: the group's box is what stays
        // translucent, the icons keep full ink (the design says so in its own
        // stylesheet, after the first build dimmed the whole group to 40% and
        // made them unreadable). Open is the loud state, standing here is the
        // quiet one — a surface you left open is news, a page you are on is not.
        // The glyph is the group's hue at full ink in every state — the
        // design's "every icon sits on its own opaque dark tile, glyph in the
        // module hue" (_Shell TopBar, ink: g.hue). A grey glyph at rest read
        // as a disabled strip; the tile's fill is what says open or here.
        background: open
          ? 'color-mix(in oklab, var(--rh) 26%, var(--sk-surface))'
          : here
            ? 'color-mix(in oklab, var(--rh) 16%, var(--sk-surface))'
            : 'var(--sk-surface)',
        color: 'var(--rh)',
        ...(head
          ? {
              ['--rh-head-border' as string]: open
                ? 'var(--rh)'
                : here
                  ? 'color-mix(in oklab, var(--rh) 60%, transparent)'
                  : 'color-mix(in srgb, var(--sk-ink) 7%, transparent)',
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
  countTitle,
  full,
}: {
  group: EquipGroup
  activePath: string
  /** A dot on the head: Autopilot's run, Market's feed. */
  lamp?: ReactNode
  count?: number
  countTitle?: string
  /** Room for the page icons; without it the group is its head alone. */
  full: boolean
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
        headOf={group.id}
        title={group.title}
        open={openAt(group.hub.to)}
        // The head stands for the module: standing on any of its pages lights
        // it (the design's `here = hereIn(module)`), the way the box border
        // already did. The page icons below light for their own route only.
        here={here}
      >
        {/* Only the two modules whose state changes without your hand carry
            one: Autopilot's run, Market's feed. */}
        {lamp}
      </RailButton>
      {/* macOS's running dot: something of this module is open, in the float
          or the panel. The box border says it too; the dot is what reads at a
          glance, as it does under a Dock icon. */}
      {anyOpen ? <span className={css.run} aria-hidden /> : null}
      {/* The count is its own line under the head, not a badge on it — the
          design's own placement, and it keeps the 28px button square. */}
      {(count ?? 0) > 0 ? (
        <span className={css.count} title={countTitle}>
          {count}
        </span>
      ) : null}
      {full && group.pages.length > 0 ? <span className={css.rule} aria-hidden /> : null}
      {full
        ? group.pages.map((p) => (
            <RailButton key={p.to} page={p} open={openAt(p.to)} here={activePath === p.to} />
          ))
        : null}
    </div>
  )
}

/** The feed's dot on the Market head — the sidebar Live lamp, moved with its row. */
function MarketFeedDot() {
  const { data: status } = useMonitorStatus()
  const daemonAlive = status?.daemon?.heartbeat?.daemon_alive === true
  const { color, title } = computeLiveNavLamp(status, daemonAlive)
  if (color === 'none') return null
  return <span className={css.dot} style={{ background: `var(--color-lamp-${color})`, animation: 'none' }} title={title} />
}

export function EquipRail() {
  const { pathname } = useLocation()
  const standing = useAutopilotStanding().data
  const alerts = useFiredAlerts().data
  const firedToday = firedTodayCount(alerts, new Date().toISOString().slice(0, 10))
  const { panel } = useSurfaces()
  const [height, setHeight] = useState(() => window.innerHeight)

  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const full = height - SHELL_TOP_BAR_PX - 16 >= FULL_RAIL_PX

  // The two readings that earn Autopilot its indicator, read where the sidebar
  // used to read them — the badge moved with the row.
  const waiting = standing ? (standing.pending_decisions?.calls ?? standing.pending_memos) : 0
  const running = standing?.objectives.some((o) => o.last_run?.status === 'running') ?? false

  return (
    <div
      className={css.rail}
      aria-label="Equipment"
      style={
        {
          // Floating, never in a lane (Owner 2026-09-23): over the page, and
          // with a panel open just left of it — never over the panel.
          right: panel ? PANEL_CARD_PX : 6,
          top: SHELL_TOP_BAR_PX + 8,
        } as CSSProperties
      }
    >
      {EQUIP_GROUPS.map((g) => (
        <Group
          key={g.id}
          group={g}
          activePath={pathname}
          lamp={
            g.id === 'autopilot' && running ? (
              <span className={css.dot} title="A loop run is in flight" />
            ) : g.id === 'market' ? (
              <MarketFeedDot />
            ) : null
          }
          count={g.id === 'autopilot' ? waiting : g.id === 'market' ? firedToday : 0}
          countTitle={
            g.id === 'autopilot' ? `${waiting} waiting on a call` : `${firedToday} alert${firedToday === 1 ? '' : 's'} fired today`
          }
          full={full}
        />
      ))}
    </div>
  )
}
