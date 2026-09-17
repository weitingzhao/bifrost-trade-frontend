import type { StratOppGroup, StrategyScope } from './ledgerTypes'

type OppRef = Pick<StratOppGroup, 'opportunityId'>

/** How many opportunity groups hold fills filed under no opportunity (0 or 1: they share one group). */
export function unlinkedOpportunityCount(groups: OppRef[]): number {
  return groups.filter(og => og.opportunityId === 'none').length
}

/** Scope "No opportunity" keeps only the fills filed under none, and drops buckets left empty. */
export function scopeStrategyBuckets<G extends OppRef, B extends { groups: G[] }>(
  buckets: B[],
  scope: StrategyScope,
): B[] {
  if (scope === 'all') return buckets
  return buckets
    .map(b => ({ ...b, groups: b.groups.filter(og => og.opportunityId === 'none') }))
    .filter(b => b.groups.length > 0)
}
