import { describe, expect, it } from 'vitest'
import { buildReviewTrades, playbookStats, winRateBand } from './reviewTrades'
import type { Execution } from '@/types/positions'

/** Invented fills — one short-premium trade closed, one debit trade closed. */
function exec(p: Partial<Execution>): Execution {
  return {
    account_executions_id: null,
    account_id: 'ACCT',
    contract_key: 'ZEBR|OPT|20261218|90|C',
    symbol: 'ZEBR 18DEC26 90C',
    sec_type: 'OPT',
    option_right: 'C',
    strike: 90,
    expiry: '20261218',
    side: 'Sell',
    qty: 2,
    quantity: 2,
    price: 3,
    time: 1,
    trade_date: '2026-08-01',
    ...p,
  } as Execution
}

const shortTrade: Execution[] = [
  // The wire sends `SELL` / `BUY` in upper case while the type spells them in
  // title case; the reader uppercases before comparing, and this pins it.
  exec({
    side: 'SELL' as Execution['side'],
    price: 3,
    time: 1,
    trade_date: '2026-08-01',
    strategy_opportunity_name: 'Covered call book',
  }),
  exec({ side: 'Buy', price: 0.6, time: 2, trade_date: '2026-08-20', realized_pnl: 480, strategy_opportunity_name: 'Covered call book' }),
]

const debitTrade: Execution[] = [
  exec({
    contract_key: 'QUOK|OPT|20261120|40|P',
    symbol: 'QUOK 20NOV26 40P',
    expiry: '20261120',
    strike: 40,
    option_right: 'P',
    side: 'Buy',
    price: 2,
    time: 3,
    trade_date: '2026-08-05',
    strategy_opportunity_name: 'Hedge book',
  }),
  exec({
    contract_key: 'QUOK|OPT|20261120|40|P',
    symbol: 'QUOK 20NOV26 40P',
    expiry: '20261120',
    strike: 40,
    option_right: 'P',
    side: 'Sell',
    price: 1,
    time: 4,
    trade_date: '2026-08-15',
    realized_pnl: -200,
    strategy_opportunity_name: 'Hedge book',
  }),
]

/** Sold and never bought back, with an expiry long past — over, but unbooked. */
const expiredUnbooked: Execution[] = [
  exec({
    contract_key: 'HUSH|OPT|20250117|10|C',
    symbol: 'HUSH 17JAN25 10C',
    expiry: '20250117',
    strike: 10,
    side: 'Sell',
    price: 1,
    time: 5,
    trade_date: '2024-12-01',
  }),
]

describe('buildReviewTrades', () => {
  it('reads a short-premium trade from its own fills', () => {
    const { trades } = buildReviewTrades(shortTrade)
    expect(trades).toHaveLength(1)
    const t = trades[0]
    expect(t.shortPremium).toBe(true)
    expect(t.play).toBe('Covered call book')
    expect(t.openedOn).toBe('2026-08-01')
    expect(t.closedOn).toBe('2026-08-20')
    expect(t.daysHeld).toBe(19)
    // Written 139 days out, which is the reading "how far out was this opened".
    expect(t.dteAtEntry).toBe(139)
    expect(t.realised).toBe(480)
    expect(t.win).toBe(true)
    // Took $600 in, paid $120 back: 80% of the credit kept.
    expect(t.entryPremium).toBeCloseTo(600)
    expect(t.exitPremium).toBeCloseTo(120)
    expect(t.creditKept).toBeCloseTo(0.8)
  })

  it('has no credit to keep on a debit trade, and says so with null', () => {
    const [t] = buildReviewTrades(debitTrade).trades
    expect(t.shortPremium).toBe(false)
    // Zero would read as "kept none of the credit" on a trade that never took one.
    expect(t.creditKept).toBeNull()
    expect(t.realised).toBe(-200)
    expect(t.win).toBe(false)
  })

  it('counts a contract past expiry that was never bought back apart, not as closed', () => {
    const { trades, expiredUnbooked: n } = buildReviewTrades(expiredUnbooked)
    // It is over economically, but it carries no closing fill and therefore no
    // realised figure — folding it in would invent one.
    expect(trades).toHaveLength(0)
    expect(n).toBe(1)
  })

  it('puts the newest close first', () => {
    const { trades } = buildReviewTrades([...debitTrade, ...shortTrade])
    expect(trades.map((t) => t.symbol)).toEqual(['ZEBR 18DEC26 90C', 'QUOK 20NOV26 40P'])
  })
})

describe('winRateBand', () => {
  it('widens as the sample shrinks and never leaves 0–1', () => {
    const wide = winRateBand(8, 11)
    const tight = winRateBand(800, 1100)
    expect(wide.high - wide.low).toBeGreaterThan(tight.high - tight.low)
    expect(wide.low).toBeGreaterThan(0)
    expect(wide.high).toBeLessThan(1)
    // A clean sweep still carries a band: four for four is not certainty.
    const swept = winRateBand(4, 4)
    expect(swept.low).toBeLessThan(1)
    expect(swept.high).toBeLessThanOrEqual(1)
  })
})

describe('playbookStats', () => {
  it('aggregates a play and marks a thin sample', () => {
    const { trades } = buildReviewTrades([...shortTrade, ...debitTrade])
    const stats = playbookStats(trades)
    expect(stats.map((s) => s.play)).toEqual(['Covered call book', 'Hedge book'])
    const cc = stats[0]
    expect(cc).toMatchObject({ n: 1, wins: 1, winRate: 1, thin: true })
    expect(cc.creditKept).toBeCloseTo(0.8)
    // One winner and no loser: a profit factor would divide by zero, and
    // printing Infinity would read as an unbeatable play.
    expect(cc.profitFactor).toBeNull()
    // One loser and no winner is a different fact, and it has a number: the
    // play has taken in nothing against what it has given up.
    expect(stats[1].profitFactor).toBe(0)
  })

  it('takes the profit factor as gross win over gross loss', () => {
    const { trades } = buildReviewTrades([
      ...shortTrade,
      ...debitTrade.map((e) => ({ ...e, strategy_opportunity_name: 'Covered call book' })),
    ])
    const [cc] = playbookStats(trades)
    expect(cc.n).toBe(2)
    expect(cc.profitFactor).toBeCloseTo(480 / 200)
    expect(cc.best).toBe(480)
    expect(cc.worst).toBe(-200)
  })
})

describe('playbookStats MAE', () => {
  it('is the median excursion across the play, and the worst one beside it', () => {
    const { trades } = buildReviewTrades([...shortTrade, ...debitTrade])
    const paths = new Map(
      trades.map((t, i) => [
        t.contractKey,
        {
          held: [],
          ifHeld: [],
          best: 100,
          bestDate: '2026-01-01',
          worst: i === 0 ? -500 : -1500,
          worstDate: '2026-01-01',
          realised: t.realised,
          captureOfBest: 0.5,
          cutLatencyDays: 2,
          everUnderwater: true,
          bars: 5,
          businessDays: 5,
        },
      ]),
    )
    const all = playbookStats(trades, paths)
    const excursions = all.flatMap((p) => (p.mae == null ? [] : [p.mae]))
    expect(excursions.sort()).toEqual([-1500, -500].sort())
    expect(all.every((p) => p.maeWorst != null && p.maeWorst <= (p.mae as number))).toBe(true)
  })

  it('is null rather than zero when no trade in the play has a path', () => {
    const { trades } = buildReviewTrades([...shortTrade])
    expect(playbookStats(trades).every((p) => p.mae == null && p.maeWorst == null)).toBe(true)
  })
})
