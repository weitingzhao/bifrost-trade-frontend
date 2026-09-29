import { describe, expect, it } from 'vitest'
import type { MarginFacts } from '@/utils/marginPressure'
import { checkPasses, planCheck, type PlanCheckInput } from './planCheck'

// Invented account: net liq 100k, excess 70k (pressure 30%), 40k cash, 50k available.
function account(over: Partial<MarginFacts> = {}): MarginFacts {
  return {
    accountId: 'UTEST1',
    netLiquidation: 100_000,
    maintMarginReq: 25_000,
    excessLiquidity: 70_000,
    equityWithLoanValue: 95_000,
    cushion: 0.7,
    buyingPower: 200_000,
    grossPositionValue: 60_000,
    initMarginReq: 30_000,
    availableFunds: 50_000,
    totalCashValue: 40_000,
    pressure: 0.3,
    maintToNlv: 0.25,
    ...over,
  }
}

function input(over: Partial<PlanCheckInput> = {}): PlanCheckInput {
  return {
    symbol: 'ABC',
    legs: [{ side: 'sell', secType: 'OPT', right: 'P', strike: 90, ratio: 1 }],
    qty: 2,
    limit: 1.5,
    priceEffect: 'credit',
    accountLabel: 'HOST',
    account: account(),
    sharesHeld: 0,
    spot: { price: 100, source: 'live', asOf: 1 },
    ceiling: 0.5,
    intendedCash: 0,
    ...over,
  }
}

const row = (c: ReturnType<typeof planCheck>, k: string) => c.rows.find((r) => r.k.startsWith(k))?.v

describe('planCheck · short put', () => {
  it('prices Reg-T off spot and moves pressure by it', () => {
    const c = planCheck(input())
    // max(0.2×100 − 10, 0.1×90) = 10, + 1.5 premium = 11.5 × 100 = 1,150 per contract, ×2.
    expect(row(c, 'Reg-T margin')).toBe('$2,300')
    expect(row(c, 'Cash secured')).toBe('$18,000')
    // 1 − (70,000 − 2,300) / 100,000 = 32.3%.
    expect(row(c, 'Pressure HOST')).toBe('30% → 32%')
    expect(c.lamp).toBe('ok')
    expect(c.verdict).toBe('Fits under the ceiling')
    expect(checkPasses(c)).toBe(true)
  })

  it('names the headroom as the max at this strike, and what cash covers', () => {
    const c = planCheck(input())
    // (0.5 − 0.3) × 100,000 = 20,000 ÷ 1,150 = 17.
    expect(row(c, 'Max at this strike')).toBe('17 contracts')
    expect(c.rows.find((r) => r.k === 'Max at this strike')?.note).toBe('cash covers 4')
  })

  it('reads amber on margin when free cash does not secure it', () => {
    const c = planCheck(input({ intendedCash: 30_000 }))
    expect(c.lamp).toBe('degraded')
    expect(c.verdict).toBe('On margin — $10,000 free covers 1')
    expect(checkPasses(c)).toBe(true)
  })

  it('fails past the ceiling and says how far to size down', () => {
    const c = planCheck(input({ qty: 20 }))
    expect(c.lamp).toBe('fail')
    expect(c.verdict).toMatch(/^Does not fit — 53% ≥ 50%$/)
    expect(c.note).toMatch(/Reduce to 17 contracts/)
    expect(checkPasses(c)).toBe(false)
  })

  it('waits on a quote rather than guessing a spot', () => {
    const c = planCheck(input({ spot: null }))
    expect(c.lamp).toBe('unknown')
    expect(c.verdict).toBe('No quote for ABC — Reg-T needs a spot')
    expect(row(c, 'Cash secured')).toBe('$18,000')
    expect(row(c, 'Reg-T margin')).toBe('—')
  })

  it('says when the account is not read', () => {
    const c = planCheck(input({ account: null }))
    expect(c.lamp).toBe('unknown')
    expect(c.bar.now).toBeNull()
  })
})

describe('planCheck · covered call', () => {
  const call = { side: 'sell' as const, secType: 'OPT' as const, right: 'C' as const, strike: 110, ratio: 1 }

  it('passes on shares held, with no margin added', () => {
    const c = planCheck(input({ legs: [call], sharesHeld: 300 }))
    expect(c.lamp).toBe('ok')
    expect(c.verdict).toBe('Covered by 300 shares in HOST')
    expect(row(c, 'Margin added')).toBe('$0')
  })

  it('fails short of shares', () => {
    const c = planCheck(input({ legs: [call], sharesHeld: 100 }))
    expect(c.lamp).toBe('fail')
    expect(c.verdict).toBe('Not covered — 100 shares short in HOST')
  })
})

describe('planCheck · what it does not model', () => {
  it('leaves a side unchosen to the reader', () => {
    const c = planCheck(input({ legs: [{ side: '', secType: 'OPT', right: 'P', strike: 90, ratio: 1 }] }))
    expect(c.lamp).toBe('unknown')
    expect(c.verdict).toBe('Choose buy or sell')
  })

  it('does not run a naked-put formula on a spread', () => {
    const c = planCheck(
      input({
        legs: [
          { side: 'sell', secType: 'OPT', right: 'P', strike: 90, ratio: 1 },
          { side: 'buy', secType: 'OPT', right: 'P', strike: 85, ratio: 1 },
        ],
      }),
    )
    expect(c.lamp).toBe('unknown')
    expect(c.verdict).toBe('Not modelled for this structure')
    expect(checkPasses(c)).toBe(false)
  })

  it('shows a debit as a debit', () => {
    const c = planCheck(input({ priceEffect: 'debit' }))
    expect(c.rows.find((r) => r.k.startsWith('Est. debit'))?.v).toBe('-$300')
  })
})
