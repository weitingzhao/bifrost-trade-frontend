import { describe, expect, it } from 'vitest'
import { ALLOWANCE_SHARE, DECAY_PROFIT_FACTOR, sizeCapFor } from './sizeCap'
import type { PlayStat } from '@/utils/reviewTrades'

function play(p: Partial<PlayStat>): PlayStat {
  return {
    play: 'CSP',
    n: 41,
    wins: 31,
    winRate: 0.76,
    bandLow: 0.61,
    bandHigh: 0.87,
    thin: false,
    creditKept: 0.68,
    avgDaysHeld: 14,
    avgDteAtEntry: 40,
    realised: 7626,
    avgRealised: 186,
    best: 512,
    worst: -840,
    profitFactor: 2.3,
    mae: -312,
    maeWorst: -864,
    ...p,
  }
}

describe('sizeCapFor', () => {
  it('earns the full allowance on a large sample with a healthy profit factor', () => {
    expect(sizeCapFor(play({})).label).toBe('full')
  })

  it('halves the allowance under the sample floor, whatever the win rate looks like', () => {
    const cap = sizeCapFor(play({ n: 11, winRate: 1, bandLow: 0.72, bandHigh: 1 }))
    expect(cap.label).toBe('half')
    expect(cap.why).toContain('28 points wide')
  })

  it('withdraws it entirely below the decay line, even on a large sample', () => {
    const cap = sizeCapFor(play({ n: 60, profitFactor: DECAY_PROFIT_FACTOR - 0.01 }))
    expect(cap.label).toBe('none')
    expect(cap.tone).toBe('danger')
  })

  it('does not punish a play that has never lost for having no profit factor', () => {
    expect(sizeCapFor(play({ n: 40, profitFactor: null })).label).toBe('full')
  })

  it('leaves Compare the whole backing cap, half of it, or none', () => {
    // The allowance as a share, which is how Compare reads it off a
    // structure's record.
    expect([ALLOWANCE_SHARE.full, ALLOWANCE_SHARE.half, ALLOWANCE_SHARE.none]).toEqual([1, 0.5, 0])
  })
})
