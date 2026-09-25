/**
 * Three questions, and the one answer a status page may never give by
 * accident: green when it does not know.
 */
import { describe, expect, it } from 'vitest'
import type { StatusResponse } from '@/types/monitor'
import type { QuoteItem } from '@/types/market'
import type { SignalHealthResponse } from '@/api/research/similarRegime'
import {
  blockText,
  marketStanding,
  nightlyStanding,
  watchlistDataLine,
  tradingStanding,
  worstLamp,
} from '@/utils/systemStanding'

const status = (over: Record<string, unknown> = {}): StatusResponse =>
  ({
    health: { status_lamp: 'green', block_reasons: [] },
    daemon: { heartbeat: { daemon_alive: true, ib_connected: true }, lamp: 'green', block_reasons: [] },
    market_data: { quotes_redis_reader_ok: true },
    socket: { ib_ingestor: { connected: true } },
    ...over,
  }) as unknown as StatusResponse

const q = (ts: number): QuoteItem => ({ symbol: 'X', last: 1, ts }) as QuoteItem

describe('tradingStanding', () => {
  it('is grey, never green, when the monitor has not answered', () => {
    const s = tradingStanding(undefined)
    expect(s.lamp).toBe('gray')
    expect(s.why).toContain('Unknown is not clear')
  })

  it('names what the monitor says is blocking, in the reader’s words', () => {
    // DEV 2026-09-22 answers exactly these two.
    const s = tradingStanding(
      status({
        health: { status_lamp: 'yellow', block_reasons: ['ib_not_connected', 'socket_massive_disconnected'] },
        daemon: { heartbeat: { daemon_alive: true, ib_connected: false }, lamp: 'yellow', block_reasons: [] },
      }),
    )
    expect(s.lamp).toBe('red')
    expect(s.state).toBe('stop')
    expect(s.why).toContain('the IB link is down · the market-data socket is disconnected')
    expect(s.detail).toHaveLength(2)
  })

  it('stops outright when the daemon is not running', () => {
    const s = tradingStanding(
      status({ daemon: { heartbeat: { daemon_alive: false }, lamp: 'red', block_reasons: [] } }),
    )
    expect(s).toMatchObject({ lamp: 'red', state: 'stop' })
    expect(s.why).toContain('no order path is open')
  })

  it('is green only when the link is up and nothing blocks', () => {
    expect(tradingStanding(status())).toMatchObject({ lamp: 'green', state: 'trade normally' })
  })

  it('turns a raw reason into words, and leaves an unknown one readable', () => {
    expect(blockText('ib_not_connected')).toBe('the IB link is down')
    expect(blockText('some_new_reason')).toBe('some new reason')
  })
})

describe('marketStanding', () => {
  it('counts what is current against what was asked for', () => {
    // NVDA is current at the fixed clock, SPY is an hour old.
    const s = marketStanding(status(), { NVDA: q(1000), SPY: q(1) }, ['NVDA', 'SPY'], 1000)
    expect(s.state).toBe('live · 1 behind')
    expect(s.lamp).toBe('yellow')
    expect(s.detail[0].text).toContain('grey out on Live')
  })

  it('says no quotes rather than going quiet when the path is down', () => {
    const s = marketStanding(
      status({ market_data: { quotes_redis_reader_ok: false }, socket: { ib_ingestor: { connected: false } } }),
      {},
      ['NVDA'],
      1000,
    )
    expect(s).toMatchObject({ lamp: 'red', state: 'no quotes' })
    expect(s.why).toContain('settled close')
  })

  it('is grey when there is no status to judge by', () => {
    expect(marketStanding(undefined, {}, [], 1000).lamp).toBe('gray')
  })
})

