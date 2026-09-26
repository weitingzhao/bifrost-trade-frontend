import { describe, expect, it } from 'vitest'
import type { EventRun } from '@/api/research/backtestEvent'
import type { ForecastSettlement } from '@/api/researchEngine'
import {
  equityFrom,
  histogramFrom,
  parseBenchmark,
  parseWalkForward,
  runConfidence,
  runScope,
  settleAgg,
} from './backtestRuns'

function ev(pnl: number, exit: string): EventRun {
  return {
    event_date: exit,
    symbol: 'AAA',
    entry_ts: exit,
    exit_ts: exit,
    pnl,
    mfe: Math.abs(pnl),
    mae: -Math.abs(pnl) / 2,
    legs: [],
  }
}

function settle(missPct: number, hit: boolean): ForecastSettlement {
  return {
    settlement_id: `s${missPct}`,
    session_id: 'AAA-2026-09-20-x',
    symbol: 'AAA',
    trade_date: '2026-09-20',
    expected_close: 100,
    actual_close: 100 * (1 + missPct / 100),
    close_miss: missPct,
    close_miss_pct: missPct / 100,
    path_hit: hit,
    path_hit_count: hit ? 3 : 1,
    path_total: 4,
    notes: '',
    computed_at: '2026-09-20T00:00:00Z',
  }
}

describe('runConfidence', () => {
  it('uses the design thresholds: noise under 5, thin under 30', () => {
    expect(runConfidence(3).level).toBe('noise')
    expect(runConfidence(5).level).toBe('thin')
    expect(runConfidence(29).level).toBe('thin')
    expect(runConfidence(30).level).toBe('usable')
  })
})

describe('equityFrom', () => {
  it('walks cumulative P&L in exit order and tracks drawdown from the peak', () => {
    const eq = equityFrom([ev(-50, '2026-03-02'), ev(100, '2026-03-01'), ev(30, '2026-03-03')])
    // order by exit: +100, −50, +30
    expect(eq?.cums).toEqual([100, 50, 80])
    expect(eq?.dds).toEqual([0, -50, -20])
    expect(eq?.maxDd).toBe(-50)
    expect(eq?.last).toBe(80)
    expect(equityFrom([])).toBeNull()
  })
})

describe('histogramFrom', () => {
  it('bins P&L with the zero and median lines placed on the span', () => {
    const h = histogramFrom([ev(-100, 'a'), ev(0, 'b'), ev(100, 'c'), ev(100, 'd')], 4)
    expect(h?.bins.map((b) => b.count)).toEqual([1, 0, 1, 2])
    expect(h?.zeroPct).toBeCloseTo(50, 6)
    expect(h?.median).toBe(100)
    expect(histogramFrom([])).toBeNull()
  })
})

describe('parseWalkForward', () => {
  it('reads the engine payload: windows with oos metrics, aggregate averages', () => {
    const wf = parseWalkForward({
      windows: [
        {
          is_start: '2025-01-02',
          is_end: '2025-12-31',
          oos_start: '2026-01-02',
          oos_end: '2026-03-31',
          is_n: 250,
          oos_n: 61,
          fit: null,
          oos: { sharpe_annual: 1.2, total_return: 0.031, win_rate: 0.58 },
        },
      ],
      aggregate: {
        n_windows: 1,
        avg_sharpe_annual: 1.2,
        median_sharpe_annual: 1.2,
        avg_total_return: 0.031,
        avg_win_rate: 0.58,
      },
    })
    expect(wf?.windows[0].oosSharpe).toBeCloseTo(1.2)
    expect(wf?.windows[0].oosStart).toBe('2026-01-02')
    expect(wf?.avgTotal).toBeCloseTo(0.031)
  })

  it('answers null for the payloads the store actually holds today', () => {
    expect(parseWalkForward(null)).toBeNull()
    expect(parseWalkForward({ windows: [] })).toBeNull()
    // the shape the old card expected — no window survives the reader whole,
    // but the reader must not throw on it either
    const legacy = parseWalkForward({ windows: [{ window_index: 1, oos_return: 2 }] })
    expect(legacy?.windows[0].oosSharpe).toBeNull()
  })
})

describe('parseBenchmark', () => {
  it('reads spy_buy_hold and refuses an empty series', () => {
    const b = parseBenchmark({
      spy_buy_hold: {
        n: 40,
        start_date: '2026-01-02',
        end_date: '2026-03-02',
        total_return: 0.05,
        sharpe_annual: 0.7,
        max_drawdown: -0.03,
        cagr: 0.31,
      },
    })
    expect(b?.totalReturn).toBeCloseTo(0.05)
    expect(b?.cagr).toBeCloseTo(0.31)
    expect(parseBenchmark({ spy_buy_hold: { n: 0 } })).toBeNull()
    expect(parseBenchmark(null)).toBeNull()
  })
})

describe('settleAgg', () => {
  it('counts within ±3%, mean abs miss and path hits', () => {
    const agg = settleAgg([settle(0.5, true), settle(-2, true), settle(4, false)])
    expect(agg.sessions).toBe(3)
    expect(agg.within3).toBe(2)
    expect(agg.meanAbsMissPct).toBeCloseTo((0.5 + 2 + 4) / 3, 6)
    expect(agg.pathHitPct).toBeCloseTo((2 / 3) * 100, 6)
    expect(settleAgg([]).within3Pct).toBeNull()
  })

  it('leaves out rows research stamped with an input fault', () => {
    // PLTR 2026-07-27: target 20.5 from walls on 20 against a 131.53 close.
    const faulty = { ...settle(502, false), settlement_id: 'fault', stats_json: { input_fault: 'walls_off_spot' } }
    const agg = settleAgg([settle(0.5, true), faulty])
    expect(agg.sessions).toBe(1)
    expect(agg.inputFaults).toBe(1)
    expect(agg.meanAbsMissPct).toBeCloseTo(0.5, 6)
    expect(settleAgg([faulty]).inputFaults).toBe(1)
    expect(settleAgg([faulty]).meanAbsMissPct).toBeNull()
  })
})

describe('runScope', () => {
  it('names explicit symbols and falls back to the engine universe', () => {
    expect(runScope({ symbols: ['NVDA', 'AMD'] })).toBe('NVDA, AMD')
    expect(runScope({ symbols: ['A', 'B', 'C', 'D', 'E'] })).toBe('5 symbols')
    expect(runScope({})).toBe('engine-selected universe')
  })
})
