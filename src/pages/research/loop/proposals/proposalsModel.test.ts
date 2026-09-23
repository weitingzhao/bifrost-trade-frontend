import { describe, expect, it } from 'vitest'
import { buildProposals, proposalChain } from './proposalsModel'
import type { HabitReading } from '@/utils/reviewHabits'
import type { ReviewTrade } from '@/utils/reviewTrades'

function habit(p: Partial<HabitReading> & { key: string }): HabitReading {
  return {
    label: p.key,
    unit: '',
    value: null,
    n: 0,
    stat: 'mean',
    ci: null,
    ciLabel: '',
    read: 'read',
    consequence: null,
    consequenceLabel: '',
    dots: [],
    reference: null,
    unmeasured: null,
    kind: 'count',
    ...p,
  }
}

const TRADES = [
  { contractKey: 'A', label: 'AAA 18DEC26 90C', realised: 500 },
  { contractKey: 'B', label: 'BBB 18DEC26 90C', realised: 100 },
] as unknown as ReviewTrade[]

const PATHS = new Map([
  ['A', { best: 900 }],
  ['B', { best: 120 }],
])

const MEASURED: HabitReading[] = [
  habit({
    key: 'disposition',
    value: 0.7,
    n: 2,
    consequence: -420,
    read: 'Half of the 2 winners landed 70%.',
    dots: [
      { key: 'A', value: 0.55, realised: 500 },
      { key: 'B', value: 0.83, realised: 100 },
    ],
  }),
  habit({ key: 'cut_latency', value: 3, n: 2, dots: [{ key: 'A', value: 3, realised: -100 }] }),
  habit({ key: 'ivr_entry' }),
  habit({ key: 'capture' }),
]

describe('buildProposals', () => {
  it('argues the one proposal whose habit carries both a sample and a cost', () => {
    const ps = buildProposals(MEASURED, TRADES, PATHS)
    const argued = ps.filter((p) => p.state === 'argued')
    expect(argued.map((p) => p.key)).toEqual(['hard_exit'])
    expect(argued[0].effect).toBe(-420)
    expect(argued[0].n).toBe(2)
    expect(argued[0].blockedBy).toBeNull()
  })

  it('cites the trades that contribute most, worst first', () => {
    const p = buildProposals(MEASURED, TRADES, PATHS).find((x) => x.key === 'hard_exit')!
    // A left 900 − 500 = 400; B left 120 − 100 = 20.
    expect(p.cites.map((c) => c.contractKey)).toEqual(['A', 'B'])
    expect(p.cites[0].amount).toBe(400)
    expect(p.cites[0].label).toBe('AAA 18DEC26 90C')
  })

  it('separates a habit with no cost from one with no habit at all', () => {
    const ps = buildProposals(MEASURED, TRADES, PATHS)
    expect(ps.find((p) => p.key === 'stop_latency')!.state).toBe('no-cost')
    expect(ps.find((p) => p.key === 'ivr_floor')!.state).toBe('no-habit')
    expect(ps.find((p) => p.key === 'retarget')!.state).toBe('no-habit')
  })

  it('never writes a before line, whatever the state', () => {
    for (const p of buildProposals(MEASURED, TRADES, PATHS)) {
      expect(p.beforeText).toBe('n/c — rule text not on file')
      expect(p.after.length).toBeGreaterThan(0)
    }
  })

  it('argues nothing when no path has loaded', () => {
    const none = [habit({ key: 'disposition' }), habit({ key: 'cut_latency' })]
    expect(buildProposals(none, TRADES, new Map()).every((p) => p.state !== 'argued')).toBe(true)
  })
})

describe('proposalChain', () => {
  it('moves the break to the third link once a habit carries a cost', () => {
    const chain = proposalChain(MEASURED, buildProposals(MEASURED, TRADES, PATHS))
    expect(chain.find((c) => c.key === 'habit')!.state).toBe('partial')
    expect(chain.find((c) => c.key === 'cost')!.state).toBe('partial')
    expect(chain.find((c) => c.key === 'proposal')!.state).toBe('missing')
  })

  it('puts the break back at the cost when nothing carries one', () => {
    const none = [habit({ key: 'disposition', value: 0.5, n: 4 })]
    const chain = proposalChain(none, buildProposals(none, TRADES, PATHS))
    expect(chain.find((c) => c.key === 'cost')!.state).toBe('missing')
  })
})

// The state the page used to skip. While the daily marks are in flight the
// give-back habit has no consequence yet, and reading that as `no-habit` made
// the strongest negative claim the page has — about a habit it was in the
// middle of measuring, which reads `argued` once the bars land.
describe('proposals while the marks are still being read', () => {
  const inFlight: HabitReading[] = [
    habit({ key: 'disposition', measuring: true }),
    habit({ key: 'cut_latency', measuring: true }),
  ]

  it('says measuring, not no-habit', () => {
    const byKey = new Map(buildProposals(inFlight, TRADES, PATHS).map((p) => [p.key, p]))
    expect(byKey.get('hard_exit')?.state).toBe('measuring')
    expect(byKey.get('stop_latency')?.state).toBe('measuring')
  })

  it('blocks on nothing while it is still reading', () => {
    const p = buildProposals(inFlight, TRADES, PATHS).find((x) => x.key === 'hard_exit')!
    expect(p.blockedBy).toBeNull()
  })

  it('withholds the chain counts rather than printing a number that will change', () => {
    const chain = proposalChain(inFlight, buildProposals(inFlight, TRADES, PATHS))
    const proposal = chain.find((c) => c.key === 'proposal')!
    expect(proposal.note).not.toMatch(/^\d+ of \d+ has evidence/)
    expect(chain.find((c) => c.key === 'cost')!.note).toMatch(/not known yet/)
  })

  it('still reaches argued once the same habit has its reading', () => {
    const p = buildProposals(MEASURED, TRADES, PATHS).find((x) => x.key === 'hard_exit')!
    expect(p.state).toBe('argued')
  })
})
