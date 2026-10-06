import { describe, expect, it } from 'vitest'
import {
  basisNote,
  cellOf,
  ciText,
  edgeText,
  edgeTitle,
  fmtPt,
  groupRows,
  nTitle,
  sortRows,
  type WinRateRow,
} from './signalWinRateModel'
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
    ciMethod: null,
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
            ci_method: 'iid_signal',
          },
        },
      },
      10
    )
    expect(c).toMatchObject({
      n: 41,
      nRaw: 58,
      edge: 0.05,
      edgeCi: [-0.02, 0.11],
      ciMethod: 'iid_signal',
      sample: 'thin',
    })
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

  const V2 = { version: 2, cost_bps_one_way: 10, ci: { level: 0.9, draws: 1000 } }

  it('words the footer from the fields that arrived (Rev .160 Q2)', () => {
    expect(basisNote([row({})])).toBe('Descriptive: no significance test, no costs.')
    const v2 = row({ method: V2 })
    expect(basisNote([v2])).toBe(
      'Entry at the next open, one signal per horizon, net of 10 bps one way, with a 90% bootstrap interval (none under 5 signals).'
    )
    expect(basisNote([v2, row({ source: 'indicator' })])).toBe(
      'Pine rows: entry at the next open, one signal per horizon, net of 10 bps one way, with a 90% bootstrap interval. Indicator rows are still on the old basis (same-session close, no costs, no interval), so do not rank one group against the other.'
    )
  })

  it('never ranks two bases together: one group per source, each with its basis', () => {
    const groups = groupRows([
      row({ key: 'i1', source: 'indicator', edge: 0.3 }),
      row({ key: 'p1', method: V2, edge: 0.01 }),
      row({ key: 'p2', method: V2, edge: 0.05 }),
    ])
    expect(groups.map((g) => g.rows.map((r) => r.key))).toEqual([['p2', 'p1'], ['i1']])
    expect(groups[0].head).toEqual({
      title: 'Pine',
      method: 'method v2',
      basis: 'next-open entry · one signal per horizon · 10 bps one way · 90% interval',
    })
    expect(groups[1].head?.basis).toBe(
      'same-session close · no costs · no interval — not comparable with the Pine rows'
    )
  })

  it('is one ranked table with no subhead when both sources share a method', () => {
    const v1 = groupRows([
      row({ key: 'i1', source: 'indicator', edge: 0.3 }),
      row({ key: 'p1', edge: 0.01 }),
    ])
    expect(v1).toHaveLength(1)
    expect(v1[0].head).toBeNull()
    expect(v1[0].rows.map((r) => r.key)).toEqual(['i1', 'p1'])
  })

  it('reads a v2 edge to one decimal with its interval and hovers', () => {
    const r = row({
      method: V2,
      edge: 0.0754,
      edgeCi: [0.0116, 0.1387],
      ciMethod: 'cluster_bootstrap_symbol',
      n: 90,
      nRaw: 112,
    })
    expect(edgeText(r)).toBe('+7.5 pt')
    expect(ciText(r)).toBe('90% +1.2 to +13.9')
    expect(nTitle(r)).toBe('90 after one-per-horizon dedupe · 112 raw')
    expect(edgeTitle(r)).toBe(
      '90% bootstrap interval, 1,000 draws, resampled by symbol · net of 10 bps'
    )
    expect(edgeTitle({ ...r, ciMethod: 'iid_signal' })).toMatch(
      /resampled by signal \(fewer than 5 names/
    )
    expect(edgeTitle({ ...r, edgeCi: null })).toBe('No interval under 5 signals')
    expect(edgeText(row({ edge: 0.046 }))).toBe('+5 pt')
    expect(edgeTitle(row({}))).toBe('Old basis: no interval')
    expect(nTitle(row({ n: 40 }))).toBe('40 signals')
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
