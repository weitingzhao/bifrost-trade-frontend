import { describe, expect, it } from 'vitest'
import { counterfactuals, derivedTags, sources, timeline } from './tradeFitModel'
import type { MarkPath } from '@/utils/reviewMarkPath'
import type { ReviewTrade } from '@/utils/reviewTrades'

const TODAY = '2026-09-18'

const TRADE: ReviewTrade = {
  contractKey: 'HIMS  260821C00040000|OPT|20260821|40.0|C',
  label: 'HIMS 21AUG26 40C',
  symbol: 'HIMS  260821C00040000',
  underlying: 'HIMS',
  accountId: 'U1',
  expiry: '2026-08-21',
  strike: 40,
  right: 'C',
  fills: [
    { date: '2026-05-22', side: 'sell', qty: 9, price: 1.12, commission: 6.36, cash: 1001.64 },
    { date: '2026-08-18', side: 'buy', qty: 9, price: 0.01, commission: 3.28, cash: -12.28 },
  ],
  play: 'HIMS Covered Call',
  openedOn: '2026-05-22',
  closedOn: '2026-08-18',
  daysHeld: 88,
  dteAtEntry: 91,
  contracts: 9,
  realised: 989.36,
  win: true,
  exitKind: 'closed',
  shortPremium: true,
  entryPremium: 1001.64,
  exitPremium: 12.28,
  creditKept: 0.99,
}

const PATH: MarkPath = {
  held: [],
  ifHeld: [],
  best: 992.64,
  bestDate: '2026-08-17',
  worst: -3912.36,
  worstDate: '2026-07-06',
  realised: 989.36,
  captureOfBest: 989.36 / 992.64,
  cutLatencyDays: 43,
  everUnderwater: true,
  bars: 60,
  businessDays: 63,
}

describe('counterfactuals', () => {
  it('prices the plan row at n/c rather than dropping it', () => {
    const rows = counterfactuals(TRADE, PATH, null, TODAY)
    const plan = rows.find((r) => r.key === 'plan')!
    expect(plan.pl).toBeNull()
    expect(plan.delta).toBeNull()
    expect(plan.meaning).toContain('Not zero — absent')
  })

  it('measures every priced branch against the realised figure', () => {
    const rows = counterfactuals(TRADE, PATH, null, TODAY)
    expect(rows.find((r) => r.key === 'actual')!.pl).toBe(989.36)
    expect(rows.find((r) => r.key === 'best')!.delta).toBeCloseTo(992.64 - 989.36, 6)
    expect(rows.find((r) => r.key === 'worst')!.delta).toBeCloseTo(-3912.36 - 989.36, 6)
  })

  it('says a contract still running has no expiry price, not that the data is missing', () => {
    const running = { ...TRADE, expiry: '2026-12-18' }
    const row = counterfactuals(running, PATH, null, TODAY).find((r) => r.key === 'expiry')!
    expect(row.pl).toBeNull()
    expect(row.meaning).toContain('has not settled')
  })

  it('leaves out the path branches entirely when there is no path', () => {
    const keys = counterfactuals(TRADE, null, null, TODAY).map((r) => r.key)
    expect(keys).toEqual(['actual', 'plan', 'expiry'])
  })

  it('names the worst row for what it found', () => {
    const dry = { ...PATH, worst: 12, everUnderwater: false }
    expect(counterfactuals(TRADE, dry, null, TODAY).find((r) => r.key === 'worst')!.name).toBe('Never underwater')
    expect(counterfactuals(TRADE, PATH, null, TODAY).find((r) => r.key === 'worst')!.name).toBe('Worst mark printed')
  })
})

describe('timeline', () => {
  it('opens on the absent plan and closes on the exit', () => {
    const stages = timeline(TRADE, PATH)
    expect(stages[0].key).toBe('plan')
    expect(stages[0].when).toBeNull()
    expect(stages[stages.length - 1].key).toBe('exit')
  })

  it('carries the drawdown when the position marked against me before the exit', () => {
    expect(timeline(TRADE, PATH).map((s) => s.key)).toContain('drawdown')
    expect(timeline(TRADE, null).map((s) => s.key)).not.toContain('drawdown')
  })

  it('leaves out the peak when the best mark is the exit', () => {
    const atPeak: MarkPath = { ...PATH, bestDate: '2026-08-18', best: 989.36 }
    expect(timeline(TRADE, atPeak).map((s) => s.key)).not.toContain('peak')
  })
})

describe('derivedTags', () => {
  it('keeps the plan-dependent tags in place and marks them', () => {
    const plan = derivedTags(TRADE, PATH).find((t) => t.key === 'plan-tags')!
    expect(plan.unreadable).toBe(true)
  })

  it('reads the peak and the drawdown off the path', () => {
    const keys = derivedTags(TRADE, PATH).map((t) => t.key)
    expect(keys).toContain('took-the-peak') // landed 99.7% of the best mark
    expect(keys).toContain('drawdown')
  })

  it('calls out a give-back only once it is worth more than noise', () => {
    const gave: MarkPath = { ...PATH, best: 2000, captureOfBest: 989.36 / 2000 }
    expect(derivedTags(TRADE, gave).map((t) => t.key)).toContain('gave-back')
  })

  it('derives nothing from a path it has not got', () => {
    expect(derivedTags(TRADE, null).map((t) => t.key)).toEqual(['plan-tags'])
  })

  it('flags a loser that sat past its worst mark', () => {
    const loser = { ...TRADE, win: false }
    expect(derivedTags(loser, PATH).map((t) => t.key)).toContain('slow-cut')
    expect(derivedTags(loser, { ...PATH, cutLatencyDays: 1 }).map((t) => t.key)).not.toContain('slow-cut')
  })
})

describe('sources', () => {
  it('lamps the marks yellow when coverage is partial and green when it is not', () => {
    expect(sources(TRADE, PATH, 60, 'O:X').find((r) => r.key === 'marks')!.lamp).toBe('green')
    const thin: MarkPath = { ...PATH, bars: 20 }
    expect(sources(TRADE, thin, 60, 'O:X').find((r) => r.key === 'marks')!.lamp).toBe('yellow')
    expect(sources(TRADE, null, 0, 'O:X').find((r) => r.key === 'marks')!.lamp).toBe('gray')
  })

  it('always says the plan and the mid at submit are absent', () => {
    const rows = sources(TRADE, PATH, 60, 'O:X')
    expect(rows.find((r) => r.key === 'plan')!.lamp).toBe('gray')
    expect(rows.find((r) => r.key === 'mid')!.lamp).toBe('gray')
  })
})
