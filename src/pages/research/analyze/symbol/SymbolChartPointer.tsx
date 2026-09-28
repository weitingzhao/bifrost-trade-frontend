/**
 * The price chart's pointer (design Rev .102): a crosshair with a readout —
 * date, OHLC, the bar's change, volume and how far the walls sit from its
 * close — drawn straight into the DOM on every move, never through a render;
 * drag pans, the wheel (or a pinch) zooms about the cursor, double-click goes
 * back to today. A drag swallows the click that ends it, so panning across a
 * trade does not open it.
 *
 * Geometry is the chart's own: its SVG viewBox and frame paddings for x, and
 * the price scale the overlay writes on `[data-price-scale]` for y.
 */
import { useEffect, useRef, type ReactNode } from 'react'
import type { Bar } from '@/types/market'
import { fmtPctSigned } from '@/lib/format'
import { barIsoDate, panView, zoomView, type PriceView } from './symbolPriceModel'

interface Frame {
  paddingLeft: number
  paddingRight: number
  width: number
}

export interface ChartPointerProps {
  children: ReactNode
  frame: Frame
  total: number
  view: PriceView
  onView: (v: PriceView) => void
  bars: readonly Bar[]
  /** Bars plus the future slots — the x-axis count the chart lays out. */
  xCount: number
  agg: number
  callWall: number | null
  putWall: number | null
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
    const geom = () => {
      const svg = el.querySelector<SVGSVGElement>('svg.data-bars-chart-svg')
      if (!svg) return null
      const r = svg.getBoundingClientRect()
      const vb = svg.viewBox.baseVal
      const inner =
        latest.current.frame.width -
        latest.current.frame.paddingLeft -
        latest.current.frame.paddingRight
      const scale =
        svg
          .querySelector('[data-price-scale]')
          ?.getAttribute('data-price-scale')
          ?.split(',')
          .map(Number) ?? null
      return { r, vb, inner, scale }
    }
    const hide = () => {
      if (layer.current) layer.current.style.display = 'none'
    }
    const move = (e: MouseEvent) => {
      const g = geom()
      const L = layer.current
      if (!g || !L || dragging) return
      const P = latest.current
      const vx = ((e.clientX - g.r.left) / g.r.width) * g.vb.width
      const vy = ((e.clientY - g.r.top) / g.r.height) * g.vb.height
      const slot = ((vx - P.frame.paddingLeft) / g.inner) * Math.max(1, P.xCount - 1)
      const idx = Math.round(slot)
      if (idx < 0 || idx >= P.xCount) return hide()
      const [vline, hline, price, readout] = Array.from(L.children) as HTMLElement[]
      L.style.display = 'block'
      const xAt = P.frame.paddingLeft + (idx / Math.max(1, P.xCount - 1)) * g.inner
      vline.style.left = `${(xAt / g.vb.width) * 100}%`
      // [y0, pricePerUnit, top, bottom]: price = (y0 − y) / pricePerUnit.
      const sc = g.scale
      const inPrice = sc != null && vy >= sc[2] && vy <= sc[3]
      hline.style.display = price.style.display = inPrice ? 'block' : 'none'
      if (inPrice && sc) {
        const top = `${(vy / g.vb.height) * 100}%`
        hline.style.top = top
        price.style.top = top
        price.textContent = ((sc[0] - vy) / sc[1]).toFixed(2)
      }
      const b = P.bars[idx]
      if (b) {
        const ch = b.open ? (b.close / b.open - 1) * 100 : null
        const wall = (w: number | null) =>
          w != null && b.close ? fmtPctSigned((w / b.close - 1) * 100) : '—'
        readout.innerHTML = ''
        const add = (text: string, cls = '') => {
          const s = document.createElement('span')
          s.textContent = text
          if (cls) s.className = cls
          readout.appendChild(s)
        }
        add(
          `${P.agg > 1 ? 'wk to ' : ''}${b.time != null ? barIsoDate(b.time) : ''}`,
          'font-semibold text-foreground'
        )
        add(
          `O ${b.open.toFixed(2)} H ${b.high.toFixed(2)} L ${b.low.toFixed(2)} C ${b.close.toFixed(2)}`
        )
        if (ch != null)
          add(fmtPctSigned(ch), ch >= 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]')
        if (b.volume != null) add(`vol ${(Number(b.volume) / 1e6).toFixed(1)}M`)
        if (P.callWall != null || P.putWall != null)
          add(`call wall ${wall(P.callWall)} · put wall ${wall(P.putWall)}`)
      } else {
        readout.textContent = `+${(idx - (P.bars.length - 1)) * P.agg} sessions · ±1σ cone`
      }
      const right = vx / g.vb.width > 0.55
      readout.style.left = right ? '4px' : ''
      readout.style.right = right ? '' : '52px'
    }

    let dragging = false
    const down = (e: MouseEvent) => {
      if (e.button !== 0) return
      const g = geom()
      if (!g) return
      const start = { x: e.clientX, view: latest.current.view }
      // Sessions per screen pixel across the plot.
      const per = latest.current.view.span / Math.max(1, (g.r.width * g.inner) / g.vb.width)
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
      const g = geom()
      if (!g) return
      e.preventDefault()
      const P = latest.current
      const vx = ((e.clientX - g.r.left) / g.r.width) * g.vb.width
      const fx = Math.max(0, Math.min(1, (vx - P.frame.paddingLeft) / g.inner))
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
      className="relative select-none"
      title="Drag to pan · wheel or pinch to zoom · double-click for today"
    >
      {p.children}
      <div ref={layer} className="pointer-events-none absolute inset-0 hidden" aria-hidden>
        <div className="absolute inset-y-0 w-px bg-[color-mix(in_srgb,var(--sk-ink)_35%,transparent)]" />
        <div className="absolute inset-x-0 h-px bg-[color-mix(in_srgb,var(--sk-ink)_35%,transparent)]" />
        <div className="absolute right-0 -translate-y-1/2 rounded bg-[var(--sk-raised2,var(--background))] px-1 font-mono text-dense-micro text-foreground" />
        <div className="absolute top-1 flex max-w-[70%] flex-wrap gap-x-2 rounded bg-[color-mix(in_srgb,var(--background)_85%,transparent)] px-1.5 py-0.5 font-mono text-dense-micro text-muted-foreground" />
      </div>
    </div>
  )
}
