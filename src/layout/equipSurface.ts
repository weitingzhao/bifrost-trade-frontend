/**
 * One surface, three places — the rule the design spent eighteen rounds on.
 *
 * Anything you can open (the Watchlist, the Console, a Thread, a Run) is a
 * **surface**, and it lives in exactly one of three places at a time:
 *
 * - **page** — the frame itself.
 * - **panel** — one side column, drawn by the shell, 440 wide. More than one
 *   surface there means **tabs**, never a second column.
 * - **float** — one window, new tops old. The only place that has a *size*
 *   (▯ Phone 420 · ▭ Pad 880).
 *
 * Opening a surface somewhere removes it from wherever it was. Every header
 * carries the same three place buttons; the current place is lit and inert.
 *
 * ## Why the previous shape is gone
 *
 * This module used to hold `{ float, drawer }` — the ninth round's *page
 * floats, drawer slides, conversation docks*. The Owner's test killed it:
 * "用户心智上是一回事" — four implementations of the right-hand column
 * (docked float 420 / Thread 440 / shell drawer 480 / a page's own aside),
 * each with its own width, header, close and coexistence rules. The drawer
 * retires with a clean conscience: `equipSurface.test.ts` asserted that
 * nothing in this app was ever flagged one, and nothing was.
 *
 * Retired with it: `⛶ Full` (it is *the page*, said twice) and the `⇥ Dock`
 * mode (the panel absorbed it).
 *
 * ## Dock semantics, unchanged since the tenth round
 *
 * **Open IS persistent.** A surface rides across navigation until you close
 * it; the icon that opened it stays lit; there is no pin and no second
 * concept. Three ways out: `×`, `Esc`, the same icon again.
 *
 * **No scrim, anywhere.** The page behind stays completely interactive, which
 * is the whole claim of the word float — and the evidence of cross-phase work
 * is approving a decision while standing on a Trade page.
 *
 * ## What this app does differently from the design, and why
 *
 * The design's surfaces are **iframes** loading `<file>?embed=1#<route>`,
 * because its prototypes are separate documents. This app is one SPA, so a
 * surface renders the route's own component and the whole embed mechanism —
 * the flag, the CSS that hides the embedded shell, `postMessage` — has no
 * counterpart here.
 *
 * One consequence is real and not hidden: **a link inside a surface navigates
 * the frame page**, because React Router forbids a second router inside the
 * first. For a spine route that is exactly the design's remote-control rule —
 * *click a name in the notebook and what changes is the board on the desk*.
 * For an equipment route it is half of it. Owed.
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'
import { readJson, writeJson } from '@/lib/localStore'
import { EQUIP_GROUPS, EQUIP_HUE, type EquipGroup } from './equip'

/** Where a surface can be. `page` is a destination, not a resting state. */
export type Place = 'float' | 'panel' | 'page'

/** The float is the only place with a size. Phone is a glance, Pad is a table. */
export type FloatSize = 'phone' | 'pad'

export interface Surface {
  /** Identity. A route for equipment, `run:<id>` for a loop run. */
  key: string
  /** The route it belongs to — what the title bar prints and the rail lights. */
  to: string
  label: string
  group: EquipGroup['id']
  /** False for a reading that has no page of its own: a run, a conversation. */
  canPage: boolean
  /** Where it opens the first time, before place memory has an opinion. */
  def: Exclude<Place, 'page'>
  /** Set when the surface is a loop run rather than a whole route. */
  run?: string
  /** Set when the surface is the Copilot conversation rather than a page. */
  thread?: boolean
  /**
   * Set when the surface is the Symbol page (design Rev .58): `follow` shows
   * whatever is carried, `lock` keeps `symbol` whatever is carried.
   */
  subject?: 'follow' | 'lock'
  /** The locked surface's own name. */
  symbol?: string
  /**
   * Opened on a face — a contract row lands on Chain or Payoff, with the
   * contract as the face's own seed (`expiration`, `strike`, `right`). `n`
   * makes each ask new.
   */
  intent?: { tab: string; n: number; params?: Record<string, string> }
}

/** A tab remembers when it was last looked at — the overflow orders by it. */
export interface PanelTab extends Surface {
  t: number
}

export interface PanelState {
  tabs: PanelTab[]
  active: string
}

export interface FloatState extends Surface {
  size: FloatSize
}

/** The design's own keys, so the two sides stay legible to each other. */
const KEY = {
  float: 'bifrost.float',
  panel: 'bifrost.panel',
  where: 'bifrost.where',
  geo: 'bifrost.floatgeo',
}

