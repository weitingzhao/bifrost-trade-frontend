import { describe, expect, it } from 'vitest'
import {
  allRows,
  blindSpots,
  countByUrgency,
  segmentViews,
  sessionSegment,
  type HomeCheck,
} from './todayModel'

/** Invented checks — the three outcomes a check can have, one of each. */
const checks: HomeCheck[] = [
  {
    key: 'expiring',
    seg: 'pre',
    layer: 'trade',
    question: 'Is anything expiring today?',
    to: '/trade/expiration',
    cannotRun: null,
    rows: [
      {
        key: 'expiring:1',
        seg: 'pre',
        urg: 'today',
        layer: 'trade',
        what: '1 leg expires today',
        why: 'Decide assign, close or roll.',
        to: '/trade/expiration',
      },
      {
        key: 'expiring:2',
        seg: 'pre',
        urg: 'now',
        layer: 'trade',
        what: 'One of them is through its strike',
        why: 'Spot is past the strike with hours left.',
        to: '/trade/expiration',
      },
    ],
  },
  {
    key: 'capital',
    seg: 'pre',
    layer: 'risk',
    question: 'Did buying power move overnight?',
    to: '/risk/margin',
    cannotRun: 'nothing stores yesterday’s buying power, so the change cannot be taken',
    rows: [],
  },
  {
    key: 'limits',
    seg: 'rth',
    layer: 'risk',
    question: 'Is any limit breached?',
    to: '/risk/limits',
    cannotRun: null,
    rows: [],
  },
]

describe('segmentViews', () => {
  it('keeps a clean answer and an unaskable question apart', () => {
    const [pre, rth, close] = segmentViews(checks, 'rth')

    // Asked and answered no — the page may say so.
    expect(rth.clean.map((c) => c.key)).toEqual(['limits'])
    expect(rth.blind).toEqual([])

    // Never asked. Counting it as clean would turn "we cannot see it" into
    // "there is nothing there", which is the one claim this page must not make.
    expect(pre.blind.map((c) => c.key)).toEqual(['capital'])
    expect(pre.clean).toEqual([])

    // A segment with no checks at all is neither clean nor blind.
    expect(close.rows).toEqual([])
    expect(close.clean).toEqual([])
    expect(close.blind).toEqual([])
  })

  it('puts the most urgent row first and marks the segment the clock is in', () => {
    const [pre, rth] = segmentViews(checks, 'rth')
    expect(pre.rows.map((r) => r.urg)).toEqual(['now', 'today'])
    expect(pre.isNow).toBe(false)
    expect(rth.isNow).toBe(true)
  })
})

describe('sessionSegment', () => {
  it('splits the day at the open and at the last half hour', () => {
    expect(sessionSegment('04:12')).toBe('pre')
    expect(sessionSegment('09:29')).toBe('pre')
    expect(sessionSegment('09:30')).toBe('rth')
    expect(sessionSegment('15:29')).toBe('rth')
    expect(sessionSegment('15:30')).toBe('close')
    expect(sessionSegment('20:00')).toBe('close')
  })
})

describe('counts', () => {
  it('counts what is due by urgency and lists what nothing can ask', () => {
    expect(countByUrgency(allRows(checks))).toEqual({ now: 1, soon: 0, today: 1 })
    expect(blindSpots(checks).map((c) => c.key)).toEqual(['capital'])
    // A blind check never contributes a row, so it cannot inflate the header.
    expect(allRows(checks).some((r) => r.key.startsWith('capital'))).toBe(false)
  })
})
