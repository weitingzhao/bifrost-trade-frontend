/**
 * A floated surface — a window over the page you are on.
 *
 * `equipSurface.ts` holds the rules; this draws the window: a 2px hue line
 * across the top, a draggable title bar with the summoning glyph beside the
 * name, one size toggle, the place control, and `×` — three controls where the
 * bar used to carry six (design Rev 2026-09-23.25). **No scrim**: the page
 * behind stays completely interactive, which is the whole claim of the word
 * float.
 *
 * It springs out of the control that opened it and shrinks back into it on a
 * close (`equipMotion.ts`).
 *
 * ## Two sizes, and why only two
 *
 * - **▯ Phone** — 420 wide, 88vh, at the right edge (left of the panel when
 *   one is open). The shape of a list you scan or act one row of.
 * - **▭ Pad** — `min(880px, …)`, centred in what the panel leaves. A table.
 *
 * `⛶ Full` retired in the seventeenth round: it was the page, said twice, and
 * `⤢` says it properly. Size is a float-only idea, which is why it sits behind
 * a rule, apart from the place buttons.
 *
 * **Every surface first opens as a Phone** (fourteenth round): a first open is
 * a glance, not a commitment. Precedence after that is the design's — geometry
 * you dragged beats the size you clicked beats Phone. Clicking a size clears
 * the drag, because a button that appeared to do nothing would be worse than
 * losing a position.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  PANEL_CARD_PX,
  loadGeometry,
  saveGeometry,
  setFloatSize,
  useSurfaces,
  type FloatGeometry,
  type FloatSize,
} from './equipSurface'
import { EQUIP_HUE } from './equip'
import { animateFloatIn, registerSurfaceElement } from './equipMotion'
import { PlaceButtons } from './PlaceButtons'
import { SurfaceBody } from './SurfaceBody'
import { SurfaceGlyph } from './SurfaceGlyph'
import { SHELL_TOP_BAR_PX } from './shellChrome'
import { keepEquipmentLinksIn } from './surfaceLinks'
import { useDockColumn } from './symbolDock/dockState'
import css from './equipSurface.module.css'

/** One toggle: the glyph is the size it is, the title says what a click makes it. */
const SIZE_TOGGLE: Record<FloatSize, { glyph: string; title: string; next: FloatSize }> = {
  phone: { glyph: '▯', title: 'Size: Phone — switch to Pad (wider, centred)', next: 'pad' },
  pad: { glyph: '▭', title: 'Size: Pad — switch to Phone (tall, right edge)', next: 'phone' },
}

const PHONE_W = 420
/** Within this of a boundary on release, the window settles flush against it. */
const MAGNET_PX = 28
/** The inset every edge keeps. */
const GUTTER_PX = 8

/**
 * The one right limit every float path stops at (Rev .25–.27): left of the
 * Symbol list's column and of the panel when one is open. The column used to
 * be the rail's, which lay down into the bottom toolbar in Rev .57; the
 * right edge is the list's now (Rev .58), and 0 when it floats or is hidden.
 */
function rightLimit(panelOpen: boolean, dockPx: number): number {
  return window.innerWidth - dockPx - (panelOpen ? PANEL_CARD_PX : GUTTER_PX)
}

/**
 * The window's box: the size's own numbers unless you have dragged this
 * surface *at this size*, clamped to the room left of the dock — and of the
 * panel and the dock when a panel is open.
 *
 * **One right limit for every path** (design Rev .25–.27): the default place,
 * a restored drag and the size's own width all stop at the same edge. Since
 * the dock floats beside the panel rather than over it, a float that stopped
 * at the panel alone would sit on the dock.
 *
 * A position saved on a wide screen must not strand the window off-screen on
 * a narrow one, and a float must never bury the tab you opened beside it.
 */