/** The card's own width plus the 8px it is inset from each side. */
export const PANEL_WIDTH_PX = 440
export const PANEL_CARD_PX = PANEL_WIDTH_PX + 16

export interface FloatGeometry {
  t?: number
  l?: number
  w?: number
  h?: number
  /** Which size it was dragged at — geometry set at Phone must not survive ▭. */
  size?: FloatSize
}

export interface SurfaceState {
  float: FloatState | null
  panel: PanelState | null
}

// The ninth round's drawer, cleared rather than left to rot: a stale key that
// nothing reads is a trap for whoever next greps for it.
writeJson('bifrost.drawer', null)

function loadPanel(): PanelState | null {
  const saved = readJson<PanelState>(KEY.panel)
  if (!saved?.tabs?.length) return null
  return saved
}

const store = createExternalStore<SurfaceState>({
  float: readJson<FloatState>(KEY.float),
  panel: loadPanel(),
})

/* ── The table: which surface a route is, and where it opens ─────────────── */

/** The surface a rail route opens as — read off `equip.ts`, not off the caller. */
export function surfaceForRoute(to: string): Surface | null {
  for (const g of EQUIP_GROUPS) {
    const page = g.hub.to === to ? g.hub : g.pages.find((p) => p.to === to)
    if (!page) continue
    return { key: to, to, label: page.label, group: g.id, canPage: true, def: page.def ?? 'float' }
  }
  return null
}

/**
 * A loop run — the reading the Console's own inspector used to host.
 *
 * `canPage: false` is the honest part: the design routes a run at
 * `/research/loop/runs` and this app has no such page, so ⤢ is greyed rather
 * than offering a door to nothing. The deep link that does exist —
 * `/research/loop/harness?run=<id>` — opens this surface instead.
 */
export function runSurface(id: string): Surface {
  return {
    key: `run:${id}`,
    to: '/research/loop/harness',
    label: `Run ${id.length > 12 ? `${id.slice(0, 12)}…` : id}`,
    group: 'autopilot',
    canPage: false,
    def: 'panel',
    run: id,
  }
}

/**
 * The Copilot conversation — the second of the Copilot's two avatars.
 *
 * §5a.8's sixteenth round: **the rail opens its home (the Desk, a page), the
 * top bar's button opens the conversation.** They share a route and are not
 * the same surface, which is why this has a key of its own; Autopilot has no
 * conversation avatar, so it has no top-bar button, and the asymmetry is real
 * rather than an omission.
 *
 * `canPage: false` — a conversation is not a place. `⤢` is greyed, and the
 * Desk, which *is* a place, is one rail click away.
 */
export function threadSurface(): Surface {
  return {
    key: 'thread',
    to: '/research/copilot',
    label: 'Thread',
    group: 'copilot',
    canPage: false,
    def: 'panel',
    thread: true,
  }
}

/** The Symbol page's route — the one page that is also a surface of its own. */
export const SYMBOL_SURFACE_ROUTE = '/research/symbol'

/**
 * The Symbol page as a surface (design Rev .58, Symbol Panel Options 1a–2e).
 *
 * **One** following tab, keyed `symbol`: it shows the carried name, so a row
 * picked in the Symbol list or the omnibar changes it in place. ⇧ opens a
 * second, **locked** one keyed by the name, for side by side — two locked
 * names are two tabs, the same name twice is one.
 *
 * Its home is the panel; place memory applies from there on.
 */
export function symbolSurface(
  sym?: string | null,
  opts?: { lock?: boolean; tab?: string; params?: Record<string, string> },
): Surface {
  const name = (sym ?? '').trim().toUpperCase()
  const lock = Boolean(opts?.lock && name)
  return {
    key: lock ? `symbol:${name}` : 'symbol',
    to: SYMBOL_SURFACE_ROUTE,
    label: lock ? `Symbol · ${name}` : 'Symbol',
    group: 'book',
    canPage: true,
    def: 'panel',
    subject: lock ? 'lock' : 'follow',
    ...(lock ? { symbol: name } : {}),
    ...(opts?.tab ? { intent: { tab: opts.tab, n: Date.now(), ...(opts.params ? { params: opts.params } : {}) } } : {}),
  }
}

/**
 * Lock a Symbol surface on a name, or set it following again (null) — the 440
 * head's Follow / Lock. The surface keeps its key and its place; what changes
 * is whether a carry reaches it, and its label says so.
 */
