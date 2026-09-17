import { describe, expect, it } from 'vitest'
import { scopeStrategyBuckets, unlinkedOpportunityCount } from './ledgerStrategyScope'

const opp = (opportunityId: number | 'none') => ({ opportunityId })

describe('strategy scope', () => {
  const buckets = [
    { key: 'struct:A', groups: [opp(7), opp('none')] },
    { key: 'struct:B', groups: [opp(8)] },
  ]

  it('All leaves every bucket as it was', () => {
    expect(scopeStrategyBuckets(buckets, 'all')).toBe(buckets)
  })

  it('No opportunity keeps the unfiled group and drops buckets left empty', () => {
    const scoped = scopeStrategyBuckets(buckets, 'unlinked')
    expect(scoped.map(b => b.key)).toEqual(['struct:A'])
    expect(scoped[0].groups).toEqual([opp('none')])
  })

  it('counts the unfiled group', () => {
    expect(unlinkedOpportunityCount(buckets.flatMap(b => b.groups))).toBe(1)
    expect(unlinkedOpportunityCount([opp(1)])).toBe(0)
  })
})
