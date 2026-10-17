import { describe, expect, it } from 'vitest'
import type { TrackLeg, TradeTrack } from '@/components/symbolChart/symbolPriceModel'
import { openOnName } from './useSymbolTradeTracks'

// Invented figures — shapes only, no account values.
function leg(over: Partial<TrackLeg>): TrackLeg {
  return {
    key: 'k',
    strike: 100,
    right: 'C',
    side: -1,
    qty: 1,
    openQty: -1,
    openDate: '2026-01-02',
    flatDate: null,
    expiryIso: '2026-02-20',
    pnl: null,
    pnlIsMark: false,
    fills: 1,
    ...over,
  }
}

function track(id: number, legs: TrackLeg[], closeDate: string | null = null): TradeTrack {
  return { key: `inst:${id}`, id, legs, joints: [], openDate: '2026-01-02', closeDate, name: `#${id} −1 100C`, pnl: null, pnlIsMark: false, fills: legs.length }
}

describe('openOnName', () => {
  it('sums only the open legs of open trades — a rolled leg is history, a closed trade is out', () => {
    const rolled = track(1, [leg({ key: 'a', flatDate: '2026-01-10', pnl: 50 }), leg({ key: 'b', pnl: 20, pnlIsMark: true })])
    const closed = track(2, [leg({ key: 'c', flatDate: '2026-01-05', pnl: 99 })], '2026-01-05')
    const r = openOnName([rolled, closed])
    expect(r.open.map((t) => t.id)).toEqual([1])
    expect(r).toMatchObject({ legs: 1, marked: 1, unrealized: 20 })
  })

  it('counts an unmarked open leg as unmarked, never as zero', () => {
    const r = openOnName([track(3, [leg({ key: 'a', pnl: -30, pnlIsMark: true }), leg({ key: 'b' })])])
    expect(r).toMatchObject({ legs: 2, marked: 1, unrealized: -30 })
    expect(openOnName([track(4, [leg({ key: 'a' })])]).unrealized).toBeNull()
  })

  it('is empty when nothing is open', () => {
    expect(openOnName([]).open).toEqual([])
  })
})
