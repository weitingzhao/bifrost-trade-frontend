import { describe, expect, it } from 'vitest'
import type { LimitRow } from '@/utils/limitsModel'
import {
  LIMIT_GROUP_STRIPE,
  RISK_BAR_CEILING,
  RISK_NEAR_LINE,
  bindsNext,
  breachDetail,
  breachTone,
  capLabel,
  lineTone,
  spentLines,
  unranked,
} from './riskOverviewModel'

// Invented rules, not a copy of the book — the shape is what is under test.
const row = (over: Partial<LimitRow> = {}): LimitRow => ({
  key: 'k',
  group: 'Concentration',
  name: 'A rule',
  kind: 'hard',
  scope: 'per underlying',
  unit: 'pct',
  current: 0.5,
  limit: 1,
  bound: 'ceiling',
  onBreach: 'block adds',
  citedFrom: null,
  noReading: null,
  use: 0.5,
  breached: false,
  headroom: 0.5,
  ...over,
})

describe('spentLines', () => {
  it('keeps only the lines with both halves, worst first', () => {
    const out = spentLines([
      row({ key: 'a', use: 0.4 }),
      row({ key: 'b', use: null, limit: null }),
      row({ key: 'c', use: 1.2, breached: true }),
    ])
    expect(out.map((r) => r.key)).toEqual(['c', 'a'])
  })

  it('fills the track by the ceiling, so a breach still has room to grow', () => {
    const [a] = spentLines([row({ use: 1 })])
    expect(a.fill).toBeCloseTo(1 / RISK_BAR_CEILING)
    // Past the ceiling the bar stops rather than overflowing its track.
    expect(spentLines([row({ use: 9 })])[0].fill).toBe(1)
  })
})

describe('bindsNext', () => {
  it('is the worst line not yet crossed', () => {
    const lines = spentLines([
      row({ key: 'over', use: 1.2, breached: true }),
      row({ key: 'next', use: 0.95 }),
      row({ key: 'far', use: 0.1 }),
    ])
    expect(bindsNext(lines)?.key).toBe('next')
  })

  it('is null when every ranked line is already crossed — a different answer from "none is close"', () => {
    expect(bindsNext(spentLines([row({ use: 1.2, breached: true })]))).toBeNull()
  })
})

describe('lineTone', () => {
  it('turns amber at the design’s threshold and red at the line', () => {
    expect(lineTone(0.89)).toBe('plain')
    expect(lineTone(RISK_NEAR_LINE)).toBe('near')
    expect(lineTone(1)).toBe('over')
  })
})

describe('capLabel', () => {
  it('says floor when the line is one, because 10% may not be read as a ceiling', () => {
    expect(capLabel(row({ limit: 0.1, bound: 'floor' }))).toBe('floor 10%')
    expect(capLabel(row({ limit: 0.35 }))).toBe('35%')
  })

  it('prints a dash, never a zero, when no line was written', () => {
    expect(capLabel(row({ limit: null }))).toBe('—')
  })
})

describe('breachDetail', () => {
  it('reads as one sentence: what it is, what it may not cross, where', () => {
    expect(breachDetail(row({ current: 0.37, limit: 0.35 }))).toBe(
      '37% against 35% · per underlying',
    )
  })
})

describe('breachTone', () => {
  it('is red only when something that blocks is crossed', () => {
    expect(breachTone([])).toBeNull()
    expect(breachTone([row({ kind: 'soft' }), row({ kind: 'gate' })])).toBe('near')
    expect(breachTone([row({ kind: 'soft' }), row({ kind: 'hard' })])).toBe('over')
  })
})

describe('unranked', () => {
  it('separates the two ways a rule falls off the ruler', () => {
    const out = unranked([
      row({ key: 'noline', limit: null, use: null }),
      row({ key: 'noread', current: null, use: null }),
      row({ key: 'ranked' }),
    ])
    expect(out.noLine.map((r) => r.key)).toEqual(['noline'])
    expect(out.noReading.map((r) => r.key)).toEqual(['noread'])
  })
})

describe('LIMIT_GROUP_STRIPE', () => {
  it('gives every family its own colour, so the stripe means family and not severity', () => {
    const v = Object.values(LIMIT_GROUP_STRIPE)
    expect(new Set(v).size).toBe(v.length)
  })
})
