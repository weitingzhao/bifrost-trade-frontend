/**
 * The Symbol price chart's geometry (design K-LINE-SPEC, Rev .159) — pure.
 *
 * Panes have fixed pixel heights (price 240 · volume 40 · MACD / RSI 56 each;
 * the 440 panel's mini 150 · 28), so the svg is drawn with
 * `preserveAspectRatio="none"`: x is a 0–900 logical axis stretched to the
 * plot's width, y is 1:1 pixels. Nothing here returns text placed inside the
 * svg — ticks, tags and labels are positioned HTML, and what must keep a
 * screen width (signal triangles, the thinnest candle) is divided by `kx`, the
 * plot's real width over 900.
 */
import type { BollingerPoint, MacdPoint } from '@/components/charts/barsChartMath'

export const PLOT_W = 900
export const AXIS_W = 56
export const TAG_GAP = 16

export interface FrameBar {
  open: number
  high: number
  low: number
  close: number
  volume?: number | string | null
}

export type SubPaneKind = 'macd' | 'rsi'

export interface FrameInput {
  bars: readonly FrameBar[]
  /** Future slots after the last bar (the ±1σ cone), 0 when panned back or without a cone. */
  coneSlots: number
  /** The cone's half-width `slots` after the last bar, or null when there is no cone. */
  coneWidthAt: ((slots: number) => number) | null
  /** The cone's anchor (the last close). */
  anchor: number | null
  /** Call and put wall — they set the scale only while the window reaches today. */
  walls: { call: number | null; put: number | null }
  levelsOn: boolean
  live: boolean
  bb: readonly (BollingerPoint | null)[] | null
  /** Price lines drawn on the price pane (the marked Pine script's plots); they set the scale like BB. */
  lines?: readonly (readonly (number | null)[])[] | null
  panes: readonly SubPaneKind[]
  mini: boolean
}

export interface Pane {
  k: SubPaneKind
  y0: number
  h: number
}

export interface FrameGeom {
  H: number
  pT: number
  pH: number
  vT: number
  vH: number
  slots: number
  xw: number
  topV: number
  rng: number
  panes: Pane[]
}

const isNum = (v: number | null | undefined): v is number => v != null && Number.isFinite(v)

export function frameGeom(inp: FrameInput): FrameGeom {
  const n = inp.bars.length
  const slots = Math.max(1, n + inp.coneSlots)
  const xw = PLOT_W / slots
  const pts: number[] = []
  for (const b of inp.bars) {
    if (isNum(b.high)) pts.push(b.high)
    if (isNum(b.low)) pts.push(b.low)
  }
  if (inp.live && inp.levelsOn) {
    if (isNum(inp.walls.call)) pts.push(inp.walls.call)
    if (isNum(inp.walls.put)) pts.push(inp.walls.put)
    if (inp.coneWidthAt && isNum(inp.anchor) && inp.coneSlots > 0) {
      const w = inp.coneWidthAt(inp.coneSlots)
      if (isNum(w)) pts.push(inp.anchor + w, inp.anchor - w)
    }
  }
  for (const p of inp.bb ?? []) {
    if (p && isNum(p.upper) && isNum(p.lower)) pts.push(p.upper, p.lower)
  }
  for (const line of inp.lines ?? []) for (const v of line) if (isNum(v)) pts.push(v)
  const hi = pts.length ? Math.max(...pts) : 1
  const lo = pts.length ? Math.min(...pts) : 0
  const span = hi - lo || Math.max(1, Math.abs(hi) * 0.02)
  const pad = span * 0.04
  const pT = inp.mini ? 6 : 8
  const pH = inp.mini ? 138 : 224
  const vT = inp.mini ? 156 : 248
  const vH = inp.mini ? 28 : 40
  let H = vT + vH
  const panes: Pane[] = []
  if (!inp.mini)
    for (const k of inp.panes) {
      panes.push({ k, y0: H + 8, h: 56 })
      H += 64
    }
  return { H, pT, pH, vT, vH, slots, xw, topV: hi + pad, rng: span + pad * 2, panes }
}

export const cx = (g: FrameGeom, i: number) => (i + 0.5) * g.xw
export const py = (g: FrameGeom, v: number) => g.pT + ((g.topV - v) / g.rng) * g.pH
export const priceAt = (g: FrameGeom, y: number) => g.topV - ((y - g.pT) / g.pH) * g.rng
export function inPrice(g: FrameGeom, v: number | null | undefined): boolean {
  if (!isNum(v)) return false
  const y = py(g, v)
  return y >= g.pT && y <= g.pT + g.pH
}

