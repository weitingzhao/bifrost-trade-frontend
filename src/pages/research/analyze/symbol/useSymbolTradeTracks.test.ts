import { describe, expect, it } from 'vitest'
import type { TrackLeg, TradeTrack } from '@/components/symbolChart/symbolPriceModel'
import type { LegMark, RecordLeg } from '@/utils/tradeRecord/tradeRecordModel'
import { heldReading, openOnName } from './useSymbolTradeTracks'

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

function held(key: string, pnl: number | null, source?: LegMark['source']): RecordLeg {
  return {
    key,
    root: 'ZZA',
    label: `ZZA 20FEB26 100C`,
    expiry: '2026-02-20',
    strike: 100,
    right: 'C',
    side: 'Short',
    qty: 1,
    openQty: -1,
    entry: 1,
    exit: source ? 0.5 : null,
    exitKind: source ? 'mark' : 'none',
    mark: source ? { price: 0.5, source } : undefined,
    pnl,
    open: true,
    group: {} as RecordLeg['group'],
  }
}

describe('openOnName', () => {
  it('keeps the trades with a leg still open — a closed trade is out', () => {
    const rolled = track(1, [leg({ key: 'a', flatDate: '2026-01-10' }), leg({ key: 'b' })])
    const closed = track(2, [leg({ key: 'c', flatDate: '2026-01-05' })], '2026-01-05')
    expect(openOnName([rolled, closed]).map((t) => t.id)).toEqual([1])
    expect(openOnName([])).toEqual([])
  })
})

describe('heldReading', () => {
  it('sums the marked open legs and says where each mark came from', () => {
    const r = heldReading([held('a', 20, 'live'), held('b', -5, 'eod')])
    expect(r).toMatchObject({ legs: 2, marked: 2, unrealized: 15, sources: { live: 1, snap: 0, eod: 1 } })
  })

  it('counts an unmarked open leg as unmarked, never as zero', () => {
    const r = heldReading([held('a', -30, 'snap'), held('b', null)])
    expect(r).toMatchObject({ legs: 2, marked: 1, unrealized: -30 })
    expect(heldReading([held('a', null)]).unrealized).toBeNull()
    expect(heldReading([]).unrealized).toBeNull()
  })
})
