/**
 * The price chart's pointer (design K-LINE-SPEC §7): a crosshair snapped to
 * the candle centre, a price read-out in the axis column, and one read-out
 * line — date · O H L C and the bar's change · volume · how far the walls sit ·
 * the marked signal on that bar — written straight into the DOM on every move,
 * never through a render. Drag pans, the wheel (or a pinch) zooms about the
 * cursor, double-click goes back to today; a drag swallows the click that ends
 * it, so panning across a trade does not open it.
 *
 * Geometry is the chart's own `FrameGeom`: x on the 0–900 logical axis, y in
 * pixels of the fixed-height plot.
 */
import { useEffect, useRef, type ReactNode } from 'react'
import type { Bar } from '@/types/market'
import { fmtPctSigned } from '@/lib/format'
import { PLOT_W, cx, priceAt, type FrameGeom } from '@/components/symbolChart/priceFrame'
import { barIsoDate, panView, zoomView, type PriceView } from '@/components/symbolChart/symbolPriceModel'

export interface ChartPointerProps {
  children: ReactNode
  g: FrameGeom
  total: number
  view: PriceView
  onView: (v: PriceView) => void
  bars: readonly Bar[]
  agg: number
  callWall: number | null
  putWall: number | null
  /** The marked signal by bar index, and its name. */
  signalAt: ReadonlyMap<number, 'up' | 'down' | 'both'>
  signalName: string
}