const f2 = (v: number) => v.toFixed(2)
const f1 = (v: number) => v.toFixed(1)
const rect = (x0: number, y: number, w: number, h: number) =>
  `M${f2(x0)} ${f1(y)}h${f2(w)}v${f1(h)}h${f2(-w)}z`

/** Body width: 62% of the slot, never under one screen pixel. */
export const bodyWidth = (g: FrameGeom, kx: number) => Math.max(1 / kx, g.xw * 0.62)

export function candlePaths(g: FrameGeom, bars: readonly FrameBar[], kx: number) {
  const bw = bodyWidth(g, kx)
  const vols = bars.map((b) => {
    const v = Number(b.volume)
    return Number.isFinite(v) ? v : 0
  })
  const vMax = Math.max(1, ...vols)
  let wicks = ''
  let up = ''
  let dn = ''
  let volUp = ''
  let volDn = ''
  bars.forEach((b, i) => {
    const x = cx(g, i)
    const x0 = x - bw / 2
    const yT = py(g, Math.max(b.open, b.close))
    const hh = Math.max(1, Math.abs(py(g, b.open) - py(g, b.close)))
    wicks += `M${f2(x)} ${f1(py(g, b.high))}L${f2(x)} ${f1(py(g, b.low))}`
    const body = rect(x0, yT, bw, hh)
    const vh = Math.max(1, (vols[i] / vMax) * (g.vH - 2))
    const vol = rect(x0, g.vT + g.vH - vh, bw, vh)
    if (b.close >= b.open) {
      up += body
      volUp += vol
    } else {
      dn += body
      volDn += vol
    }
  })
  return { wicks, up, dn, volUp, volDn }
}

/** Step = range / 4 rounded up to 1 · 2 · 2.5 · 5 · 10 × 10ⁿ. */
export function priceTicks(g: FrameGeom) {
  const raw = g.rng / 4
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw) ?? mag * 10
  const out: { y: number; label: string }[] = []
  let grid = ''
  for (let v = Math.ceil((g.topV - g.rng) / step) * step; v <= g.topV; v += step) {
    const y = py(g, v)
    if (y < g.pT + 4 || y > g.pT + g.pH - 2) continue
    grid += `M0 ${f1(y)}H${PLOT_W}`
    out.push({ y, label: step >= 1 ? v.toFixed(0) : v.toFixed(step >= 0.1 ? 1 : 2) })
  }
  return { ticks: out, grid }
}

export const levelPath = (g: FrameGeom, v: number | null | undefined) =>
  isNum(v) && inPrice(g, v) ? `M0 ${f1(py(g, v))}H${PLOT_W}` : ''

/** A vertical event line `slot` slots after the last bar, down to the price pane's floor. */
export const eventPath = (g: FrameGeom, nBars: number, slot: number) =>
  `M${f1(cx(g, nBars - 1 + slot))} 0V${g.pT + g.pH}`

export function conePath(g: FrameGeom, nBars: number, coneSlots: number, anchor: number, widthAt: (s: number) => number) {
  const top: string[] = []
  const bot: string[] = []
  const steps = Math.max(1, Math.round(coneSlots * 4))
  for (let k = 0; k <= steps; k++) {
    const s = (k / steps) * coneSlots
    const x = f1(cx(g, nBars - 1 + s))
    const w = widthAt(s)
    top.push(`${x} ${f1(py(g, anchor + w))}`)
    bot.unshift(`${x} ${f1(py(g, anchor - w))}`)
  }
  return `M${top.join('L')}L${bot.join('L')}z`
}

/**
 * One price line (a Pine plot), broken wherever it has no value (warm-up, `na`)
 * and before each index in `breaks` (K-LINE-SPEC §4.9: a trailing stop that
 * flips sides is not joined by a vertical stroke).
 */
export function linePath(g: FrameGeom, vals: readonly (number | null)[], breaks?: ReadonlySet<number>): string {
  let d = ''
  let pen = false
  vals.forEach((v, i) => {
    if (!isNum(v)) {
      pen = false
      return
    }
    if (breaks?.has(i)) pen = false
    d += `${pen ? 'L' : 'M'}${f1(cx(g, i))} ${f1(py(g, v))}`
    pen = true
  })
  return d
}