export function setSubjectLock(key: string, sym: string | null): void {
  const name = (sym ?? '').trim().toUpperCase()
  const patch = <T extends Surface>(s: T): T =>
    s.key !== key || !s.subject
      ? s
      : name
        ? { ...s, subject: 'lock', symbol: name, label: `Symbol · ${name}` }
        : { ...s, subject: 'follow', symbol: undefined, label: 'Symbol' }
  const st = store.getState()
  commit(st.float ? patch(st.float) : null, st.panel ? { ...st.panel, tabs: st.panel.tabs.map(patch) } : null)
}

/** What a tab or a float bar calls it — the following Symbol tab names what it is showing. */
export function surfaceLabel(surf: Pick<Surface, 'label' | 'subject'>, carried: string): string {
  if (surf.subject === 'follow') return `Symbol · ${carried || '—'}`
  // Two tabs on one name — following it, and locked on it — must not read alike.
  return surf.subject === 'lock' ? `${surf.label} (locked)` : surf.label
}

/** A surface's hue: its group's, except the Symbol page, which wears the ticker's. */
export function surfaceHue(surf: Pick<Surface, 'group' | 'subject'>): string {
  return surf.subject ? 'var(--sk-ticker)' : EQUIP_HUE[surf.group]
}

/* ── Place memory ────────────────────────────────────────────────────────── */

/**
 * Runs share one memory: where you put the last one is where the next goes.
 * Locked Symbol tabs share one too — they open in the panel, beside the
 * following one, which is what a comparison needs.
 */
function memoryKey(key: string): string {
  if (key.startsWith('run:')) return 'run'
  return key.startsWith('symbol:') ? 'symbol:lock' : key
}

function rememberedPlace(key: string): Place | null {
  const all = readJson<Record<string, Place>>(KEY.where) ?? {}
  return all[memoryKey(key)] ?? null
}

function rememberPlace(key: string, place: Place): void {
  const all = readJson<Record<string, Place>>(KEY.where) ?? {}
  all[memoryKey(key)] = place
  writeJson(KEY.where, all)
}

/* ── Reading the state ───────────────────────────────────────────────────── */

/**
 * Where a closed surface would open — `openSurface`'s own resolution, without
 * opening it. The rail and the ⌥-springs need it because the `page` place is
 * the one this module cannot enter: it records the choice and the CALLER
 * navigates (see PlaceButtons). A caller that toggles without checking this
 * turns the click into a silent no-op once the reader has used ⤢.
 */
export function opensAsPage(key: string): boolean {
  return rememberedPlace(key) === 'page'
}

export function placeOf(key: string): Exclude<Place, 'page'> | null {
  const s = store.getState()
  if (s.float?.key === key) return 'float'
  return s.panel?.tabs.some((t) => t.key === key) ? 'panel' : null
}

/** Open *and* in front — a tab behind another tab is open but not visible. */
export function isVisible(key: string): boolean {
  const s = store.getState()
  return s.float?.key === key || s.panel?.active === key
}

/** Everything open, in either place — what the rail's group frame reads. */
export function openSurfaceKeys(): string[] {
  const s = store.getState()
  return [...(s.float ? [s.float.key] : []), ...(s.panel?.tabs.map((t) => t.key) ?? [])]
}

/* ── Moving surfaces around ──────────────────────────────────────────────── */

function commit(float: FloatState | null, panel: PanelState | null): void {
  writeJson(KEY.float, float)
  writeJson(KEY.panel, panel)
  store.setState({ float, panel })
}

/** Drop a tab, keeping the panel a panel only while it still has one. */
function withoutTab(panel: PanelState | null, key: string): PanelState | null {
  if (!panel) return null
  const tabs = panel.tabs.filter((t) => t.key !== key)
  if (!tabs.length) return null
  return { tabs, active: panel.active === key ? tabs[tabs.length - 1].key : panel.active }
}

/**
 * Put a surface in a place — the one operation the three place buttons, the
 * rail and every "open beside" share.
 *
 * A surface lives in exactly one place, so arriving somewhere is also leaving
 * everywhere else.
 */
