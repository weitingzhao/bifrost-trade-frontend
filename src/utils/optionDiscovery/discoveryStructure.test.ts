import { describe, expect, it } from 'vitest'
import {
  buildStructureLegs,
  premiumOf,
  structureTitle,
  wingStrike,
} from './discoveryStructure'
import type { OptionSnapshotRow } from '@/types/optionDiscovery'

const row: OptionSnapshotRow = {
  strike: 245,
  right: 'P',
  mid: 3.5,
  underlying_ticker: 'NVDA',
}

describe('discoveryStructure', () => {
  it('reads mid as premium', () => {
    expect(premiumOf(row)).toBe(3.5)
  })

  it('builds a short single put', () => {
    const { legs, coveredShares } = buildStructureLegs({
      row,
      kind: 'single',
      side: 'short',
      spot: 250,
    })
    expect(legs).toEqual([{ strike: 245, right: 'P', qty: -1, avg_cost: 3.5 }])
    expect(coveredShares).toBe(0)
  })

  it('builds a credit put vertical with a lower wing', () => {
    const { legs, wing } = buildStructureLegs({
      row,
      kind: 'vertical',
      side: 'short',
      spot: 250,
      stepHint: 5,
      wingMid: 1.2,
    })
    expect(wing).toBe(240)
    expect(legs.map((l) => l.qty)).toEqual([-1, 1])
    expect(structureTitle('vertical', 'short', row, wing)).toContain('Credit put vertical')
  })

  it('covered call shorts the call and covers 100 shares', () => {
    const call = { ...row, right: 'C' as const }
    const { legs, coveredShares } = buildStructureLegs({
      row: call,
      kind: 'covered',
      side: 'short',
      spot: 250,
    })
    expect(legs[0].qty).toBe(-1)
    expect(coveredShares).toBe(100)
  })

  it('wingStrike steps away from the selected strike', () => {
    expect(wingStrike(row, 250, 5)).toBe(240)
  })
})
