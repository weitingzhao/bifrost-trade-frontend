import { describe, it, expect } from 'vitest'
import { buildChecks, NEAR_EXPIRY_DAYS, STALE_FEED_SEC } from './usePositionsAlarm'
import type { ExpiryLadderRow } from '@/utils/positionsOptionRisk'
import type { MarginRollup } from '@/utils/marginPressure'

const row = (o: Partial<ExpiryLadderRow> = {}): ExpiryLadderRow => ({
  expiry: '20261120',
  dte: 30,
  legCount: 1,
  shortContracts: 1,
  longContracts: 0,
  itmShortCount: 0,
  unpricedShortCount: 0,
  symbols: ['AAA'],
  instanceCount: 1,
  tightestCushionPct: 0.2,
  ...o,
})

const CALM_MARGIN: MarginRollup = {
  accounts: [],
  netLiquidation: 1_000_000,
  maintMarginReq: 300_000,
  excessLiquidity: 750_000,
  pressure: 0.25,
  tightest: null,
}

const build = (o: Partial<Parameters<typeof buildChecks>[0]> = {}) =>
  buildChecks({
    ladderRows: [row()],
    nakedCalls: 0,
    margin: CALM_MARGIN,
    feedAgeSec: 5,
    cushionTightPct: 0.03,
    ...o,
  })

const byId = (checks: ReturnType<typeof buildChecks>, id: string) =>
  checks.find((c) => c.id === id)

describe('buildChecks — the quiet case', () => {
  it('reports all clear only when every check is genuinely ok', () => {
    const checks = build()
    expect(checks.every((c) => c.tone === 'ok')).toBe(true)
    // Data-quality checks are absent rather than green when nothing is wrong.
    expect(byId(checks, 'unpriced')).toBeUndefined()
    expect(byId(checks, 'feed')).toBeUndefined()
  })
})

describe('buildChecks — thresholds', () => {
  it('fires danger on any ITM short', () => {
    expect(byId(build({ ladderRows: [row({ itmShortCount: 1 })] }), 'itm')?.tone).toBe('danger')
  })

  it('takes the tightest cushion across expiries, not the first', () => {
    const checks = build({
      ladderRows: [row({ tightestCushionPct: 0.4 }), row({ expiry: '20261218', tightestCushionPct: 0.01 })],
    })
    expect(byId(checks, 'cushion')?.value).toBe('+1.0%')
    expect(byId(checks, 'cushion')?.tone).toBe('warn')
  })

  it('follows the trader’s cushion line', () => {
    const rows = [row({ tightestCushionPct: 0.04 })]
    expect(byId(build({ ladderRows: rows, cushionTightPct: 0.03 }), 'cushion')?.tone).toBe('ok')
    expect(byId(build({ ladderRows: rows, cushionTightPct: 0.08 }), 'cushion')?.tone).toBe('warn')
  })

  it('breaks 0DTE out of the near-expiry window', () => {
    const near = byId(build({ ladderRows: [row({ dte: NEAR_EXPIRY_DAYS, shortContracts: 4 })] }), 'expiring')
    expect(near?.label).toBe(`≤${NEAR_EXPIRY_DAYS}d`)
    expect(near?.tone).toBe('warn')

    const today = byId(build({ ladderRows: [row({ dte: 0, shortContracts: 2 })] }), 'expiring')
    expect(today?.label).toBe('0DTE')
    expect(today?.value).toBe('2')
    expect(today?.tone).toBe('danger')
  })

  it('is quiet past the near-expiry window', () => {
    expect(byId(build({ ladderRows: [row({ dte: NEAR_EXPIRY_DAYS + 1 })] }), 'expiring')?.tone).toBe('ok')
  })

  it('fires danger on any naked short call', () => {
    expect(byId(build({ nakedCalls: 1 }), 'naked')?.tone).toBe('danger')
  })

  it('bands margin pressure and names the most loaded account', () => {
    const heavy = { ...CALM_MARGIN, pressure: 0.6, tightest: { accountId: 'U1', pressure: 0.8 } as never }
    expect(byId(build({ margin: heavy }), 'margin')?.tone).toBe('warn')
    expect(byId(build({ margin: heavy }), 'margin')?.detail).toContain('U1')
    expect(byId(build({ margin: { ...CALM_MARGIN, pressure: 0.9 } }), 'margin')?.tone).toBe('danger')
  })
})

describe('buildChecks — assignment exposure', () => {
  it('is quiet when a full assignment is comfortably fundable', () => {
    expect(byId(build({ coverRatio: 0.2 }), 'assign')?.tone).toBe('ok')
  })

  it('warns past half of buying power and fires at all of it', () => {
    expect(byId(build({ coverRatio: 0.5 }), 'assign')?.tone).toBe('warn')
    expect(byId(build({ coverRatio: 1 }), 'assign')?.tone).toBe('danger')
    expect(byId(build({ coverRatio: 1.4 }), 'assign')?.value).toBe('140%')
  })

  it('omits the check rather than showing 0% when buying power is unknown', () => {
    expect(byId(build({ coverRatio: null }), 'assign')).toBeUndefined()
  })
})

describe('buildChecks — never green over missing data', () => {
  it('warns rather than reporting a cushion when nothing could be priced', () => {
    const c = byId(build({ ladderRows: [row({ tightestCushionPct: null })] }), 'cushion')
    expect(c?.value).toBe('n/a')
    expect(c?.tone).toBe('warn')
  })

  it('surfaces unpriced shorts, which ITM and cushion silently exclude', () => {
    const c = byId(build({ ladderRows: [row({ unpricedShortCount: 3 })] }), 'unpriced')
    expect(c?.tone).toBe('warn')
    expect(c?.value).toBe('3')
  })

  it('flags contracts still open past expiry', () => {
    expect(byId(build({ ladderRows: [row({ dte: -2, shortContracts: 5 })] }), 'past')?.value).toBe('5')
  })

  it('flags a stalled or unknown quote feed', () => {
    expect(byId(build({ feedAgeSec: STALE_FEED_SEC + 1 }), 'feed')?.tone).toBe('warn')
    expect(byId(build({ feedAgeSec: null }), 'feed')?.value).toBe('n/a')
  })

  it('warns rather than showing 0% when the broker reported no cushion', () => {
    const c = byId(build({ margin: { ...CALM_MARGIN, pressure: null } }), 'margin')
    expect(c?.value).toBe('n/a')
    expect(c?.tone).toBe('warn')
  })
})
