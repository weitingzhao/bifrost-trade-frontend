import { describe, expect, it } from 'vitest'
import type { StrategyStructure, WinRateStructureRow } from '@/types/strategy'
import {
  capsFor,
  chainFromSnapshots,
  economics,
  isMonthly,
  legLine,
  payoffAt,
  pickExpiry,
  placeStructure,
  recordFrom,
  recordLabel,
  structuresFor,
  viewFromParams,
  type ChainContract,
  type View,
} from './compareModel'

/** Invented rules, chain and records — shapes only, no book figures. */
function rule(id: number, name: string, type: string, dims: Partial<StrategyStructure> = {}): StrategyStructure {
  return {
    strategy_structure_id: id,
    name,
    structure_type: type,
    structure_subtype: null,
    structure_subtype_label: null,
    strategy_template_id: null,
    template_code: null,
    template_display_name: null,
    dim_direction: 'bullish',
    dim_structure: null,
    dim_coverage: null,
    dim_risk: 'defined',
    dim_volatility: 'short_vol',
    dim_time: 'monthly',
    version: 1,
    is_active: true,
    created_at: null,
    updated_at: null,
    notes: null,
    legs: [],
    ...dims,
  }
}

const SPOT = 100
function chain(): ChainContract[] {
  const out: ChainContract[] = []
  for (let k = 80; k <= 120; k += 2.5) {
    for (const right of ['C', 'P'] as const) {
      const otm = right === 'P' ? Math.max(0, SPOT - k) : Math.max(0, k - SPOT)
      out.push({
        ticker: `O:TEST261016${right}${String(k * 1000).padStart(8, '0')}`,
        strike: k,
        right,
        mark: Math.max(0.05, 3 - otm * 0.12),
        delta: right === 'P' ? -0.3 : 0.3,
        gamma: 0.02,
        theta: -0.04,
        vega: 0.1,
        oi: 1000,
        volume: 50,
      })
    }
  }
  return out
}
const VIEW: View = { stance: 'sell-vol', floor: 90, ceiling: 110, horizon: 20 }
const EXP = '2026-10-16'

describe('the view', () => {
  it('reads from the address, defaulting to a sell-vol view over twenty days', () => {
    expect(viewFromParams(new URLSearchParams(''))).toEqual({ stance: 'sell-vol', floor: null, ceiling: null, horizon: 20 })
    expect(viewFromParams(new URLSearchParams('stance=bearish&floor=140&ceil=&h=30'))).toEqual({
      stance: 'bearish',
      floor: 140,
      ceiling: null,
      horizon: 30,
    })
  })

  it('takes the rulebook rows whose dimensions match the stance, active ones only', () => {
    const book = [
      rule(1, 'CSP', 'cash_secured_put'),
      rule(2, 'Bull Call', 'bull_call_spread', { dim_volatility: 'long_vol' }),
      rule(3, 'Bear Call', 'bear_call_spread', { dim_direction: 'bearish' }),
      rule(4, 'Old', 'cash_secured_put', { is_active: false }),
    ]
    expect(structuresFor(book, 'sell-vol').map((s) => s.name)).toEqual(['CSP', 'Bear Call'])
    expect(structuresFor(book, 'buy-vol').map((s) => s.name)).toEqual(['Bull Call'])
    expect(structuresFor(book, 'bearish').map((s) => s.name)).toEqual(['Bear Call'])
  })
})

describe('the chain and the expiry', () => {
  it('reads a vendor row into a contract, and a zero close as no trade', () => {
    const [c] = chainFromSnapshots([
      { option_ticker: 'O:TEST261016P00090000', underlying: 'TEST', snapshot_ts: null, iv: 0.4, delta: -0.2, gamma: 0.01, theta: -0.03, vega: 0.1, open_interest: 5, day_close: 0, day_volume: 3 },
    ])
    expect(c).toMatchObject({ strike: 90, right: 'P', mark: null, oi: 5, volume: 3 })
  })

  it('knows a monthly by its third Friday', () => {
    expect(isMonthly('2026-10-16')).toBe(true)
    expect(isMonthly('2026-10-09')).toBe(false)
    expect(isMonthly('2026-10-23')).toBe(false)
  })

  it('picks the first expiry the horizon reaches, a monthly when the rule says monthly', () => {
    const listed = ['2026-09-25', '2026-10-02', '2026-10-09', '2026-10-16', '2026-11-20']
    expect(pickExpiry(listed, '2026-09-23', 10, false)).toBe('2026-10-09')
    expect(pickExpiry(listed, '2026-09-23', 10, true)).toBe('2026-10-16')
    expect(pickExpiry(listed, '2026-09-23', 400, false)).toBeNull()
  })
})

