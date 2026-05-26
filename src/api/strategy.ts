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
  StrategyTemplatesResponse,
  StrategyTemplateDetail,
  StructureTypeLegPayload,
  MetaParamPayload,
  StructureTypeConfigOption,
  AllocationsResponse,
  StrategyAllocation,
  AllocationPayload,
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
  accountId?: string
}): Promise<StrategyInstancesResponse> {
  const sp = new URLSearchParams()
  if (params?.opportunityId != null) sp.set('opportunity_id', String(params.opportunityId))
  if (params?.accountId) sp.set('account_id', params.accountId)
  const qs = sp.toString()
  const res = await fetch(`${BASE}/strategies/instances${qs ? `?${qs}` : ''}`)
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

// ── Template API ─────────────────────────────────────────────────────────────

export async function fetchTemplates(activeOnly = true): Promise<StrategyTemplatesResponse> {
  const qs = activeOnly ? '?active_only=true' : ''
  const res = await fetch(`${BASE}/strategies/templates${qs}`)
  if (!res.ok) throw new Error(`Strategy /templates: ${res.status}`)
  return res.json() as Promise<StrategyTemplatesResponse>
}

export async function fetchTemplateDetail(id: number): Promise<StrategyTemplateDetail> {
  const res = await fetch(`${BASE}/strategies/templates/${id}`)
  if (!res.ok) throw new Error(`Strategy /templates/${id}: ${res.status}`)
  return res.json() as Promise<StrategyTemplateDetail>
}

export async function createTemplate(
  payload: Record<string, unknown>,
): Promise<{ strategy_template_id: number }> {
  const res = await fetch(`${BASE}/strategies/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`POST /strategies/templates: ${res.status}`)
  return res.json()
}

export async function updateTemplate(
  id: number,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/strategies/templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`PUT /strategies/templates/${id}: ${res.status}`)
  return res.json()
}

export async function deleteTemplate(id: number): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/strategies/templates/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE /strategies/templates/${id}: ${res.status}`)
  return res.json()
}

export async function replaceTemplateLegs(
  id: number,
  legs: StructureTypeLegPayload[],
): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/strategies/templates/${id}/legs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ legs }),
  })
  if (!res.ok) throw new Error(`PUT /strategies/templates/${id}/legs: ${res.status}`)
  return res.json()
}

export async function replaceTemplateParams(
  id: number,
  items: MetaParamPayload[],
): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/strategies/templates/${id}/params`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  if (!res.ok) throw new Error(`PUT /strategies/templates/${id}/params: ${res.status}`)
  return res.json()
}

export async function replaceTemplateCharacteristics(
  id: number,
  items: string[],
): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/strategies/templates/${id}/characteristics`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  if (!res.ok) throw new Error(`PUT /strategies/templates/${id}/characteristics: ${res.status}`)
  return res.json()
}

export async function createDim(
  dimType: string,
  body: { code: string; display_label: string; sort_order: number },
): Promise<{ strategy_dim_id: number }> {
  const res = await fetch(`${BASE}/strategies/dims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dim_type: dimType, ...body }),
  })
  if (!res.ok) throw new Error(`POST /strategies/dims: ${res.status}`)
  return res.json()
}

export async function deleteDim(id: number): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/strategies/dims/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE /strategies/dims/${id}: ${res.status}`)
  return res.json()
}

async function fetchConfigOptions(path: string): Promise<{ options: StructureTypeConfigOption[] }> {
  const res = await fetch(`${BASE}/strategies/templates/options/${path}`)
  if (!res.ok) throw new Error(`Strategy /templates/options/${path}: ${res.status}`)
  return res.json()
}

export function fetchParamKindOptions() { return fetchConfigOptions('param-kinds') }
export function fetchLegRoleOptions() { return fetchConfigOptions('leg-roles') }
export function fetchLegDirectionOptions() { return fetchConfigOptions('leg-directions') }
export function fetchLegOptionRightOptions() { return fetchConfigOptions('leg-option-rights') }
export function fetchMetaKeyOptions() { return fetchConfigOptions('meta-keys') }

export async function fetchMetaValueOptions(
  templateCode: string,
  metaKey: string,
): Promise<{ options: StructureTypeConfigOption[] }> {
  const res = await fetch(
    `${BASE}/strategies/templates/options/meta-values?template_code=${encodeURIComponent(templateCode)}&meta_key=${encodeURIComponent(metaKey)}`,
  )
  if (!res.ok) return { options: [] }
  return res.json()
}

// ── Allocations ───────────────────────────────────────────────────────────────

const MONITOR_BASE = import.meta.env.VITE_API_MONITOR as string

export async function fetchAllocations(activeOnly = false): Promise<AllocationsResponse> {
  const qs = `?active_only=${activeOnly}`
  const res = await fetch(`${BASE}/strategies/allocations${qs}`)
  if (!res.ok) throw new Error(`GET /strategies/allocations: ${res.status}`)
  return res.json() as Promise<AllocationsResponse>
}

export async function fetchAllocation(id: number): Promise<StrategyAllocation> {
  const res = await fetch(`${BASE}/strategies/allocations/${id}`)
  if (!res.ok) throw new Error(`GET /strategies/allocations/${id}: ${res.status}`)
  return res.json() as Promise<StrategyAllocation>
}

export async function createAllocation(
  payload: AllocationPayload,
): Promise<{ strategy_allocation_id: number }> {
  const res = await fetch(`${BASE}/strategies/allocations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((j as { detail?: string }).detail ?? String(res.status))
  return j as { strategy_allocation_id: number }
}

export async function updateAllocation(
  id: number,
  payload: Partial<AllocationPayload>,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/strategies/allocations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((j as { detail?: string }).detail ?? String(res.status))
  return j as { ok: boolean }
}

export async function setActiveAllocation(
  allocationId: number | null,
  opts?: { structureId?: number | null; gateSafetyId?: number | null },
): Promise<{ ok: boolean }> {
  const res = await fetch(`${MONITOR_BASE}/config/active-strategy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      active_strategy_structure_id: opts?.structureId ?? null,
      active_gate_safety_strategy_id: opts?.gateSafetyId ?? null,
      active_strategy_allocation_id: allocationId,
    }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((j as { detail?: string }).detail ?? String(res.status))
  return j as { ok: boolean }
}
