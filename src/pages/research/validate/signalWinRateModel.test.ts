import { describe, expect, it } from 'vitest'
import { basisNote, cellOf, fmtPt, sortRows, type WinRateRow } from './signalWinRateModel'
import { entryOffsetFor, sessionsAfterOf, versionAtLeast } from '@/api/research/backtestSim'

function row(p: Partial<WinRateRow>): WinRateRow {
  return {
    key: 'k',
    chartSignal: 'pine:x',
    name: 'X',
    source: 'pine',
    sourceLabel: 'pine',
    side: 'buy',
    state: 'ok',
    error: null,
    n: 40,
    nRaw: null,
    win: 0.6,
    base: 0.55,
    edge: 0.05,
    edgeCi: null,
    sample: 'ok',
    method: null,
    ...p,
  }
}

describe('Signal Decay › Indicator & Pine signals', () => {
  it('reads one horizon, with the v2 fields when they arrive', () => {
    const c = cellOf(
      {
        signals: 58,
        sample_note: 'ok',
        method: { version: 2, cost_bps_one_way: 10, ci: { level: 0.9 } },
        by_horizon: {
          '10': {
            signal: { n: 41, win_rate: 0.62 },
            baseline: { n: 3700, win_rate: 0.57 },
            win_rate_edge: 0.05,
            n_raw: 58,
            sample_note: 'thin',
            ci90: { win_rate_edge: [-0.02, 0.11] },
          },
        },
      },
      10,
    )
    expect(c).toMatchObject({ n: 41, nRaw: 58, edge: 0.05, edgeCi: [-0.02, 0.11], sample: 'thin' })
    expect(cellOf(undefined, 5)).toMatchObject({ n: null, edge: null, sample: null })
  })

  it('puts noise last and the largest edge first', () => {
    const out = sortRows([
      row({ key: 'a', edge: 0.01 }),
      row({ key: 'b', edge: 0.2, sample: 'noise' }),
      row({ key: 'c', edge: 0.08 }),
      row({ key: 'd', state: 'loading', edge: null }),
    ])
    expect(out.map((r) => r.key)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('words the footer from the fields that arrived', () => {
    expect(basisNote([row({})])).toBe('Descriptive: no significance test, no costs.')
    const v2 = row({ method: { version: 2, cost_bps_one_way: 10, ci: { level: 0.9 } } })
    expect(basisNote([v2])).toMatch(/^Pine rows: entered at the next open.*net of 10 bps a side, 90% interval/)
    expect(basisNote([v2, row({ source: 'indicator' })])).toMatch(/Indicator rows are still descriptive/)
  })

  it('signs points with a true minus', () => {
    expect(fmtPt(0.046)).toBe('+5 pt')
    expect(fmtPt(-0.031)).toBe('−3 pt')
    expect(fmtPt(null)).toBe('—')
  })
})

describe('Simulator signal-entry basis', () => {
  it('compares dotted versions', () => {
    expect(versionAtLeast('0.175.0', '0.175.0')).toBe(true)
    expect(versionAtLeast('0.176.2', '0.175.0')).toBe(true)
    expect(versionAtLeast('0.174.9', '0.175.0')).toBe(false)
    expect(versionAtLeast(null, '0.175.0')).toBe(false)
  })

  it('sends one less on v2, so 1 session after is the next session on both', () => {
    expect(entryOffsetFor(1, true)).toBe(0)
    expect(entryOffsetFor(1, false)).toBe(1)
    expect(entryOffsetFor(0, true)).toBe(0)
    expect(sessionsAfterOf(0, true)).toBe(1)
    expect(sessionsAfterOf(0, false)).toBe(0)
  })
})
