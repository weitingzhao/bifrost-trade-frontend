import type {
  OpportunitiesResponse,
  StructuresResponse,
  StrategyInstancesResponse,
  CreateStrategyInstanceBody,
} from '@/types/positions'

const BASE = import.meta.env.VITE_API_STRATEGY as string

export async function fetchOpportunities(): Promise<OpportunitiesResponse> {
  const res = await fetch(`${BASE}/opportunities`)
  if (!res.ok) throw new Error(`Strategy /opportunities: ${res.status}`)
  return res.json() as Promise<OpportunitiesResponse>
}

export async function fetchStructures(): Promise<StructuresResponse> {
  const res = await fetch(`${BASE}/structures`)
  if (!res.ok) throw new Error(`Strategy /structures: ${res.status}`)
  return res.json() as Promise<StructuresResponse>
}

export async function fetchStrategyInstances(
  opportunityId?: number,
): Promise<StrategyInstancesResponse> {
  const params = opportunityId != null ? `?opportunity_id=${opportunityId}` : ''
  const res = await fetch(`${BASE}/instances${params}`)
  if (!res.ok) throw new Error(`Strategy /instances: ${res.status}`)
  return res.json() as Promise<StrategyInstancesResponse>
}

export async function createStrategyInstance(
  body: CreateStrategyInstanceBody,
): Promise<{ ok: boolean; id?: number; error?: string }> {
  const res = await fetch(`${BASE}/instances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST /instances: ${res.status}`)
  return res.json()
}