function boxFor(size: FloatSize, saved: FloatGeometry | null, panelOpen: boolean, dockPx: number): CSSProperties {
  const limit = rightLimit(panelOpen, dockPx)
  const room = limit - 8
  let geo: FloatGeometry = saved?.size === size ? { ...saved } : {}
  if (geo.w) geo.w = Math.min(geo.w, size === 'phone' ? 520 : room, room)
  // Less room than the window's own minimum: the saved box cannot be honoured
  // at all, so fall back to the size's default rather than to a sliver.
  if (geo.w && geo.w < 380) geo = {}
  if (geo.l != null) geo.l = Math.max(8, Math.min(geo.l, limit - (geo.w ?? PHONE_W)))
  return {
    top:
      geo.t != null
        ? `${Math.max(SHELL_TOP_BAR_PX + 8, Math.min(geo.t, window.innerHeight - 120))}px`
        : size === 'phone'
          ? `${SHELL_TOP_BAR_PX + 8}px`
          : `max(${SHELL_TOP_BAR_PX + 8}px, 7vh)`,
    left:
      geo.l != null
        ? `${geo.l}px`
        : size === 'phone'
          ? `${limit - PHONE_W}px`
          : `calc((100vw - ${window.innerWidth - limit}px) / 2)`,
    transform: geo.l != null || size === 'phone' ? 'none' : 'translateX(-50%)',
    width: geo.w ? `${geo.w}px` : size === 'phone' ? `${PHONE_W}px` : `min(880px, ${limit - 24}px)`,
    height: geo.h
      ? `${Math.min(geo.h, window.innerHeight - SHELL_TOP_BAR_PX - 16)}px`
      : size === 'phone'
        ? `min(860px, calc(100vh - ${SHELL_TOP_BAR_PX + 24}px))`
        : `min(80vh, calc(100vh - ${SHELL_TOP_BAR_PX + 24}px))`,
  }
}

