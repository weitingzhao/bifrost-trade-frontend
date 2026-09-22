/**
 * The two readings this page must not get wrong: what an alert says it did,
 * and what an empty day means.
 */
import { describe, expect, it } from 'vitest'
import type { AnalyzeAlert } from '@/api/research/alertScan'
import { firedRows, firedStanding, sinceReading } from './alertsModel'

function alert(over: Partial<AnalyzeAlert> = {}): AnalyzeAlert {
  return {
    trade_date: '2026-09-18',
    kind: 'weight_shift',
    symbol: null,
    lens: 'iv_rank',
    severity: 'warn',
    reason: { z: 1.992, sigma: 0.0402, mean_hit_rate: 0.5579, latest_hit_rate_30d: 0.6381 },
    computed_at: '2026-09-21T22:30:43Z',
    ...over,
  }
}

const DROP: AnalyzeAlert = alert({
  kind: 'hit_rate_drop',
  lens: 'gex_regime',
  reason: {
    side: 'hot',
    curr_rate: 0.6365,
    prev_rate: 0.7358,
    curr_week: '2026-W37',
    prev_week: '2026-W36',
    drop_pp: 9.94,
  },
})

describe('sinceReading', () => {
  it('reads the movement in the alert’s own units, since there is no price', () => {
    // DEV 2026-09-22: every one of the 44 alerts has symbol null, so the
    // design's "−0.4% since fire" has nothing to price. The alert carries the
    // move that made it fire instead.
    expect(sinceReading(DROP)).toEqual({
      text: '63.6% in 2026-W37 against 73.6% in 2026-W36',
      tone: 'down',
    })
    expect(sinceReading(alert())).toEqual({
      text: '30d 63.8% against its 55.8% mean',
      tone: 'up',
    })
  })

  it('takes its direction from z, not from the order of the two numbers', () => {
    expect(sinceReading(alert({ reason: { z: -1.772, mean_hit_rate: 0.8405, latest_hit_rate_30d: 0.6416 } }))?.tone).toBe('down')
  })

  it('is null when the payload carries no pair, rather than a dash', () => {
    expect(sinceReading(alert({ reason: null }))).toBeNull()
    expect(sinceReading(alert({ reason: { z: 1 } }))).toBeNull()
    expect(sinceReading(alert({ kind: 'composite_high', reason: { rank: 3 } }))).toBeNull()
  })
})

describe('firedRows', () => {
  it('scopes to the lens, because nothing in this store carries a symbol', () => {
    const [row] = firedRows([DROP])
    expect(row).toMatchObject({ scope: 'gex_regime', scopeIsSymbol: false, lamp: 'yellow' })
    expect(row.what).toBe('hot-side hit rate fell week over week · hot hit-rate −9.94pp')
  })

  it('sends each row where its lens can be looked at', () => {
    expect(firedRows([DROP])[0]).toMatchObject({
      to: '/research/signal-decay?lens=gex_regime',
      dest: 'Signal Decay →',
    })
  })

  it('drops ?lens= for a lens the destination cannot select', () => {
    // `momentum` is 7 of the 44 and is not one of Signal Decay's six.
    expect(firedRows([alert({ lens: 'momentum' })])[0].to).toBe('/research/signal-decay')
  })

  it('orders by severity before recency, like the panel', () => {
    const rows = firedRows([
      alert({ severity: 'info', trade_date: '2026-09-18' }),
      alert({ severity: 'warn', trade_date: '2026-09-01' }),
    ])
    expect(rows.map((r) => r.severity)).toEqual(['warn', 'info'])
  })
})

describe('firedStanding', () => {
  it('never lets an empty day read as an all-clear', () => {
    // The store's newest is 2026-09-18 and today is the 22nd. "0 today" is
    // true and says the wrong thing.
    const s = firedStanding([DROP, alert()], '2026-09-22', 90)
    expect(s.text).toBe('2 in the last 90 days · 2 on 2026-09-18, they are the newest — nothing has fired since')
    expect(s.tone).toBe('warn')
  })

  it('says today when the newest really is today', () => {
    expect(firedStanding([alert({ trade_date: '2026-09-22' })], '2026-09-22', 90).text).toContain(
      '1 on 2026-09-22, today',
    )
  })

  it('says the store answered, rather than implying a filter hid something', () => {
    expect(firedStanding([], '2026-09-22', 90)).toEqual({
      text: 'nothing in the last 90 days — this is the store answering, not a filter',
      tone: 'gray',
    })
  })
})
