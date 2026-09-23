import { describe, expect, it } from 'vitest'
import type { MomentumScore } from '@/api/researchEngine'
import { cellOpacity, foldLeaders, sortLeaders } from './leadersModel'

const row = (symbol: string, trade_date: string, score: number): MomentumScore =>
  ({
    symbol,
    trade_date,
    score,
    grade: 'A',
    path: 'EXT',
    z_sdt: 70,
    z_v: 70,
    accept_vwap: 70,
    z_ofi: 50,
    h_52w: 90,
    o_plus: 90,
    a_factor: 90,
    r_sec: 90,
    crash: 90,
    factors_json: {},
    computed_at: '',
  }) as MomentumScore

const SAMPLE = [
  row('AMD', '2026-09-21', 86.1),
  row('AMD', '2026-09-18', 80.0),
  row('AMD', '2026-07-02', 74.0),
  row('NVDA', '2026-09-22', 78.0),
  row('PLTR', '2026-09-18', 72.6),
]

describe('folding the ranking by name', () => {
  const w = foldLeaders(SAMPLE)

  it('turns repeats into persistence rather than into more rows', () => {
    // The flat payload repeats a name once per session it reached; folded,
    // that count is `hits` and is the reading the old page could not give.
    expect(w.rows).toHaveLength(3)
    expect(w.sourceRows).toBe(5)
    expect(w.rows.find((r) => r.symbol === 'AMD')?.hits).toBe(3)
    expect(w.rows.find((r) => r.symbol === 'NVDA')?.hits).toBe(1)
  })

  it('takes the peak and the last hit separately — they are rarely the same day', () => {
    const amd = w.rows.find((r) => r.symbol === 'AMD')!
    expect(amd.peak).toBe(86.1)
    expect(amd.peakOn).toBe('2026-09-21')
    expect(amd.lastHit).toBe('2026-09-21')
    const nvda = w.rows.find((r) => r.symbol === 'NVDA')!
    expect(nvda.lastHit).toBe('2026-09-22')
    expect(nvda.lastScore).toBe(78.0)
  })

  it('gives every name the same session axis, with a gap where it was absent', () => {
    // One cell per session in the window, so the bars line up and an absence
    // reads as an absence rather than as a shorter bar.
    for (const r of w.rows) {
      expect(r.cells.map((c) => c.date)).toEqual(['2026-07-02', '2026-09-18', '2026-09-21', '2026-09-22'])
    }
    const nvda = w.rows.find((r) => r.symbol === 'NVDA')!
    expect(nvda.cells.map((c) => c.score)).toEqual([null, null, null, 78.0])
  })

  it('counts the newest session honestly', () => {
    // The payload is the top N over the whole window, so its newest session
    // holds a handful of names — 9 of 200 on DEV. A page that called this
    // "today's leaders" would be wrong about nearly every row.
    expect(w.sessions[w.sessions.length - 1]).toBe('2026-09-22')
    expect(w.latestNames).toBe(1)
  })

  it('keeps each session\'s own row, so a cell can be read on its own', () => {
    const amd = w.rows.find((r) => r.symbol === 'AMD')!
    expect(amd.byDate.get('2026-09-18')?.score).toBe(80.0)
    expect(amd.lastRow.trade_date).toBe('2026-09-21')
  })

  it('drops a row the engine could not score rather than folding a hole', () => {
    const w2 = foldLeaders([...SAMPLE, { ...row('X', '2026-09-22', Number.NaN) }])
    expect(w2.rows.find((r) => r.symbol === 'X')).toBeUndefined()
  })

  it('answers an empty window without throwing', () => {
    const e = foldLeaders([])
    expect(e.rows).toHaveLength(0)
    expect(e.sessions).toHaveLength(0)
    expect(e.latestNames).toBe(0)
  })
})

describe('the three sorts, all descending', () => {
  const w = foldLeaders(SAMPLE)

  it('leads on peak by default', () => {
    expect(sortLeaders(w.rows, 'peak').map((r) => r.symbol)).toEqual(['AMD', 'NVDA', 'PLTR'])
  })

  it('breaks a tie on persistence with the better peak', () => {
    // NVDA and PLTR both have one hit; without the tiebreak their order is
    // whatever the fold happened to produce, which is not an order.
    expect(sortLeaders(w.rows, 'hits').map((r) => r.symbol)).toEqual(['AMD', 'NVDA', 'PLTR'])
  })

  it('puts the most recent hit first', () => {
    expect(sortLeaders(w.rows, 'last').map((r) => r.symbol)).toEqual(['NVDA', 'AMD', 'PLTR'])
  })
})

describe('the session bar', () => {
  it('ramps over the window\'s own range, not over 0–100', () => {
    // The radar only ever returns its top N, so the band is narrow: on DEV
    // 72.6 to 86.1. A 0–100 ramp would draw the whole bar at one weight.
    expect(cellOpacity(72.6, 72.6, 86.1)).toBe(0.3)
    expect(cellOpacity(86.1, 72.6, 86.1)).toBe(1)
    expect(cellOpacity(79.35, 72.6, 86.1)).toBe(0.65)
  })

  it('draws a single-score window at full weight rather than dividing by zero', () => {
    expect(cellOpacity(80, 80, 80)).toBe(1)
  })
})