export function EquipFloat() {
  const { float, panel } = useSurfaces()
  const ref = useRef<HTMLDivElement | null>(null)
  const shown = useRef<string | null>(null)
  const key = float?.key ?? null
  const size = float?.size ?? 'phone'
  const panelOpen = Boolean(panel)
  const dockPx = useDockColumn().width
  const [viewport, setViewport] = useState(() => window.innerWidth)

  useEffect(() => {
    const onResize = () => setViewport(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Derived rather than held in state: an effect that sets state on mount
  // renders the window twice and the first frame is at the wrong size.
  const box = useMemo(
    () => (key ? boxFor(size, loadGeometry(key), panelOpen, dockPx) : null),
    // `viewport` is read inside, so a resize has to recompute the clamp.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, size, panelOpen, dockPx, viewport],
  )

  // A surface arriving in the float — opened, or moved here from the panel —
  // springs out of where it was summoned. Before paint, so the first frame is
  // already the animation's first frame rather than the window at rest.
  useLayoutEffect(() => {
    registerSurfaceElement('float', ref.current)
    if (key && key !== shown.current && ref.current) {
      animateFloatIn(ref.current, key)
      // Focus follows the eye (Rev .26): the keyboard lands in the window that
      // just opened; closing hands it back (`equipMotion`). The panel never
      // takes focus — it is beside the work, not in front of it.
      ref.current.focus({ preventScroll: true })
    }
    shown.current = key
  }, [key])

  // Esc lives in `useCockpitKeybinds`, not here: an inspector and a float can
  // both be open, and two listeners racing would close both. The order is one
  // reading, so it is written in one place.

  /**
   * Resizing is the browser's own handle; this watches the result so the size
   * is remembered per surface the way the drag is.
   *
   * **The first observation is a baseline, not a resize.** The observer cannot
   * tell your drag of the corner from the window being laid out — it fires on
   * mount and again every time a size button changes the geometry. Saving
   * those wrote the size's own numbers into the manual slot, and since manual
   * beats the size, the next size click appeared to do nothing.
   */
  useEffect(() => {
    const el = ref.current
    if (!el || !key) return
    let baseline: { w: number; h: number } | null = null
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      const next = { w: Math.round(r.width), h: Math.round(r.height) }
      if (baseline == null) {
        baseline = next
        return
      }
      if (next.w === baseline.w && next.h === baseline.h) return
      baseline = next
      saveGeometry(key, { ...next, size })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [key, size])

  const onDrag = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current
      if (!el || !key) return
      // Not from a control in the bar — a size button is a click, not a grab.
      if ((e.target as HTMLElement).closest('button')) return
      const start = el.getBoundingClientRect()
      const dx = e.clientX - start.left
      const dy = e.clientY - start.top
      const move = (ev: PointerEvent) => {
        el.style.left = `${ev.clientX - dx}px`
        el.style.top = `${ev.clientY - dy}px`
        el.style.transform = 'none'
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        // The edge magnet (Rev .27): within 28px of a boundary, settle flush
        // against it — the screen's edges, the top bar's underside, and the
        // dock (or the panel and the dock) on the right. A short ease, so the
        // snap reads as intent, not a jump.
        const r = el.getBoundingClientRect()
        const limit = rightLimit(panelOpen, dockPx)
        let left = r.left
        let top = r.top
        if (left < GUTTER_PX + MAGNET_PX) left = GUTTER_PX
        else if (r.right > limit - MAGNET_PX) left = limit - r.width
        if (top < SHELL_TOP_BAR_PX + GUTTER_PX + MAGNET_PX) top = SHELL_TOP_BAR_PX + GUTTER_PX
        else if (r.bottom > window.innerHeight - GUTTER_PX - MAGNET_PX)
          top = window.innerHeight - GUTTER_PX - r.height
        left = Math.round(left)
        top = Math.round(top)
        if (left !== Math.round(r.left) || top !== Math.round(r.top)) {
          el.style.transition = 'left 0.18s cubic-bezier(0.2,0.8,0.2,1), top 0.18s cubic-bezier(0.2,0.8,0.2,1)'
          el.style.left = `${left}px`
          el.style.top = `${top}px`
          window.setTimeout(() => {
            el.style.transition = ''
          }, 200)
        }
        saveGeometry(key, { l: left, t: top, size })
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [key, size, panelOpen, dockPx],
  )

  /**
   * The grip's own drag — the corner follows the pointer 1:1 (Rev .27). The
   * box is pinned where it stands first, because a Pad centres itself with a
   * transform and growing a centred box moves both edges at once.
   */
  const onGrip = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current
      if (!el || !key) return
      e.preventDefault()
      e.stopPropagation()
      const start = el.getBoundingClientRect()
      el.style.transform = 'none'
      el.style.left = `${Math.round(start.left)}px`
      el.style.top = `${Math.round(start.top)}px`
      const sx = e.clientX
      const sy = e.clientY
      const move = (ev: PointerEvent) => {
        el.style.width = `${Math.max(380, start.width + ev.clientX - sx)}px`
        el.style.height = `${Math.max(300, start.height + ev.clientY - sy)}px`
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        const r = el.getBoundingClientRect()
        saveGeometry(key, {
          l: Math.round(r.left),
          t: Math.round(r.top),
          w: Math.round(r.width),
          h: Math.round(r.height),
          size,
        })
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [key, size],
  )

  if (!float || !box) return null

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={`${css.card} ${css.float}`}
      style={{ ...box, ['--rh' as string]: EQUIP_HUE[float.group] }}
      role="dialog"
      aria-label={`${float.label} — floating`}
    >
      <div
        className={css.bar}
        onPointerDown={onDrag}
        onDoubleClick={(e) => {
          // macOS's own gesture: double-click the title bar to switch size.
          if ((e.target as HTMLElement).closest('button')) return
          setFloatSize(SIZE_TOGGLE[size].next)
        }}
        title="Drag to move · double-click to switch Phone / Pad"
      >
        <SurfaceGlyph surface={float} className={css.glyph} />
        <span className={css.name}>{float.label}</span>
        <span className={css.route}>{float.to}</span>
        <span className="ml-auto" />
        {/* Size and place are two questions: the toggle is the float's alone. */}
        <button
          type="button"
          className={css.size}
          title={SIZE_TOGGLE[size].title}
          aria-label={SIZE_TOGGLE[size].title}
          onClick={() => setFloatSize(SIZE_TOGGLE[size].next)}
        >
          {SIZE_TOGGLE[size].glyph}
        </button>
        <PlaceButtons surface={float} here="float" />
      </div>
      <div className={css.body} onClickCapture={keepEquipmentLinksIn('float')}>
        <SurfaceBody surface={float} />
      </div>
      <span className={css.grip} onPointerDown={onGrip} title="Drag to resize" aria-hidden />
    </div>
  )
}
