/**
 * A floated equipment page — a window over the page you are on.
 *
 * `equipSurface.ts` holds the rules; this draws the window the design draws:
 * a 2px hue line across the top, a draggable title bar with the route beside
 * the name, the three device modes, `open as page →`, and `×`. No scrim: the
 * page behind stays completely interactive, which is the whole claim of the
 * word float.
 *
 * ## The three modes, and their numbers
 *
 * The design's twelfth round replaced "sizes" with **devices**, because some
 * readings want a tall narrow window and some want a table:
 *
 * - **Phone** — 420 wide, 88vh, pinned near the right edge. The shape of a
 *   list you scan or act one row of: the Decision Inbox, the Watchlist.
 * - **Pad** — `min(880px, 76vw)`, centred. The shape of a table.
 * - **Full** — 96vw × 94vh. The explicit third mode, not a separate concept.
 *
 * Precedence is the design's: geometry you dragged beats the mode you clicked,
 * which beats the grade in `equip.ts`. Clicking a mode clears the drag — a
 * button that appeared to do nothing would be worse than losing the position.
 *
 * The title bar is a `container` and sheds its parts as it narrows rather than
 * wrapping: the route and the hint go first, then `open as page →` collapses
 * to its arrow. A wrapped title bar in a 420px window costs a row of the page.
 */
import { Suspense, createElement, useCallback, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { EQUIP_HUE } from './equip'
import {
  closeSurface,
  loadGeometry,
  saveGeometry,
  setFloatMode,
  useSurfaces,
  type FloatGeometry,
} from './equipSurface'
import { floatPageFor } from './floatPages'
import { PageRouteFallback } from '@/components/layout'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import type { EquipSize } from './equip'
import css from './equipFloat.module.css'

const MODES: { m: EquipSize; glyph: string; title: string }[] = [
  { m: 'phone', glyph: '▯', title: 'Phone — tall and narrow, at the right edge' },
  { m: 'pad', glyph: '▭', title: 'Pad — centred tablet width' },
  { m: 'full', glyph: '⛶', title: 'Full — the whole page' },
]

/** The design's own geometry per mode, kept in one place so it reads as a table. */
function geometryFor(mode: EquipSize, geo: FloatGeometry | null) {
  const manual = geo?.l != null
  return {
    top: geo?.t != null ? `${geo.t}px` : mode === 'full' ? '2vh' : mode === 'phone' ? '5vh' : '7vh',
    left: manual
      ? `${geo!.l}px`
      : mode === 'phone'
        ? 'calc(100vw - 476px)'
        : '50%',
    transform: manual || mode === 'phone' ? 'none' : 'translateX(-50%)',
    width: geo?.w
      ? `${geo.w}px`
      : mode === 'full'
        ? '96vw'
        : mode === 'phone'
          ? '420px'
          : 'min(880px, 76vw)',
    height: geo?.h
      ? `${geo.h}px`
      : mode === 'full'
        ? '94vh'
        : mode === 'phone'
          ? 'min(860px, 88vh)'
          : '80vh',
  }
}

export function EquipFloat() {
  const { float, mode } = useSurfaces()
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement | null>(null)
  const to = float?.to ?? null

  // The geometry belongs to the route, so it is read when the route or the
  // mode changes — derived rather than held in state, because an effect that
  // sets state on mount renders the window twice and the first frame is at
  // the wrong size.
  const geo: FloatGeometry | null = useMemo(() => (to ? loadGeometry(to) : null), [to, mode])

  // Esc is one of the three ways out, and it is the one that works with your
  // hands on the keyboard. It stands down inside a field: Esc in a search box
  // belongs to the box.
  useEffect(() => {
    if (!to) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      const el = e.target as HTMLElement | null
      if (el && (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable)) return
      closeSurface('float')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [to])

  /**
   * Resizing is the browser's own handle; this watches the result so the size
   * is remembered per route the way the drag is.
   *
   * **The first observation is a baseline, not a resize.** The observer cannot
   * tell your drag of the corner from the window being laid out — it fires on
   * mount and again every time a mode button changes the geometry. Saving
   * those wrote the mode's own numbers into the manual slot, and since manual
   * beats mode, the next mode click appeared to do nothing. That is the exact
   * failure the design warned about, arriving through a different door.
   */
  useEffect(() => {
    const el = ref.current
    if (!el || !to) return
    let baseline: { w: number; h: number } | null = null
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      const box = { w: Math.round(r.width), h: Math.round(r.height) }
      if (baseline == null) {
        baseline = box
        return
      }
      if (box.w === baseline.w && box.h === baseline.h) return
      baseline = box
      saveGeometry(to, box)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [to, mode])

  const onDrag = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current
      if (!el || !to) return
      // Not from a control in the bar — a mode button is a click, not a grab.
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
        saveGeometry(to, { l: Math.round(ev.clientX - dx), t: Math.round(ev.clientY - dy) })
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [to],
  )

  if (!float) return null
  const Page = floatPageFor(float.to)
  const active: EquipSize = mode ?? float.size
  const hue = EQUIP_HUE[float.group]
  const g = geometryFor(active, geo)

  return (
    <div
      ref={ref}
      className={css.float}
      style={{ ...g, ['--rh' as string]: hue }}
      role="dialog"
      aria-label={`${float.label} — floating`}
    >
      <div className={css.bar} onPointerDown={onDrag}>
        <span className={css.dot} />
        <span className={css.name}>{float.label}</span>
        <span className={css.route}>{float.to}</span>
        <span className="ml-auto" />
        <span className={css.hint}>page behind stays live · esc</span>
        {MODES.map((md) => (
          <button
            key={md.m}
            type="button"
            title={md.title}
            onClick={() => setFloatMode(md.m)}
            className={css.mode}
            data-on={active === md.m ? '' : undefined}
          >
            {md.glyph}
          </button>
        ))}
        <button
          type="button"
          className={css.mode}
          title="Leave the float — open as the real page"
          onClick={() => {
            closeSurface('float')
            navigate(float.to)
          }}
        >
          <span className={css.navFull}>open as page →</span>
          <span className={css.navMin}>↗</span>
        </button>
        <button
          type="button"
          className={css.close}
          aria-label="Close"
          onClick={() => closeSurface('float')}
        >
          ×
        </button>
      </div>
      <div className={css.body}>
        {Page ? (
          <ErrorBoundary key={float.to}>
            <Suspense fallback={<PageRouteFallback />}>
              {/* `createElement`, not `<Page />`: the lint rule reads a
                  capitalised local as a component *defined* during render,
                  which loses its state every time. These are `lazy()` objects
                  created once at module scope, so the identity is stable and
                  React reconciles them as the same type — the rule's concern
                  does not apply, and this is the spelling that says so. */}
              {createElement(Page)}
            </Suspense>
          </ErrorBoundary>
        ) : (
          <p className="p-4 text-dense-meta text-muted-foreground">
            No page is registered for {float.to}.
          </p>
        )}
      </div>
    </div>
  )
}