describe('placing a rule on the chain', () => {
  const c = chain()

  it('puts a cash-secured put at the highest listed strike at or below the floor', () => {
    const p = placeStructure(rule(1, 'CSP', 'cash_secured_put'), { ...VIEW, floor: 91 }, c, SPOT, EXP)
    expect(p.ok && p.legs.map((l) => [l.side, l.right, l.strike])).toEqual([['short', 'P', 90]])
  })

  it('wings a spread about five percent beyond its short strike', () => {
    const p = placeStructure(rule(2, 'BPS', 'bull_put_spread'), VIEW, c, SPOT, EXP)
    expect(p.ok && p.legs.map((l) => [l.side, l.strike])).toEqual([
      ['short', 90],
      ['long', 85],
    ])
  })

  it('needs the half of the view it reads, and says which', () => {
    const noCeiling = placeStructure(rule(3, 'BCS', 'bear_call_spread'), { ...VIEW, ceiling: null }, c, SPOT, EXP)
    expect(noCeiling).toMatchObject({ ok: false, reason: 'needs a ceiling — the view has none' })
    const noFloor = placeStructure(rule(5, 'IC', 'iron_condor'), { ...VIEW, floor: null }, c, SPOT, EXP)
    expect(noFloor).toMatchObject({ ok: false, reason: 'needs a floor — the view has none' })
  })

  it('places a covered call by its own rule, not by the view', () => {
    const cc = rule(1, 'CC 10% OTM', 'covered_call_otm', { metadata: { otm_pct: '10' } })
    const p = placeStructure(cc, { ...VIEW, floor: null, ceiling: null }, c, SPOT, EXP)
    expect(p.ok && p.legs.map((l) => [l.side, l.right, l.strike])).toEqual([
      ['long', 'S', null],
      ['short', 'C', 110],
    ])
  })

  it('keeps a rule it has no placement for as a row that says so', () => {
    const p = placeStructure(rule(9, 'Calendar', 'calendar_spread'), VIEW, c, SPOT, EXP)
    expect(p).toMatchObject({ ok: false, reason: 'no placement rule for calendar_spread yet' })
  })
})

describe('one unit', () => {
  const c = chain()
  const placed = (type: string, view: View = VIEW) => {
    const p = placeStructure(rule(1, type, type, { metadata: { otm_pct: '10' } }), view, c, SPOT, EXP)
    if (!p.ok) throw new Error(p.reason)
    return p
  }

  it('prices a credit spread as credit and backs it with its width', () => {
    const p = placed('bull_put_spread')
    const e = economics(p, SPOT)
    const short = c.find((x) => x.right === 'P' && x.strike === 90)!.mark!
    const long = c.find((x) => x.right === 'P' && x.strike === 85)!.mark!
    expect(e.net).toBeCloseTo((short - long) * 100)
    expect(e.backing).toBe(500)
    expect(e.unpriced).toBe(0)
  })

  it('backs a cash-secured put with its strike, the unit the backing gate divides', () => {
    expect(economics(placed('cash_secured_put'), SPOT).backing).toBe(9000)
  })

  it('counts the shares in a covered call’s delta and backing', () => {
    const e = economics(placed('covered_call_otm'), SPOT)
    expect(e.delta).toBeCloseTo(100 - 30)
    expect(e.backing).toBe(10_000)
  })

  it('prints no net at all when a leg did not trade — not a partial sum', () => {
    const thin = chain().map((x) => (x.right === 'P' && x.strike === 85 ? { ...x, mark: null } : x))
    const p = placeStructure(rule(2, 'BPS', 'bull_put_spread'), VIEW, thin, SPOT, EXP)
    const e = economics(p as Extract<typeof p, { ok: true }>, SPOT)
    expect(e.net).toBeNull()
    expect(e.unpriced).toBe(1)
  })

  it('pays off at expiry as the legs say', () => {
    const p = placed('cash_secured_put')
    const credit = economics(p, SPOT).net!
    expect(payoffAt(p, SPOT, 120)).toBeCloseTo(credit)
    expect(payoffAt(p, SPOT, 80)).toBeCloseTo(credit - 1000)
  })

  it('writes the design’s leg line', () => {
    const p = placed('cash_secured_put')
    expect(legLine(p.legs[0], EXP)).toMatch(/^STO 90P · 16 OCT @ \d+\.\d{2}$/)
  })
})

describe('the three caps', () => {
  const row = (w: number, l: number, profit: number | null, loss: number | null): WinRateStructureRow => ({
    structure_name: 'Cash Secured Put',
    total_instances: w + l,
    profit_trades: w,
    loss_trades: l,
    total_profit: profit,
    total_loss: loss,
    profit_investment: null,
    loss_investment: null,
    total_investment: null,
    total_max_risk: null,
    structure_return_pct: null,
    profit_avg_pct: null,
    loss_avg_pct: null,
    single_max_loss_pct: null,
    profit_avg_usd: null,
    loss_avg_usd: null,
  })
  const econ = { net: 200, backing: 5000, delta: 20, vega: -10, theta: 5, unpriced: 0 }

  it('writes the record out in full, by structure', () => {
    expect(recordLabel(recordFrom(row(18, 1, 10, -1)))).toBe('Cash Secured Put · by structure: 19 closed, 95%')
  })

  it('sizes by the smallest cap it could compute and says how many it had', () => {
    // 19 settled is under the sample floor: the rule halves the allowance.
    const caps = capsFor(econ, 40_000, recordFrom(row(18, 1, 10, -1)))
    expect(caps).toMatchObject({ backing: 8, conviction: 4, tail: null, computed: 2, size: 4, binding: 'conviction' })
    expect(caps.allowance?.label).toBe('half')
  })

  it('takes the whole backing cap on a large, healthy record', () => {
    const caps = capsFor(econ, 40_000, recordFrom(row(40, 5, 100, -20)))
    expect(caps).toMatchObject({ backing: 8, conviction: 8, size: 8, computed: 2 })
  })

  it('withdraws it below the decay line', () => {
    const caps = capsFor(econ, 40_000, recordFrom(row(30, 20, 10, -10)))
    expect(caps).toMatchObject({ conviction: 0, size: 0, binding: 'conviction' })
  })

  it('reads one cap of three when the structure has no record, and none without room', () => {
    expect(capsFor(econ, 40_000, null)).toMatchObject({ backing: 8, conviction: null, computed: 1, size: 8 })
    expect(capsFor(econ, null, recordFrom(row(18, 1, 10, -1)))).toMatchObject({ backing: null, conviction: null, computed: 0, size: null })
  })
})
