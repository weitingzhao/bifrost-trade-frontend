import type {
  OpportunitiesResponse,
  StructuresResponse,
  StrategyInstancesResponse,
  StrategyOpportunityDetail,
  CreateStrategyInstanceBody,
  PatchStrategyInstanceBody,
  CreateOpportunityBody,
  GateSafetyResponse,
  GateSafetyFull,
  GateSafetyPayload,
  DimsGroupedResponse,
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

export async function fetchOpportunityDetail(id: number): Promise<StrategyOpportunityDetail> {
  const res = await fetch(`${BASE}/strategies/opportunities/${id}`)
  if (!res.ok) throw new Error(`Strategy /opportunities/${id}: ${res.status}`)
  return res.json() as Promise<StrategyOpportunityDetail>
}

export async function createOpportunity(
  body: CreateOpportunityBody,
): Promise<{ strategy_opportunity_id: number }> {
  const res = await fetch(`${BASE}/strategies/opportunities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST /strategies/opportunities: ${res.status}`)
  return res.json()
}

export async function putOpportunity(
  id: number,
  body: Partial<CreateOpportunityBody>,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/strategies/opportunities/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT /strategies/opportunities/${id}: ${res.status}`)
  return res.json()
}

export async function fetchGateSafety(): Promise<GateSafetyResponse> {
  const res = await fetch(`${BASE}/strategies/gate-safety`)
  if (!res.ok) throw new Error(`Strategy /gate-safety: ${res.status}`)
  return res.json() as Promise<GateSafetyResponse>
}

export async function putStructure(
  id: number,
  body: { is_active: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/strategies/structures/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT /strategies/structures/${id}: ${res.status}`)
  return res.json()
}

export async function fetchGateSafetyFull(id: number): Promise<GateSafetyFull> {
  const res = await fetch(`${BASE}/strategies/gate-safety/${id}`)
  if (!res.ok) throw new Error(`Strategy /gate-safety/${id}: ${res.status}`)
  return res.json() as Promise<GateSafetyFull>
}

export async function createGateSafety(
  payload: GateSafetyPayload,
): Promise<{ ok: boolean; gate_safety_strategy_id?: number; error?: string }> {
  const res = await fetch(`${BASE}/strategies/gate-safety`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`POST /strategies/gate-safety: ${res.status}`)
  return res.json()
}

export async function updateGateSafety(
  id: number,
  payload: GateSafetyPayload,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/strategies/gate-safety/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`PUT /strategies/gate-safety/${id}: ${res.status}`)
  return res.json()
}

export async function fetchDimsGrouped(): Promise<DimsGroupedResponse> {
  const res = await fetch(`${BASE}/strategies/dims`)
  if (!res.ok) throw new Error(`Strategy /dims: ${res.status}`)
  return res.json() as Promise<DimsGroupedResponse>
}