export function openSurface(surf: Surface, place?: Place): void {
  const where = place ?? rememberedPlace(surf.key) ?? surf.def
  const s = store.getState()

  if (where === 'page') {
    // Not a resting place: the surface closes and the frame navigates. The
    // caller does the navigating — this module does not own the router.
    if (!surf.canPage) return
    rememberPlace(surf.key, 'page')
    commit(s.float?.key === surf.key ? null : s.float, withoutTab(s.panel, surf.key))
    return
  }

  rememberPlace(surf.key, where)

  if (where === 'float') {
    const size: FloatSize =
      (s.float?.key === surf.key ? s.float.size : null) ?? loadGeometry(surf.key)?.size ?? 'phone'
    commit({ ...surf, size }, withoutTab(s.panel, surf.key))
    return
  }

  const tabs = s.panel ? s.panel.tabs.slice() : []
  const tab: PanelTab = { ...surf, t: Date.now() }
  const at = tabs.findIndex((x) => x.key === surf.key)
  if (at >= 0) tabs[at] = tab
  else tabs.push(tab)
  commit(s.float?.key === surf.key ? null : s.float, { tabs, active: surf.key })
}

export function closeSurface(key: string): void {
  const s = store.getState()
  commit(s.float?.key === key ? null : s.float, withoutTab(s.panel, key))
}

/** Bring a tab forward without moving it — the strip's own click. */
export function focusTab(key: string): void {
  const s = store.getState()
  if (!s.panel) return
  commit(s.float, {
    tabs: s.panel.tabs.map((x) => (x.key === key ? { ...x, t: Date.now() } : x)),
    active: key,
  })
}

/**
 * The rail's click, and the Copilot button's: **visible → close · open but
 * behind another tab → bring it forward · not open → open where you last put
 * it.** One gesture covers all three, which is what retiring the pin bought.
 */
export function toggleSurface(surf: Surface): void {
  if (isVisible(surf.key)) {
    closeSurface(surf.key)
    return
  }
  if (placeOf(surf.key) === 'panel') {
    focusTab(surf.key)
    return
  }
  openSurface(surf)
}

/* ── The float's size, and the geometry that beats it ────────────────────── */

export function setFloatSize(size: FloatSize): void {
  const open = store.getState().float
  if (!open) return
  // Precedence is the design's: geometry you dragged beats the size you
  // clicked. A size button that left a stale drag in place would appear to do
  // nothing, so choosing a size clears it.
  saveGeometry(open.key, null)
  commit({ ...open, size }, store.getState().panel)
}

/** Geometry belongs to a surface *at a size* — a Phone drag must not size a Pad. */
export function loadGeometry(key: string): FloatGeometry | null {
  const all = readJson<Record<string, FloatGeometry>>(KEY.geo) ?? {}
  return all[key] ?? null
}

export function saveGeometry(key: string, patch: FloatGeometry | null): void {
  const all = readJson<Record<string, FloatGeometry>>(KEY.geo) ?? {}
  if (patch == null) delete all[key]
  else all[key] = { ...all[key], ...patch }
  writeJson(KEY.geo, all)
}

/* ── The tab strip ───────────────────────────────────────────────────────── */

export interface Strip {
  /** Drawn in the strip, in the order they were opened. */
  shown: PanelTab[]
  /** Behind `+N`. Never evicted, never closed on your behalf. */
  over: PanelTab[]
  /** True once the strip has to shed labels — 4 tabs and up. */
  compact: boolean
}

/**
 * ≤3 tabs are full (icon · name · ×). From 4, the active tab stays full, the
 * two most recently looked at shrink to their icons, and the rest go into a
 * `+N` menu. **Nothing is ever evicted** — overflow is a menu, not a queue,
 * because a column that quietly drops what you opened is worse than one that
 * asks for a click.
 */
export function stripFor(panel: PanelState): Strip {
  const compact = panel.tabs.length > 3
  if (!compact) return { shown: panel.tabs, over: [], compact }
  const keep = new Set(
    panel.tabs
      .filter((x) => x.key !== panel.active)
      .sort((a, b) => b.t - a.t)
      .slice(0, 2)
      .map((x) => x.key),
  )
  return {
    shown: panel.tabs.filter((x) => x.key === panel.active || keep.has(x.key)),
    over: panel.tabs.filter((x) => x.key !== panel.active && !keep.has(x.key)),
    compact,
  }
}

export function useSurfaces(): SurfaceState {
  return store.useStore()
}

/** The state outside React — for the close animation, which runs from a handler. */
export function surfaceState(): SurfaceState {
  return store.getState()
}

/** The active tab, or null — the panel's hue and its place buttons read it. */
export function activeTabOf(panel: PanelState | null): PanelTab | null {
  if (!panel) return null
  return panel.tabs.find((x) => x.key === panel.active) ?? panel.tabs[0] ?? null
}
