import { describe, it, expect } from 'vitest'
import {
  assignmentCoverRatio,
  summarizeAssignmentExposure,
  type ExposureLeg,
} from './assignmentExposure'

const leg = (o: Partial<ExposureLeg> = {}): ExposureLeg => ({
  strike: 100,
  expiry: '20261120',
  right: 'P',
  qty: -1,
  underlying: 'AAA',
  accountId: 'U1',
  ...o,
})

/** Shares held per symbol in U1 unless the key names an account ("U2:AAA"). */
const shares =
  (m: Record<string, number> = {}) =>
  (sym: string, acct: string) =>
    m[`${acct}:${sym}`] ?? (acct === 'U1' ? (m[sym] ?? 0) : 0)

describe('summarizeAssignmentExposure', () => {
  it('prices a short put at the cash it would actually take', () => {
    const s = summarizeAssignmentExposure([leg({ strike: 150, qty: -2 })], shares())
    expect(s.putAssignmentCash).toBe(2 * 100 * 150)
    expect(s.shortPutContracts).toBe(2)
  })

  it('ignores long legs — they carry no obligation', () => {
    const s = summarizeAssignmentExposure([leg({ qty: 5 }), leg({ right: 'C', qty: 3 })], shares())
    expect(s.putAssignmentCash).toBe(0)
    expect(s.shortPutContracts).toBe(0)
    expect(s.nakedCallContracts).toBe(0)
  })

  it('gives a short call no dollar figure, only contracts', () => {
    const s = summarizeAssignmentExposure([leg({ right: 'C', qty: -3 })], shares({ AAA: 300 }))
    expect(s.putAssignmentCash).toBe(0)
    expect(s.coveredCallContracts).toBe(3)
    expect(s.nakedCallContracts).toBe(0)
  })

  it('splits a partly-covered call into its covered and naked halves', () => {
    // 150 shares back one contract; the second has nothing behind it.
    const s = summarizeAssignmentExposure([leg({ right: 'C', qty: -2 })], shares({ AAA: 150 }))
    expect(s.coveredCallContracts).toBe(1)
    expect(s.nakedCallContracts).toBe(1)
    expect(s.byAccountSymbol[0]?.callDeliveryShares).toBe(100)
  })

  it('groups by underlying and names the largest obligation', () => {
    const s = summarizeAssignmentExposure([
      leg({ underlying: 'AAA', strike: 50, qty: -1 }),
      leg({ underlying: 'BBB', strike: 400, qty: -1 }),
      leg({ underlying: 'AAA', strike: 60, qty: -1 }),
    ], shares())
    expect(s.byAccountSymbol.map((x) => x.underlying)).toEqual(['BBB', 'AAA'])
    expect(s.largest?.underlying).toBe('BBB')
    expect(s.byAccountSymbol[1]?.putAssignmentCash).toBe(100 * 50 + 100 * 60)
  })

  it('drops legs it cannot price rather than counting them as free', () => {
    const s = summarizeAssignmentExposure([
      leg({ strike: 0 }),
      leg({ strike: Number.NaN }),
      leg({ right: 'X' }),
    ], shares())
    expect(s.byAccountSymbol).toHaveLength(0)
    expect(s.putAssignmentCash).toBe(0)
  })

  it('allocates a symbol’s shares once across all its short calls', () => {
    // Two separate contracts on AAA with 100 shares held: one covered, one naked.
    // Per-leg accounting would let both claim the same 100 shares.
    const s = summarizeAssignmentExposure(
      [leg({ right: 'C', qty: -1 }), leg({ right: 'C', qty: -1, strike: 120 })],
      shares({ AAA: 100 }),
    )
    expect(s.coveredCallContracts).toBe(1)
    expect(s.nakedCallContracts).toBe(1)
  })

  it('reports nothing for an empty book', () => {
    const s = summarizeAssignmentExposure([], shares())
    expect(s.largest).toBeNull()
    expect(s.putAssignmentCash).toBe(0)
  })
})

describe('assignmentCoverRatio', () => {
  it('measures the obligation against what can actually reach it', () => {
    expect(assignmentCoverRatio(500_000, 2_000_000)).toBe(0.25)
    expect(assignmentCoverRatio(2_500_000, 2_000_000)).toBe(1.25)
  })

  it('returns null rather than a comfortable zero when buying power is unknown', () => {
    expect(assignmentCoverRatio(500_000, null)).toBeNull()
    expect(assignmentCoverRatio(500_000, 0)).toBeNull()
  })
})

describe('summarizeAssignmentExposure — accounts', () => {
  it('a call is covered only by shares in its own account', () => {
    // U1 holds 300 AAA; the calls are written in U2, which holds none.
    const s = summarizeAssignmentExposure([leg({ right: 'C', qty: -2, accountId: 'U2' })], shares({ AAA: 300 }))
    expect(s.coveredCallContracts).toBe(0)
    expect(s.nakedCallContracts).toBe(2)
    expect(s.byAccountSymbol[0]).toMatchObject({ accountId: 'U2', underlying: 'AAA', nakedCallContracts: 2 })
  })
  it('the same symbol in two accounts is two rows, each settled on its own shares', () => {
    const s = summarizeAssignmentExposure(
      [leg({ right: 'C', qty: -1, accountId: 'U1' }), leg({ right: 'C', qty: -1, accountId: 'U2' })],
      shares({ AAA: 100, 'U2:AAA': 0 }),
    )
    expect(s.byAccountSymbol.map((r) => [r.accountId, r.coveredCallContracts, r.nakedCallContracts])).toEqual([
      ['U1', 1, 0],
      ['U2', 0, 1],
    ])
  })
})
