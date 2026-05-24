import type {
  OpportunitiesResponse,
  StructuresResponse,
  StrategyInstancesResponse,
  CreateStrategyInstanceBody,
  PatchStrategyInstanceBody,
} from '@/types/positions'

const BASE = import.meta.env.VITE_API_STRATEGY as string

export async function fetchOpportunities(): Promise<OpportunitiesResponse> {
  const res = await fetch(`${BASE}/strategies/opportunities`)
  if (!res.ok) throw new Error(`Strategy /opportunities: ${res.status}`)
  return res.json() as Promise<OpportunitiesResponse>
}

export async function fetchStructures(): Promise<StructuresResponse> {
  const res = await fetch(`${BASE}/strategies/structures`)
  if (!res.ok) throw new Error(`Strategy /structures: ${res.status}`)
  return res.json() as Promise<StructuresResponse>
}

export async function fetchStrategyInstances(params?: {
  opportunityId?: number
}): Promise<StrategyInstancesResponse> {
  const qs = params?.opportunityId != null
    ? `?opportunity_id=${params.opportunityId}`
    : ''
  const res = await fetch(`${BASE}/strategies/instances${qs}`)
  if (!res.ok) throw new Error(`Strategy /instances: ${res.status}`)
  return res.json() as Promise<StrategyInstancesResponse>
}

export async function createStrategyInstance(
  body: CreateStrategyInstanceBody,
): Promise<{ ok: boolean; strategy_instance_id?: number; error?: string }> {
  const res = await fetch(`${BASE}/strategies/instances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST /strategies/instances: ${res.status}`)
  return res.json()
}

export async function patchStrategyInstance(
  id: number,
  body: PatchStrategyInstanceBody,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/strategies/instances/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH /strategies/instances/${id}: ${res.status}`)
  return res.json()
}

export async function deleteStrategyInstance(
  id: number,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/strategies/instances/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`DELETE /strategies/instances/${id}: ${res.status}`)
  return res.json()
}
