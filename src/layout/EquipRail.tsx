/**
 * The bottom toolbar — the equipment's own edge, present on every page.
 * It leads with the Symbol list's switch and the Symbol surface (Rev .58),
 * then the groups.
 *
 * Until design Rev .57 this was a column down the right edge. It lies down now
 * (Shell Spec §5a.11 "右栏下沉为底部工具栏"): the same groups, head then its
 * pages, as glass capsules centred in the content's lane, floating over the
 * page. Below 820 of lane only the heads show, in one capsule. (The status
 * pill it once shared the line with retired into the menu bar, Rev .60.) The sidebar
 * foot's square hides and shows it (`bottomLane.ts`).
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
import { type CSSProperties, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAutopilotStanding } from '@/hooks/useLoopHarness'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { firedTodayCount, useFiredAlerts } from '@/hooks/useFiredAlerts'
import { computeLiveNavLamp } from '@/utils/livePageLamps'
import { EQUIP_GROUPS, EQUIP_HUE, equipGroupOf, type EquipGroup, type EquipPage } from './equip'
import { PANEL_CARD_PX, isVisible, opensAsPage, placeOf, surfaceForRoute, symbolSurface, useSurfaces } from './equipSurface'
import { useSymbolGo } from './symbolGo'
import { useCarriedSymbol } from '@/lib/symbolContext'
import { toggleSurfaceFrom } from './equipMotion'
import { useBottomLane, useToolbarShown } from './bottomLane'
import { dockActions, useDockState } from './symbolDock/dockState'
import { glyph } from '@/lib/design/glyphs'
import css from './equipRail.module.css'

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
        // without this the click is a silent no-op (found 2026-09-24, the
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
      className={full ? css.group : css.bare}
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
        // already did. The page icons light for their own route only.
        here={here}
      >
        {/* Everything about the module sits on its icon (design Rev .57):
            the waiting count is the badge top-right, the status lamp the
            corner dot bottom-right, an open surface the running dot under
            it. Only Autopilot and Market carry a lamp or a count. */}
        {lamp}
        {(count ?? 0) > 0 ? (
          <span className={css.count} title={countTitle}>
            {count}
          </span>
        ) : null}
        {anyOpen ? <span className={css.run} aria-hidden /> : null}
      </RailButton>
      {full && group.pages.some((p) => p.rail !== false) ? <span className={css.rule} aria-hidden /> : null}
      {full
        ? group.pages.filter((p) => p.rail !== false).map((p) => (
            <RailButton key={p.to} page={p} open={openAt(p.to)} here={activePath === p.to} />
          ))
        : null}
    </div>
  )
}

const LIST_GLYPH = glyph('symlist')
const SUBJECT_GLYPH = glyph('subject')

/**
 * The carried name as a surface (Rev .58): the Symbol page beside this one,
 * in the panel by default and wherever you last put it after that. Lit while
 * it is on screen.
 */
function SymbolButton() {
  useSurfaces()
  const carried = useCarriedSymbol()
  const { toggle } = useSymbolGo()
  const shown = isVisible(symbolSurface().key)
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Symbol"
      aria-pressed={shown}
      title={`Symbol · ${carried || '—'} — ${shown ? 'put away' : 'open beside this page'}${placeNote(symbolSurface().key)}`}
      className={`${css.btn} ${css.item}`}
      style={{
        ['--rh' as string]: 'var(--sk-ticker)',
        marginLeft: 2,
        background: shown ? 'color-mix(in srgb, var(--sk-ticker) 16%, var(--sk-surface))' : 'var(--sk-surface)',
        color: 'var(--sk-ticker)',
      }}
    >
      <SUBJECT_GLYPH className="size-4" aria-hidden />
      <span className={css.label}>Symbol</span>
    </button>
  )
}

/**
 * The Symbol list's switch (design Rev .58): shows or hides the list. Its
 * mode — strip, docked, float — is switched in the list's own header, so
 * this button only ever means "on the screen or not".
 */
function ListsButton() {
  const { hidden } = useDockState()
  return (
    <button
      type="button"
      onClick={() => dockActions.setHidden(!hidden)}
      aria-label="Symbol lists"
      aria-pressed={!hidden}
      title={hidden ? 'Symbol lists — show' : 'Symbol lists — hide (the mode is switched in the list header)'}
      className={`${css.btn} ${css.head}`}
      style={{
        ['--rh' as string]: 'var(--sk-soft)',
        ['--rh-head-border' as string]: hidden ? 'var(--sk-line)' : 'var(--sk-accent)',
        background: 'var(--sk-surface)',
        color: 'var(--sk-soft)',
      }}
    >
      <LIST_GLYPH className="size-4" aria-hidden />
      <span className={css.label}>Lists</span>
    </button>
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
  const visible = useToolbarShown()
  // An overlaying panel takes the lane's right end; a pushing one already
  // narrowed the content, which the lane measures.
  const lane = useBottomLane(panel ? PANEL_CARD_PX : 0)

  // The page icons need 820 of lane; below that, the heads alone.
  const full = lane.width >= 820

  // The two readings that earn Autopilot its indicator, read where the sidebar
  // used to read them — the badge moved with the row.
  const waiting = standing ? (standing.pending_decisions?.calls ?? standing.pending_memos) : 0
  const running = standing?.objectives.some((o) => o.last_run?.status === 'running') ?? false

  if (!visible) return null

  const groups = EQUIP_GROUPS.map((g) => (
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
  ))

  return (
    <div
      className={css.rail}
      aria-label="Equipment"
      style={
        {
          // The bottom toolbar (design Rev .57–.60): floating over the page,
          // centred in the content's lane, 12 off the bottom.
          left: lane.left,
          right: lane.right,
          bottom: 12,
        } as CSSProperties
      }
    >
      {/* Heads only, one capsule holds them all: a one-icon group in its own
          capsule reads as a ring in a ring. With the pages, a capsule each.
          The Symbol list's switch leads either way. */}
      {full ? (
        <>
          <div className={css.group}>
            <ListsButton />
            <SymbolButton />
          </div>
          {groups}
        </>
      ) : (
        <div className={css.group}>
          <ListsButton />
          <SymbolButton />
          <span className={css.rule} aria-hidden />
          {groups}
        </div>
      )}
    </div>
  )
}