/**
 * Where a single trailing line (Supertrend, a Chandelier stop) changes side of
 * the close — the flip the script draws as a new line, not a jump.
 */
export function sideFlips(vals: readonly (number | null)[], closes: readonly (number | null | undefined)[]): Set<number> {
  const out = new Set<number>()
  let prev = 0
  vals.forEach((v, i) => {
    const c = closes[i]
    if (!isNum(v) || !isNum(c)) {
      prev = 0
      return
    }
    const side = c > v ? 1 : c < v ? -1 : 0
    if (side && prev && side !== prev) out.add(i)
    if (side) prev = side
  })
  return out
}

export function bbPaths(g: FrameGeom, bb: readonly (BollingerPoint | null)[]) {
  const ok = bb
    .map((p, i) => ({ p, i }))
    .filter((r): r is { p: { mid: number; upper: number; lower: number }; i: number } =>
      r.p != null && isNum(r.p.upper) && isNum(r.p.lower) && isNum(r.p.mid),
    )
  if (ok.length < 2) return { band: '', mid: '' }
  const upper = ok.map((r) => `${f1(cx(g, r.i))} ${f1(py(g, r.p.upper))}`)
  const lower = ok.map((r) => `${f1(cx(g, r.i))} ${f1(py(g, r.p.lower))}`).reverse()
  return {
    band: `M${upper.join('L')}L${lower.join('L')}z`,
    mid: `M${ok.map((r) => `${f1(cx(g, r.i))} ${f1(py(g, r.p.mid))}`).join('L')}`,
  }
}

