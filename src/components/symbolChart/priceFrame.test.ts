import { describe, expect, it } from 'vitest'
import {
  frameGeom,
  linePath,
  placeEdges,
  priceTicks,
  py,
  signalPaths,
  stackTags,
  type EdgeItem,
  type FrameBar,
  type FrameInput,
} from './priceFrame'

const bars: FrameBar[] = Array.from({ length: 60 }, (_, i) => {
  const c = 100 + Math.sin(i / 5) * 5
  return { open: c - 0.5, high: c + 1, low: c - 1, close: c, volume: 1_000_000 + i }
})
const base: FrameInput = {
  bars,
  coneSlots: 0,
  coneWidthAt: null,
  anchor: bars[59].close,
  walls: { call: null, put: null },
  levelsOn: true,
  live: true,
  bb: null,
  panes: [],
  mini: false,
}

describe('frameGeom — fixed pixel panes (K-LINE-SPEC §1)', () => {
  it('is 288 tall with Levels only, 416 with MACD and RSI, 184 as the mini', () => {
    expect(frameGeom(base).H).toBe(288)
    expect(frameGeom({ ...base, panes: ['macd', 'rsi'] }).H).toBe(416)
    expect(frameGeom({ ...base, mini: true, panes: ['macd'] }).H).toBe(184)
  })

  it('pads the candles 4% and lets the walls widen the scale only while the window reaches today', () => {
    const g = frameGeom(base)
    expect(py(g, Math.max(...bars.map((b) => b.high)))).toBeGreaterThan(g.pT)
    const live = frameGeom({ ...base, walls: { call: 130, put: null } })
    expect(live.topV).toBeGreaterThan(130)
    const panned = frameGeom({ ...base, live: false, walls: { call: 130, put: null } })
    expect(panned.topV).toBeLessThan(130)
  })

  it('leaves future slots for the cone', () => {
    const g = frameGeom({ ...base, coneSlots: 20, coneWidthAt: () => 3 })
    expect(g.slots).toBe(80)
    expect(g.xw).toBeCloseTo(900 / 80)
  })
})

describe('price axis', () => {
  it('steps ticks at 1 · 2 · 2.5 · 5 · 10 × 10ⁿ', () => {
    const { ticks } = priceTicks(frameGeom(base))
    const steps = ticks.slice(1).map((t, i) => Number(ticks[i].label) - Number(t.label))
    expect(new Set(steps).size).toBe(1)
    expect([1, 2, 2.5, 5, 10]).toContain(Math.abs(steps[0]))
  })

  it('keeps tags 16px apart and leads a pushed tag back to its price', () => {
    const g = frameGeom(base)
    const placed = stackTags(g, [
      { key: 'a', v: 100, text: '100', bar: 'x', title: '' },
      { key: 'b', v: 100.05, text: '100.05', bar: 'x', title: '' },
      { key: 'off', v: 500, text: 'off', bar: 'x', title: '' },
    ])
    expect(placed.map((t) => t.key)).toEqual(['b', 'a'])
    expect(placed[1].y - placed[0].y).toBeGreaterThanOrEqual(16)
    expect(placed.some((t) => t.moved)).toBe(true)
  })

  it('shows three edge tags per edge, or two and a +N naming the rest', () => {
    const g = frameGeom(base)
    const e = (k: string): EdgeItem => ({ key: k, dir: 'down', text: k, ink: 'x', title: '', hover: null, open: null })
    expect(placeEdges(g, [e('a'), e('b'), e('c')]).map((x) => x.text)).toEqual(['↓ a', '↓ b', '↓ c'])
    const four = placeEdges(g, [e('a'), e('b'), e('c'), e('d')])
    expect(four.map((x) => x.text)).toEqual(['↓ a', '↓ b', '↓ +2'])
    expect(four[2].title).toBe('c · d')
  })
})

describe('signal marks', () => {
  it('draws one ▲ and one ▼ at most per bar', () => {
    const g = frameGeom(base)
    const s = signalPaths(g, bars, [
      { at: 3, dir: 'up' },
      { at: 3, dir: 'up' },
      { at: 3, dir: 'down' },
      { at: 99, dir: 'up' },
    ], 1)
    expect(s.count).toBe(2)
    expect(s.up.split('M').length - 1).toBe(1)
    expect(s.dn.split('M').length - 1).toBe(1)
  })
})

describe('a Pine price line (P1 / G10)', () => {
  it('widens the scale like BB and breaks where the plot has no value', () => {
    const plain = frameGeom(base)
    const line = bars.map((b, i) => (i < 10 ? null : b.low - 8))
    const g = frameGeom({ ...base, lines: [line] })
    expect(g.rng).toBeGreaterThan(plain.rng)
    expect(linePath(g, line).startsWith('M')).toBe(true)
    expect(linePath(g, line).match(/M/g)?.length).toBe(1)
    const gap = line.map((v, i) => (i === 30 ? null : v))
    expect(linePath(g, gap).match(/M/g)?.length).toBe(2)
    expect(linePath(g, [null, null])).toBe('')
  })
})