describe('nightlyStanding', () => {
  const health = (freshness: SignalHealthResponse['freshness']): SignalHealthResponse =>
    ({
      overall: 'ok',
      as_of: '',
      freshness,
      extra_tables: [],
      hypotheses: { counts: {}, total_active: 0, total: 0 },
      canonical_pnl: { insufficient_pct: null },
    }) as SignalHealthResponse

  it('reads Signal Health’s own rule rather than forming a second opinion', () => {
    const s = nightlyStanding(
      health([
        { label: 'vrp', table: 'f.x', max_computed_at: null, row_count: 1, status: 'stale', age_hours: 44, sla_hours: 36 },
        { label: 'scan', table: 'f.y', max_computed_at: null, row_count: 1, status: 'fresh', age_hours: 4, sla_hours: 36 },
      ]),
      false,
    )
    expect(s).toMatchObject({ lamp: 'yellow', state: 'ready · 1 lens old' })
    expect(s.why).toContain('landed, with an exception')
    expect(s.detail[0].text).toContain('amber asof')
  })

  it('tells silence from an all-clear', () => {
    expect(nightlyStanding(undefined, true)).toMatchObject({ lamp: 'gray', state: 'not probed' })
  })

  it('keeps a probe that did not finish grey and named, never amber', () => {
    const s = nightlyStanding(
      health([
        { label: 'vrp', table: 'f.x', max_computed_at: null, row_count: 1, status: 'fresh', age_hours: 4, sla_hours: 36 },
        { label: 'canonical_pnl', table: 'f.y', max_computed_at: null, row_count: null, status: 'unprobed', age_hours: null, sla_hours: 36, error: 'canceling statement due to statement timeout' },
      ]),
      false,
    )
    expect(s).toMatchObject({ lamp: 'green', state: 'ready' })
    expect(s.detail).toEqual([
      expect.objectContaining({ tone: 'note', text: expect.stringContaining('canonical_pnl was not judged this read') }),
    ])
  })

  it('reads a board nobody could judge as grey', () => {
    const s = nightlyStanding(
      health([{ label: 'vrp', table: 'f.x', max_computed_at: null, row_count: null, status: 'unprobed', age_hours: null, sla_hours: 36 }]),
      false,
    )
    expect(s).toMatchObject({ lamp: 'gray', state: 'not judged' })
  })
})

describe('worstLamp', () => {
  it('takes the worst of the three, and never calls an unknown green', () => {
    const d = (lamp: 'green' | 'yellow' | 'red' | 'gray') => ({ lamp }) as never
    expect(worstLamp([d('green'), d('yellow'), d('green')])).toBe('yellow')
    expect(worstLamp([d('red'), d('green'), d('green')])).toBe('red')
    expect(worstLamp([d('green'), d('green'), d('green')])).toBe('green')
    expect(worstLamp([d('green'), d('gray'), d('green')])).toBe('gray')
  })
})

describe('watchlistDataLine', () => {
  const pass = {
    ok: true,
    summary: 'PASS',
    watchlist_source_count: 18,
    checks: [
      { check: 'stock_daily_coverage', ok: true },
      { check: 'option_snapshot_coverage', ok: true },
      { check: 'option_oi_coverage', ok: true },
      { check: 'freshness', ok: true },
    ],
  }

  it('reads the plugin’s own PASS as a grey note, with its Ops page', () => {
    // The shape DEV answered on 2026-09-25.
    const line = watchlistDataLine(pass, false)
    expect(line).toMatchObject({ tone: 'note', ops: { view: 'market-data-manage' } })
    expect(line?.text).toContain('all 4 of the plugin’s checks pass over 18 watchlist names')
  })

  it('names the failing check in the plugin’s words, and it turns the row amber', () => {
    const fail = { ...pass, summary: 'FAIL', checks: [...pass.checks.slice(1), { check: 'stock_daily_coverage', ok: false, detail: 'gaps=3 over 30 trading days' }] }
    const line = watchlistDataLine(fail, false)
    expect(line?.tone).toBe('warn')
    expect(line?.text).toContain('gaps=3 over 30 trading days')
    const health = {
      overall: 'ok',
      as_of: '',
      freshness: [{ label: 'scan', table: 'f.y', max_computed_at: null, row_count: 1, status: 'fresh', age_hours: 4, sla_hours: 36 }],
      extra_tables: [],
      hypotheses: { counts: {}, total_active: 0, total: 0 },
      canonical_pnl: { insufficient_pct: null },
    } as unknown as SignalHealthResponse
    expect(nightlyStanding(health, false, line).lamp).toBe('yellow')
    expect(nightlyStanding(health, false, watchlistDataLine(pass, false)).lamp).toBe('green')
  })

  it('tells silence from a pass, and says nothing before the plugin answers', () => {
    expect(watchlistDataLine(undefined, true)?.text).toContain('did not answer')
    expect(watchlistDataLine(undefined, false)).toBeNull()
  })
})
