import type { ChainData } from './rulesChain'

/** Title, opportunity and structure — what the face heads itself with. */
export function instanceFaceOf(data: ChainData, id: number) {
  const reading = data.instances.find((r) => r.id === id)
  const opp = reading ? data.opportunities.find((o) => o.strategy_opportunity_id === reading.opportunityId) : undefined
  return {
    title: `#${id}${reading ? ` · ${reading.symbolish}` : ''}`,
    opportunity: opp?.name ?? reading?.opportunityName ?? '—',
    structure: opp?.structure_name ?? reading?.structureName ?? '—',
  }
}
