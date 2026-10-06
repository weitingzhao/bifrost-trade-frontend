/**
 * Trades and the holding on the price chart (design K-LINE-SPEC §4.7–§4.8,
 * Rev .159) — pure geometry for the HTML layer that draws them.
 *
 * The book layer rests at 35% with no labels; hovering a trade lights it at
 * 100% with its label and drops the rest to 15% (the Trade page's `?only=`
 * focus is the same state held). A strike or a cost outside the price pane is
 * not drawn at the pane's edge any more: it becomes an edge tag on the price
 * axis (§5.4), so nothing sits on the candles.
 */
import { cx, inPrice, py, type EdgeItem, type FrameGeom } from '@/components/symbolChart/priceFrame'
import {
  aggIndexFor,
  fmtPl,
  sessionIndexFor,
  sessionsUntil,
  type Holding,
  type TradeTrack,
} from '@/components/symbolChart/symbolPriceModel'

export const BOOK_REST = 0.35
export const BOOK_DIM = 0.15

export type LegLine = 'short' | 'long' | 'tail'

export interface Seg {
  key: string
  track: TradeTrack
  /** Logical x (0–900). */
  x0: number
  x1: number
  y: number
  line: LegLine
  dot: boolean
  end: string | null
}

export interface Joint {
  key: string
  track: TradeTrack
  x: number
  y0: number
  y1: number
  label: string
  ink: string
}

export interface BookInput {
  g: FrameGeom
  tracks: readonly TradeTrack[]
  dates: readonly string[]
  winStart: number
  winEnd: number
  winSessions: number
  agg: number
  nBars: number
  today: string
  /** Sessions the cone reaches past today (open legs dash to their expiry within it); null off today. */
  coneSessions: number | null
}

const plInk = (v: number | null) =>
  v == null ? 'var(--sk-mute2)' : v >= 0 ? 'var(--color-profit)' : 'var(--color-loss)'

export function bookGeometry(p: BookInput) {
  const { g } = p
  const lastX = cx(g, p.nBars - 1)
  const xOfDate = (iso: string): { x: number; clip: 'L' | 'R' | null } => {
    const idx = sessionIndexFor(p.dates, iso)
    if (idx == null || idx < p.winStart) return { x: 0, clip: 'L' }
    if (idx >= p.winEnd) return { x: lastX, clip: 'R' }
    return { x: cx(g, aggIndexFor(p.winSessions, p.agg, idx - p.winStart)), clip: null }
  }
  const segs: Seg[] = []
  const joints: Joint[] = []
  const edges: EdgeItem[] = []
  const edge = (t: TradeTrack, strike: number, right: string) => {
    const key = `${t.key}:${strike}${right}`
    if (edges.some((e) => e.key === key)) return
    edges.push({
      key,
      dir: py(g, strike) < g.pT ? 'up' : 'down',
      text: `${strike}${right}`,
      ink: 'var(--sk-contract)',
      title: `${t.name} · off this scale`,
      hover: t.key,
      open: null,
    })
  }
  for (const t of p.tracks) {
    for (const l of t.legs) {
      if (!inPrice(g, l.strike)) {
        edge(t, l.strike, l.right)
        continue
      }
      const a = xOfDate(l.openDate)
      const b = l.flatDate ? xOfDate(l.flatDate) : { x: lastX, clip: null }
      const y = py(g, l.strike)
      const rolledIn = t.joints.some((j) => j.date === l.openDate && j.toStrike === l.strike)
      const rolledOut = t.joints.some((j) => j.date === l.flatDate && j.fromStrike === l.strike)
      segs.push({
        key: l.key,
        track: t,
        x0: a.x,
        x1: Math.max(a.x, b.x),
        y,
        line: l.side < 0 ? 'short' : 'long',
        dot: a.clip == null && !rolledIn,
        end: l.flatDate && b.clip == null && !rolledOut ? plInk(l.pnl) : null,
      })
      if (!l.flatDate && l.expiryIso && p.coneSessions != null) {
        const dte = sessionsUntil(p.today, l.expiryIso)
        const tail = cx(g, p.nBars - 1 + Math.min(dte, p.coneSessions) / p.agg)
        if (tail > lastX)
          segs.push({ key: `${l.key}:tail`, track: t, x0: lastX, x1: tail, y, line: 'tail', dot: false, end: null })
      }
    }
    for (const j of t.joints) {
      const { x, clip } = xOfDate(j.date)
      if (clip || !inPrice(g, j.fromStrike) || !inPrice(g, j.toStrike)) continue
      joints.push({
        key: `${t.key}|${j.date}|${j.fromStrike}|${j.toStrike}`,
        track: t,
        x,
        y0: py(g, j.fromStrike),
        y1: py(g, j.toStrike),
        label: `↻ ${fmtPl(j.net)} ${j.net >= 0 ? 'cr' : 'db'}`,
        ink: plInk(j.net),
      })
    }
  }
  return { segs, joints, edges }
}

/** 35% at rest; the lit trade (hover, else the page's focus) 100% and the rest 15%. */
export function bookOpacity(key: string, hover: string | null, focus: string | null): number {
  const lit = hover ?? focus
  if (lit == null) return BOOK_REST
  return key === lit ? 1 : BOOK_DIM
}

/** Shares on a 56px axis tag: whole shares, thousands as `12k` past 9,999. */
export const shortQty = (q: number) =>
  Math.abs(q) >= 10_000 ? `${Math.round(q / 1000)}k` : Math.round(q).toLocaleString('en-US')

export function holdingEdge(g: FrameGeom, h: Holding | null): EdgeItem | null {
  if (!h || h.avg == null || inPrice(g, h.avg)) return null
  return {
    key: 'hold',
    dir: py(g, h.avg) < g.pT ? 'up' : 'down',
    text: `${shortQty(h.qty)} sh`,
    ink: 'var(--sk-ticker)',
    title: `Held now: ${h.qty.toLocaleString('en-US')} sh at a blended cost of ${h.avg.toFixed(2)} · off this scale`,
    hover: 'hold',
    open: null,
  }
}
