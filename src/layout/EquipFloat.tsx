/**
 * A floated surface — a window over the page you are on.
 *
 * `equipSurface.ts` holds the rules; this draws the window: a 2px hue line
 * across the top, a draggable title bar with the summoning glyph beside the
 * name, the two sizes, the three place buttons, and `×`. **No scrim**: the
 * page behind stays completely interactive, which is the whole claim of the
 * word float.
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
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  PANEL_CARD_PX,
  closeSurface,
  loadGeometry,
  saveGeometry,
  setFloatSize,
  useSurfaces,
  type FloatGeometry,
  type FloatSize,
} from './equipSurface'
import { EQUIP_HUE } from './equip'
import { PlaceButtons } from './PlaceButtons'
import { SurfaceBody } from './SurfaceBody'
import { SurfaceGlyph } from './SurfaceGlyph'
import { SHELL_TOP_BAR_PX } from './shellChrome'
import css from './equipSurface.module.css'

const SIZES: { size: FloatSize; glyph: string; title: string }[] = [
  { size: 'phone', glyph: '▯', title: 'Phone — tall and narrow, at the right edge' },
  { size: 'pad', glyph: '▭', title: 'Pad — tablet width, centred' },
]

const PHONE_W = 420
/** The rail's own lane plus its 8px inset — a Phone must not sit under it. */
const RAIL_LANE = 52

/**
 * The window's box: the size's own numbers unless you have dragged this
 * surface *at this size*, and clamped to the room the panel leaves.
 *
 * A position saved on a wide screen must not strand the window off-screen on
 * a narrow one, and a float must never bury the tab you opened beside it.
 */
function boxFor(size: FloatSize, saved: FloatGeometry | null, panelOpen: boolean): CSSProperties {
  const reserved = panelOpen ? PANEL_CARD_PX : 0
  const room = window.innerWidth - reserved - 16
  let geo: FloatGeometry = saved?.size === size ? { ...saved } : {}
  if (geo.w) geo.w = Math.min(geo.w, size === 'phone' ? 520 : room)
  // Less room than the window's own minimum: the saved box cannot be honoured
  // at all, so fall back to the size's default rather than to a sliver.
  if (geo.w && geo.w < 380) geo = {}
  if (geo.l != null) {
    geo.l = Math.max(8, Math.min(geo.l, window.innerWidth - reserved - 8 - (geo.w ?? PHONE_W)))
  }
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
          ? `calc(100vw - ${(panelOpen ? 8 + PANEL_CARD_PX : RAIL_LANE) + PHONE_W}px)`
          : `calc((100vw - ${reserved}px) / 2)`,
    transform: geo.l != null || size === 'phone' ? 'none' : 'translateX(-50%)',
    width: geo.w ? `${geo.w}px` : size === 'phone' ? `${PHONE_W}px` : `min(880px, ${room}px)`,
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
  const key = float?.key ?? null
  const size = float?.size ?? 'phone'
  const panelOpen = Boolean(panel)
  const [viewport, setViewport] = useState(() => window.innerWidth)

  useEffect(() => {
    const onResize = () => setViewport(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Derived rather than held in state: an effect that sets state on mount
  // renders the window twice and the first frame is at the wrong size.
  const box = useMemo(
    () => (key ? boxFor(size, loadGeometry(key), panelOpen) : null),
    // `viewport` is read inside, so a resize has to recompute the clamp.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, size, panelOpen, viewport],
  )

  // Esc is one of the three ways out, and the one that works with your hands
  // on the keyboard. It stands down inside a field: Esc in a search box
  // belongs to the box. Only the float answers to it — the panel is the
  // companion that stays.
  useEffect(() => {
    if (!key) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape' || !key) return
      const el = e.target as HTMLElement | null
      if (el && (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable)) return
      closeSurface(key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [key])

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
      const up = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        saveGeometry(key, {
          l: Math.round(ev.clientX - dx),
          t: Math.round(ev.clientY - dy),
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
      className={`${css.card} ${css.float}`}
      style={{ ...box, ['--rh' as string]: EQUIP_HUE[float.group] }}
      role="dialog"
      aria-label={`${float.label} — floating`}
    >
      <div className={css.bar} onPointerDown={onDrag}>
        <SurfaceGlyph surface={float} className={css.glyph} />
        <span className={css.name}>{float.label}</span>
        <span className={css.route}>{float.to}</span>
        <span className="ml-auto" />
        {SIZES.map((s) => (
          <button
            key={s.size}
            type="button"
            className={`${css.btn} ${size === s.size ? css.btnOn : ''}`}
            title={s.title}
            aria-pressed={size === s.size}
            onClick={() => setFloatSize(s.size)}
          >
            {s.glyph}
          </button>
        ))}
        {/* Size and place are two questions; the rule says so. */}
        <span className={css.sep} aria-hidden />
        <PlaceButtons surface={float} here="float" />
      </div>
      <div className={css.body}>
        <SurfaceBody surface={float} onClose={() => closeSurface(float.key)} />
      </div>
    </div>
  )
}