export function SymbolChartPointer(p: ChartPointerProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const latest = useRef(p)
  const dragged = useRef(false)
  useEffect(() => {
    latest.current = p
  })

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    let dragging = false
    const hide = () => {
      if (layer.current) layer.current.style.display = 'none'
    }
    const logicalX = (clientX: number) => {
      const r = el.getBoundingClientRect()
      return { r, lx: ((clientX - r.left) / Math.max(1, r.width)) * PLOT_W }
    }
    const move = (e: MouseEvent) => {
      const L = layer.current
      if (!L || dragging) return
      const P = latest.current
      const { g } = P
      const { r, lx } = logicalX(e.clientX)
      const idx = Math.floor(lx / g.xw)
      if (idx < 0 || idx >= g.slots) return hide()
      const [vline, hline, price, readout] = Array.from(L.children) as HTMLElement[]
      L.style.display = 'block'
      vline.style.left = `${(cx(g, idx) / PLOT_W) * 100}%`
      const y = e.clientY - r.top
      const inPrice = y >= g.pT && y <= g.pT + g.pH
      hline.style.display = price.style.display = inPrice ? 'block' : 'none'
      if (inPrice) {
        hline.style.top = price.style.top = `${y}px`
        price.textContent = priceAt(g, y).toFixed(2)
      }
      readout.innerHTML = ''
      const add = (text: string, cls = '') => {
        const s = document.createElement('span')
        s.textContent = text
        if (cls) s.className = cls
        readout.appendChild(s)
      }
      const b = P.bars[idx]
      if (b) {
        add(`${P.agg > 1 ? 'wk to ' : ''}${b.time != null ? barIsoDate(b.time) : ''}`, 'font-semibold text-[var(--sk-ink)]')
        add(`O ${b.open.toFixed(2)} H ${b.high.toFixed(2)} L ${b.low.toFixed(2)} C ${b.close.toFixed(2)}`, 'text-[var(--sk-ink)]')
        const ch = b.open ? (b.close / b.open - 1) * 100 : null
        if (ch != null) add(fmtPctSigned(ch), ch >= 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]')
        if (b.volume != null) add(`vol ${(Number(b.volume) / 1e6).toFixed(1)}M`)
        const wall = (w: number | null) => (w != null && b.close ? fmtPctSigned((w / b.close - 1) * 100) : '—')
        if (P.callWall != null || P.putWall != null) add(`call wall ${wall(P.callWall)} · put wall ${wall(P.putWall)}`)
        const s = P.signalAt.get(idx)
        if (s)
          add(
            s === 'both' ? `▲▼ ${P.signalName}` : `${s === 'up' ? '▲' : '▼'} ${P.signalName} ${s === 'up' ? 'buy' : 'sell'}`,
            'text-[var(--sk-ink)]',
          )
      } else {
        add(`+${(idx - (P.bars.length - 1)) * P.agg} sessions · ±1σ cone`)
      }
      const leftHalf = lx / PLOT_W < 0.55
      readout.style.right = leftHalf ? '8px' : ''
      readout.style.left = leftHalf ? '' : '4px'
    }
    const down = (e: MouseEvent) => {
      if (e.button !== 0) return
      const P = latest.current
      const r = el.getBoundingClientRect()
      const start = { x: e.clientX, view: P.view }
      const barsPx = (r.width * P.bars.length) / Math.max(1, P.g.slots)
      const per = P.view.span / Math.max(1, barsPx)
      let moved = false
      const mv = (ev: MouseEvent) => {
        const dx = ev.clientX - start.x
        if (!moved && Math.abs(dx) > 3) {
          moved = true
          dragging = true
          el.style.cursor = 'grabbing'
          hide()
        }
        if (moved) latest.current.onView(panView(latest.current.total, start.view, dx * per))
      }
      const up = () => {
        window.removeEventListener('mousemove', mv)
        window.removeEventListener('mouseup', up)
        el.style.cursor = ''
        dragging = false
        if (moved) {
          dragged.current = true
          setTimeout(() => {
            dragged.current = false
          }, 0)
        }
      }
      window.addEventListener('mousemove', mv)
      window.addEventListener('mouseup', up)
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const P = latest.current
      const { lx } = logicalX(e.clientX)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && !e.ctrlKey) {
        const r = el.getBoundingClientRect()
        const per = P.view.span / Math.max(1, (r.width * P.bars.length) / Math.max(1, P.g.slots))
        P.onView(panView(P.total, P.view, -e.deltaX * per))
        return
      }
      const fx = Math.max(0, Math.min(1, lx / Math.max(1, P.bars.length * P.g.xw)))
      // A pinch arrives as a ctrl-wheel with small deltas; scale by the delta.
      const factor = Math.exp(Math.max(-0.5, Math.min(0.5, e.deltaY * (e.ctrlKey ? 0.01 : 0.002))))
      P.onView(zoomView(P.total, P.view, fx, factor))
    }
    const dbl = () => latest.current.onView({ span: latest.current.view.span, off: 0 })
    const swallow = (e: MouseEvent) => {
      if (dragged.current) {
        e.stopPropagation()
        e.preventDefault()
      }
    }
    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', hide)
    el.addEventListener('mousedown', down)
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('dblclick', dbl)
    el.addEventListener('click', swallow, true)
    return () => {
      el.removeEventListener('mousemove', move)
      el.removeEventListener('mouseleave', hide)
      el.removeEventListener('mousedown', down)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('dblclick', dbl)
      el.removeEventListener('click', swallow, true)
    }
  }, [])

  return (
    <div
      ref={wrap}
      className="relative cursor-crosshair select-none"
      style={{ height: p.g.H }}
      title="Drag to pan · wheel or pinch to zoom · double-click for today"
    >
      {p.children}
      <div ref={layer} className="pointer-events-none absolute inset-0 z-[6] hidden" aria-hidden>
        <div className="absolute inset-y-0 w-0 border-l border-dashed border-[color-mix(in_srgb,var(--sk-ink)_40%,transparent)]" />
        <div className="absolute inset-x-0 h-0 border-t border-dashed border-[color-mix(in_srgb,var(--sk-ink)_40%,transparent)]" />
        <span className="absolute -right-14 w-[52px] -translate-y-1/2 rounded bg-[var(--sk-ink)] px-[5px] py-px font-mono text-dense-caption font-semibold text-[var(--background)]" />
        <div className="absolute top-1 flex max-w-[70%] flex-wrap gap-x-3 gap-y-0.5 rounded-md bg-[color-mix(in_srgb,var(--sk-raised)_90%,transparent)] px-[7px] py-1 font-mono text-dense-meta text-[var(--sk-mute2)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--sk-ink)_10%,transparent)]" />
      </div>
    </div>
  )
}
