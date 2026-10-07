/**
 * TD-219: the rail's amber "alerts fired today" count. The store stamps each
 * alert with the session it judges (trade_date) and writes it later
 * (computed_at), so the count keys on computed_at's New York day — and keeps
 * counting from 20:00 ET to midnight, when the UTC date is already tomorrow.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AlertsResponse, AnalyzeAlert } from '@/api/research/alertScan'
import { etTodayIso } from '@/lib/freshness'
import { firedOn, firedTodayCount } from './useFiredAlerts'

function alert(over: Partial<AnalyzeAlert> = {}): AnalyzeAlert {
  return {
    trade_date: '2026-10-02',
    kind: 'weight_shift',
    symbol: null,
    lens: 'iv_rank',
    severity: 'warn',
    reason: {},
    computed_at: '2026-10-05T22:30:00Z',
    ...over,
  }
}

function store(items: AnalyzeAlert[]): AlertsResponse {
  return { count: items.length, items }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('firedTodayCount', () => {
  it('counts an alert written today for an earlier session (the live store shape)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-05T23:00:00Z')) // 19:00 ET
    expect(firedTodayCount(store([alert()]), etTodayIso())).toBe(1)
  })

  it.each([
    ['20:00 ET', '2026-10-06T00:00:00Z'],
    ['21:30 ET', '2026-10-06T01:30:00Z'],
    ['23:59 ET', '2026-10-06T03:59:00Z'],
  ])('still counts it at %s, when the UTC date is already tomorrow', (_label, nowIso) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(nowIso))
    expect(etTodayIso()).toBe('2026-10-05')
    expect(firedTodayCount(store([alert()]), etTodayIso())).toBe(1)
  })

  it('drops it at New York midnight', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-06T04:00:00Z')) // 00:00 ET on the 6th
    expect(firedTodayCount(store([alert()]), etTodayIso())).toBe(0)
  })

  it('counts a write after 20:00 ET on that New York day, not the UTC day', () => {
    // The planned 02:30 UTC batch writes at 22:30 ET the evening before.
    const late = alert({ computed_at: '2026-10-06T02:30:00Z' })
    expect(firedTodayCount(store([late]), '2026-10-05')).toBe(1)
    expect(firedTodayCount(store([late]), '2026-10-06')).toBe(0)
  })

  it('never keys on trade_date, and an unknown write time is not today', () => {
    expect(firedOn(alert({ trade_date: '2026-10-05', computed_at: '2026-10-02T22:30:00Z' }), '2026-10-05')).toBe(false)
    expect(firedOn(alert({ computed_at: null }), '2026-10-05')).toBe(false)
  })

  it('is zero until the store answers', () => {
    expect(firedTodayCount(undefined, '2026-10-05')).toBe(0)
  })
})
