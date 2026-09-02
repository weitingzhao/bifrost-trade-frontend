import { describe, expect, it } from 'vitest'
import {
  buildOptionsModeBridgeSummary,
  groupChainRowsByRollDay,
  groupSameDayRollsByUndAndChain,
  rollAdjustment,
  shortOptContractKey,
} from '@/utils/ledger/optionsModeBridge'
import type { ByDayRangeData } from '@/types/trading'
import type { SameDayRollEvent } from '@/utils/ledger/sameDayOptionRolls'

function roll(
  partial: Partial<SameDayRollEvent> & Pick<SameDayRollEvent, 'closeContractKey' | 'openContractKey' | 'dateStr'>,
): SameDayRollEvent {
  return {
    accountId: 'U1',
    underlying: 'RKLB',
    optionRight: 'C',
    qty: 1,
    closeExecutionId: 1,
    openExecutionId: 2,
    cashRoll: 100,
    bookCloseRealized: -50,
    ...partial,
  }
}

describe('buildOptionsModeBridgeSummary', () => {
  it('Economic − Total equals Σ roll adj − Open', () => {
    const byDay: ByDayRangeData = {
      opt: {
        '2026-05-11': { realized: 100, unrealized: 0 },
        '2026-05-12': { realized: 50, unrealized: 0 },
      },
      stock: {},
      stocks: {},
      fixed_income: {},
      cash_like: {},
      stkBucketNotional: { stocks: {}, fixed_income: {}, cash_like: {} },
      economicOptByDay: {
        '2026-05-11': { delta: 100 + 40, rollCount: 1, cashRoll: 10, bookRollRealized: -30 },
        '2026-05-12': { delta: 50, rollCount: 0, cashRoll: 0, bookRollRealized: 0 },
      },
    }
    const rolls: SameDayRollEvent[] = [
      {
        dateStr: '2026-05-11',
        accountId: 'U1',
        underlying: 'RKLB',
        optionRight: 'C',
        qty: 1,
        closeExecutionId: 1,
        openExecutionId: 2,
        closeContractKey: 'A',
        openContractKey: 'B',
        cashRoll: 10,
        bookCloseRealized: -30,
      },
    ]
    const s = buildOptionsModeBridgeSummary({
      byDayRangeData: byDay,
      openUnrealized: 20,
      sameDayRolls: rolls,
    })
    expect(s.bookR).toBeCloseTo(150, 6)
    expect(s.sumRollAdj).toBeCloseTo(40, 6)
    expect(s.economic).toBeCloseTo(190, 6)
    expect(s.total).toBeCloseTo(170, 6)
    expect(s.econMinusTotal).toBeCloseTo(20, 6)
    expect(s.econMinusTotal).toBeCloseTo(s.sumRollAdj - s.open, 6)
  })
})

describe('shortOptContractKey', () => {
  it('formats pipe contract keys', () => {
    expect(shortOptContractKey('RKLB  260515C00090000|OPT|20260515|90.0|C')).toBe(
      'RKLB 90.0C 20260515',
    )
  })
})

describe('groupSameDayRollsByUndAndChain', () => {
  it('links sequential close→open into one chain and keeps separate trees apart', () => {
    const a = 'RKLB|OPT|20260515|90|C'
    const b = 'RKLB|OPT|20260918|105|C'
    const c = 'RKLB|OPT|20261218|125|C'
    const x = 'RKLB|OPT|20260618|110|C'
    const y = 'RKLB|OPT|20260821|120|C'
    const groups = groupSameDayRollsByUndAndChain([
      roll({ dateStr: '2026-05-11', closeContractKey: a, openContractKey: b, closeExecutionId: 1, openExecutionId: 2 }),
      roll({ dateStr: '2026-06-05', closeContractKey: b, openContractKey: c, closeExecutionId: 3, openExecutionId: 4 }),
      roll({ dateStr: '2026-05-29', closeContractKey: x, openContractKey: y, closeExecutionId: 5, openExecutionId: 6 }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]!.underlying).toBe('RKLB')
    expect(groups[0]!.chains).toHaveLength(2)
    const paths = groups[0]!.chains.map((ch) => ch.pathLabel)
    expect(paths.some((p) => p.includes('90C') && p.includes('105C') && p.includes('125C'))).toBe(true)
    expect(paths.some((p) => p.includes('110C') && p.includes('120C'))).toBe(true)
  })

  it('does not link Call and Put into the same chain', () => {
    const callA = 'RKLB|OPT|20260515|90|C'
    const callB = 'RKLB|OPT|20260918|105|C'
    const putA = 'RKLB|OPT|20260515|90|P'
    const putB = 'RKLB|OPT|20260918|105|P'
    const groups = groupSameDayRollsByUndAndChain([
      roll({
        dateStr: '2026-05-11',
        optionRight: 'C',
        closeContractKey: callA,
        openContractKey: callB,
      }),
      roll({
        dateStr: '2026-05-11',
        optionRight: 'P',
        closeContractKey: putA,
        openContractKey: putB,
        closeExecutionId: 10,
        openExecutionId: 11,
      }),
    ])
    expect(groups[0]!.chains).toHaveLength(2)
  })
})

describe('groupChainRowsByRollDay', () => {
  it('aggregates same-day fills into a cash statement', () => {
    const a = 'RKLB|OPT|20260515|90|C'
    const b = 'RKLB|OPT|20260918|105|C'
    const rows = [
      roll({ dateStr: '2026-05-11', closeContractKey: a, openContractKey: b, qty: 8, cashRoll: 3000, bookCloseRealized: -20000, closeExecutionId: 1, openExecutionId: 2 }),
      roll({ dateStr: '2026-05-11', closeContractKey: a, openContractKey: b, qty: 7, cashRoll: 2800, bookCloseRealized: -17000, closeExecutionId: 3, openExecutionId: 4 }),
      roll({ dateStr: '2026-06-05', closeContractKey: b, openContractKey: 'RKLB|OPT|20261218|125|C', qty: 1, cashRoll: 100, bookCloseRealized: 50, closeExecutionId: 5, openExecutionId: 6 }),
    ].map((r) => ({ ...r, adj: rollAdjustment(r) }))
    const days = groupChainRowsByRollDay(rows)
    expect(days).toHaveLength(2)
    expect(days[0]!.dateStr).toBe('2026-05-11')
    expect(days[0]!.cashRoll).toBeCloseTo(5800, 6)
    expect(days[0]!.bookClose).toBeCloseTo(-37000, 6)
    expect(days[0]!.fills).toBe(2)
    expect(days[0]!.steps).toHaveLength(1)
  })
})
