import { describe, expect, it } from 'vitest'
import { buildExpiryBranch, buildMarkPath } from './reviewMarkPath'
import type { ReviewFill, ReviewTrade } from './reviewTrades'
import type { DailyBar } from '@/api/marketData/dailyBars'

function bar(date: string, close: number | null): DailyBar {
  return { date, open: close, high: close, low: close, close }
}

function fill(date: string | null, side: 'buy' | 'sell', qty: number, price: number, commission = 0): ReviewFill {
  return {
    date,
    side,
    qty,
    price,
    commission,
    cash: side === 'buy' ? -(price * qty * 100 + commission) : price * qty * 100 - commission,
  }
}

/** One short put: sold at 10.00, bought back at 3.00, one contract, no commission. */
function shortPut(fills: ReviewFill[] = [fill('2026-08-03', 'sell', 1, 10), fill('2026-08-07', 'buy', 1, 3)]): ReviewTrade {
  return {
    contractKey: 'DDOG  261016P00200000|OPT|20261016|200.0|P',
    label: 'DDOG 26-10-16 P200',
    symbol: 'DDOG  261016P00200000',
    underlying: 'DDOG',
    accountId: 'U1',
    expiry: '2026-10-16',
    strike: 200,
    right: 'P',
    fills,
    play: null,
    openedOn: fills[0].date,
    closedOn: fills[fills.length - 1].date,
    daysHeld: 4,
    dteAtEntry: 74,
    contracts: 1,
    realised: fills.reduce((a, f) => a + f.cash, 0),
    win: true,
    exitKind: 'closed',
    shortPremium: true,
    entryPremium: 1000,
    exitPremium: 300,
    creditKept: 0.7,
  }
}

describe('buildMarkPath', () => {
  const bars = [
    bar('2026-08-03', 10),
    bar('2026-08-04', 14), // marked against me: −$400
    bar('2026-08-05', 6),
    bar('2026-08-06', 2), // best while held: +$800
    bar('2026-08-07', 3),
    bar('2026-08-10', 1), // after the exit — the "had I stayed" branch
  ]

  it('ends on the Ledger’s realised figure', () => {
    const path = buildMarkPath(shortPut(), bars)
    expect(path).not.toBeNull()
    expect(path!.realised).toBeCloseTo(700, 6)
    expect(path!.held[path!.held.length - 1].openQty).toBe(0)
  })

  it('takes best and worst from the days actually held, not from every bar', () => {
    const path = buildMarkPath(shortPut(), bars)!
    expect(path.best).toBeCloseTo(800, 6)
    expect(path.bestDate).toBe('2026-08-06')
    expect(path.worst).toBeCloseTo(-400, 6)
    expect(path.worstDate).toBe('2026-08-04')
    expect(path.everUnderwater).toBe(true)
    // The 08-10 bar at 1.00 would have been +$900 and is deliberately excluded.
    expect(path.held.map((p) => p.date)).toEqual([
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
    ])
  })

  it('carries the days after the exit as the had-I-stayed branch', () => {
    const path = buildMarkPath(shortPut(), bars)!
    expect(path.ifHeld.map((p) => p.date)).toEqual(['2026-08-07', '2026-08-10'])
    // Opening fills only: sold at 10, marked at 1 → +$900.
    expect(path.ifHeld[1].pl).toBeCloseTo(900, 6)
  })

  it('reads capture of best and cut-loss latency off the path', () => {
    const path = buildMarkPath(shortPut(), bars)!
    expect(path.captureOfBest).toBeCloseTo(700 / 800, 6)
    expect(path.cutLatencyDays).toBe(3) // 08-04 worst → 08-07 exit
  })

  it('closes on the exit when the vendor has no bar for that session', () => {
    // A contract booked out the day after expiry: the last bar leaves a residual
    // position, and the curve must still land on the realised figure.
    const late = shortPut([fill('2026-08-03', 'sell', 1, 10), fill('2026-08-08', 'buy', 1, 0)])
    const path = buildMarkPath(late, bars.slice(0, 4))!
    expect(path.held[path.held.length - 1].date).toBe('2026-08-08')
    expect(path.realised).toBeCloseTo(1000, 6)
  })

  it('is null when no bar in the window carries a close', () => {
    expect(buildMarkPath(shortPut(), [bar('2026-08-03', null)])).toBeNull()
    expect(buildMarkPath(shortPut(), [])).toBeNull()
  })

  it('counts the bars it got against the business days it asked for', () => {
    const path = buildMarkPath(shortPut(), bars)!
    expect(path.bars).toBe(5)
    expect(path.businessDays).toBe(5) // Mon 08-03 → Fri 08-07
  })
})

describe('buildExpiryBranch', () => {
  const AFTER = '2026-10-19'

  it('prices the do-nothing branch at intrinsic, which at expiry is exact', () => {
    const branch = buildExpiryBranch(shortPut(), [bar('2026-10-15', 210), bar('2026-10-16', 190)], AFTER)
    // Short 1 put struck 200, underlying 190 → 10.00 intrinsic against a 10.00 credit.
    expect(branch).not.toBeNull()
    expect(branch!.underlying).toBe(190)
    expect(branch!.intrinsic).toBeCloseTo(10, 6)
    expect(branch!.pl).toBeCloseTo(0, 6)
  })

  it('is worthless-expiry when the underlying finishes out of the money', () => {
    const branch = buildExpiryBranch(shortPut(), [bar('2026-10-16', 240)], AFTER)!
    expect(branch.intrinsic).toBe(0)
    expect(branch.pl).toBeCloseTo(1000, 6)
  })

  it('is null when no session at or before expiry has a close', () => {
    expect(buildExpiryBranch(shortPut(), [bar('2026-10-19', 190)], AFTER)).toBeNull()
  })

  it('refuses to price a contract that has not expired', () => {
    // The window stops at today, so the last close is today's, not settlement's.
    // Pricing there would label "held until today" as "held to expiry".
    expect(buildExpiryBranch(shortPut(), [bar('2026-09-17', 236)], '2026-09-18')).toBeNull()
  })

  it('refuses a close too far before expiry to be its session', () => {
    expect(buildExpiryBranch(shortPut(), [bar('2026-10-09', 190)], AFTER)).toBeNull()
    // A holiday-shifted expiry is still within the slack.
    expect(buildExpiryBranch(shortPut(), [bar('2026-10-14', 190)], AFTER)).not.toBeNull()
  })
})