const minus = (v: number, d = 2) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}`

export interface SubPaneDraw {
  sep: string
  guide: string
  band: string
  hUp: string
  hDn: string
  l1: string
  l2: string
  caps: { top: number; name: string; val: string }[]
}

const line = (g: FrameGeom, vals: readonly (number | null)[], Y: (v: number) => number) => {
  let d = ''
  vals.forEach((v, i) => {
    if (!isNum(v)) return
    d += `${d === '' || !isNum(vals[i - 1]) ? 'M' : 'L'}${f1(cx(g, i))} ${f1(Y(v))}`
  })
  return d
}

/** MACD 12 26 9 and RSI 14 panes: guides, histogram, lines and a caption with the last value. */
export function subPanes(
  g: FrameGeom,
  kx: number,
  macd: readonly (MacdPoint | null)[] | null,
  rsi: readonly (number | null)[] | null,
): SubPaneDraw {
  const out: SubPaneDraw = { sep: '', guide: '', band: '', hUp: '', hDn: '', l1: '', l2: '', caps: [] }
  const bw = bodyWidth(g, kx)
  for (const p of g.panes) {
    out.sep += `M0 ${f1(p.y0 - 4)}H${PLOT_W}`
    const inner = p.h - 14
    if (p.k === 'macd') {
      const m = (macd ?? []).map((x) => (x && isNum(x.macd) ? x.macd : null))
      const s = (macd ?? []).map((x) => (x && isNum(x.signal) ? x.signal : null))
      const mx = Math.max(1e-9, ...[...m, ...s].filter(isNum).map(Math.abs))
      const Y = (v: number) => p.y0 + 14 + inner / 2 - (v / mx) * (inner / 2 - 2)
      out.guide += `M0 ${f1(Y(0))}H${PLOT_W}`
      m.forEach((v, i) => {
        const sv = s[i]
        if (!isNum(v) || !isNum(sv)) return
        const h = v - sv
        const y0 = Y(0)
        const y1 = Y(h)
        const r = rect(cx(g, i) - bw / 2, Math.min(y0, y1), bw, Math.max(0.5, Math.abs(y1 - y0)))
        if (h >= 0) out.hUp += r
        else out.hDn += r
      })
      out.l1 += line(g, m, Y)
      out.l2 += line(g, s, Y)
      const lm = [...m].reverse().find(isNum)
      const ls = [...s].reverse().find(isNum)
      out.caps.push({
        top: p.y0,
        name: 'MACD 12 26 9',
        val: lm != null && ls != null ? `${minus(lm)} · signal ${minus(ls)}` : '—',
      })
    } else {
      const r = (rsi ?? []).map((x) => (isNum(x) ? x : null))
      const Y = (v: number) => p.y0 + 14 + ((100 - v) / 100) * (p.h - 16)
      out.band += `M0 ${f1(Y(70))}H${PLOT_W}V${f1(Y(30))}H0z`
      out.guide += `M0 ${f1(Y(70))}H${PLOT_W}M0 ${f1(Y(30))}H${PLOT_W}`
      out.l1 += line(g, r, Y)
      const lr = [...r].reverse().find(isNum)
      out.caps.push({ top: p.y0, name: 'RSI 14', val: lr != null ? lr.toFixed(1) : '—' })
    }
  }
  return out
}

export interface SignalMarkAt {
  /** Index into the drawn bars. */
  at: number
  dir: 'up' | 'down'
}

/** ▲ 4px under the low (buy) · ▼ 4px over the high (sell); 10px wide on screen; one each per bar. */
export function signalPaths(g: FrameGeom, bars: readonly FrameBar[], marks: readonly SignalMarkAt[], kx: number) {
  const tw = 10 / kx
  const seen = new Set<string>()
  let up = ''
  let dn = ''
  for (const m of marks) {
    const b = bars[m.at]
    const k = `${m.at}|${m.dir}`
    if (!b || seen.has(k)) continue
    seen.add(k)
    const x = cx(g, m.at)
    if (m.dir === 'up') up += `M${f2(x)} ${f1(py(g, b.low) + 4)}l${f2(tw / 2)} 8h${f2(-tw)}z`
    else dn += `M${f2(x)} ${f1(py(g, b.high) - 4)}l${f2(tw / 2)} -8h${f2(-tw)}z`
  }
  return { up, dn, count: seen.size }
}

export interface AxisTag {
  key: string
  v: number
  text: string
  /** The layer's colour on the 3px bar; null for the last-price tag. */
  bar: string | null
  title: string
  /** Hovering the tag lights this layer key. */
  hover?: string
}

export interface PlacedTag extends AxisTag {
  y: number
  y0: number
  moved: boolean
}

/** Sorted by y, pushed 16px apart top-down, then back up so none falls below the pane + 4. */
export function stackTags(g: FrameGeom, tags: readonly AxisTag[]): PlacedTag[] {
  const out = tags
    .filter((t) => inPrice(g, t.v))
    .map((t) => ({ ...t, y0: py(g, t.v), y: py(g, t.v), moved: false }))
    .sort((a, b) => a.y0 - b.y0)
  let prev = -Infinity
  for (const t of out) {
    t.y = Math.max(t.y0, prev + TAG_GAP)
    prev = t.y
  }
  let lim = g.pT + g.pH + 4
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].y > lim) out[i].y = lim
    lim = out[i].y - TAG_GAP
  }
  for (const t of out) t.moved = Math.abs(t.y - t.y0) > 1.5
  return out
}

/** Grid ticks without a number where a tag sits within 12px. */
export const tickLabelsClearOf = (ticks: readonly { y: number; label: string }[], tags: readonly PlacedTag[]) =>
  ticks.filter((t) => !tags.some((g) => Math.abs(g.y - t.y) < 12))

export interface EdgeItem {
  key: string
  dir: 'up' | 'down'
  text: string
  ink: string
  title: string
  hover: string | null
  open: (() => void) | null
}

export interface PlacedEdge extends EdgeItem {
  top: number
}

/** At most three per edge; past three, the first two and a `+N` that names the rest in its title. */
export function placeEdges(g: FrameGeom, items: readonly EdgeItem[]): PlacedEdge[] {
  const out: PlacedEdge[] = []
  for (const dir of ['up', 'down'] as const) {
    const list = items.filter((e) => e.dir === dir)
    const shown = list.length > 3 ? list.slice(0, 2) : list
    const arrow = dir === 'up' ? '↑ ' : '↓ '
    const topOf = (k: number) => (dir === 'up' ? g.pT + k * 18 : g.pT + g.pH - 16 - k * 18)
    shown.forEach((e, k) => out.push({ ...e, text: arrow + e.text, top: topOf(k) }))
    if (list.length > 3)
      out.push({
        key: `${dir}-more`,
        dir,
        text: `${arrow}+${list.length - 2}`,
        ink: 'var(--sk-mute2)',
        title: list
          .slice(2)
          .map((e) => e.text)
          .join(' · '),
        hover: null,
        open: null,
        top: topOf(2),
      })
  }
  return out
}
