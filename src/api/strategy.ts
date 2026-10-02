import type {
  OpportunitiesResponse,
  StructuresResponse,
  StructurePayload,
  StrategyInstancesResponse,
  StrategyInstance,
  StrategyStructure,
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
  TemplateLegPayload,
  MetaParamPayload,
  TemplateConfigOption,
  AllocationsResponse,
  StrategyAllocation,
  AllocationPayload,
  WinRateResponse,
} from '@/types/positions'
import { withValidation } from '@/lib/apiValidation'
import {
  GateSafetyDefaultsResponseSchema,
  StrategyInstancesResponseSchema,
  StrategyInstanceDetailSchema,
} from '@/lib/schemas/strategy'
import type { GateSafetyDefaultsResponse } from '@/types/strategy'
import { monitorUrl, strategyUrl } from '@/lib/devApiUrl'
import { tradeFetch } from '@/lib/tradeFetch'
import { requestJson } from '@/lib/http'


const validateInstances = withValidation<StrategyInstancesResponse>(StrategyInstancesResponseSchema, 'strategy/instances')
const validateInstance = withValidation<StrategyInstance>(StrategyInstanceDetailSchema, 'strategy/instances/:id')

/** List page needs inactive rows too — Legacy calls with active_only=false. */
export async function fetchOpportunities(activeOnly = false): Promise<OpportunitiesResponse> {
  const qs = new URLSearchParams({ active_only: String(activeOnly) })
  const res = await tradeFetch(strategyUrl(`/strategies/opportunities?${qs}`))
  if (!res.ok) throw new Error(`Strategy /opportunities: ${res.status}`)
  return res.json() as Promise<OpportunitiesResponse>
}

export async function fetchStructures(activeOnly = false): Promise<StructuresResponse> {
  const qs = `?active_only=${activeOnly}`
  const res = await tradeFetch(strategyUrl(`/strategies/structures${qs}`))
  if (!res.ok) throw new Error(`Strategy /structures: ${res.status}`)
  return res.json() as Promise<StructuresResponse>
}

export async function fetchStructure(id: number): Promise<StrategyStructure> {
  const res = await tradeFetch(strategyUrl(`/strategies/structures/${id}`))
  if (!res.ok) throw new Error(`Strategy /structures/${id}: ${res.status}`)
  return res.json() as Promise<StrategyStructure>
}

export async function createStructure(
  payload: StructurePayload,
): Promise<{ strategy_structure_id: number }> {
  const res = await tradeFetch(strategyUrl('/strategies/structures'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((j as { detail?: string }).detail ?? `POST /structures: ${res.status}`)
  return j as { strategy_structure_id: number }
}

export async function updateStructure(
  id: number,
  payload: StructurePayload,
): Promise<{ ok: boolean }> {
  const res = await tradeFetch(strategyUrl(`/strategies/structures/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((j as { detail?: string }).detail ?? `PUT /structures/${id}: ${res.status}`)
  return j as { ok: boolean }
}

export async function fetchStrategyInstances(params?: {
  opportunityId?: number
  accountId?: string
  /** Unix seconds; the plan's `intended_at` when looking for the fill it caused. */
  openedAtFrom?: number
}): Promise<StrategyInstancesResponse> {
  const sp = new URLSearchParams()
  if (params?.opportunityId != null) {
    sp.set('strategy_opportunity_id', String(params.opportunityId))
  }
  if (params?.accountId) sp.set('account_id', params.accountId)
  if (params?.openedAtFrom != null) sp.set('opened_at_from', String(params.openedAtFrom))
  const qs = sp.toString()
  const res = await tradeFetch(strategyUrl(`/strategies/instances${qs ? `?${qs}` : ''}`))
  if (!res.ok) throw new Error(`Strategy /instances: ${res.status}`)
  return validateInstances(await res.json())
}

export async function fetchStrategyInstance(id: number): Promise<StrategyInstance> {
  const res = await tradeFetch(strategyUrl(`/strategies/instances/${id}`))
  if (!res.ok) throw new Error(`Strategy /instances/${id}: ${res.status}`)
  return validateInstance(await res.json())
}

/** Legacy Strategy API returns `{ strategy_instance_id }` on success (no `ok` field). */
export async function createStrategyInstance(
  body: CreateStrategyInstanceBody,
): Promise<{ strategy_instance_id: number }> {
  const res = await tradeFetch(strategyUrl('/strategies/instances'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = (await res.json().catch(() => ({}))) as {
    strategy_instance_id?: number
    detail?: string | { msg?: string }[]
    error?: string
  }
  if (!res.ok) {
    const detail = j.detail
    const detailMsg =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail) && detail[0] && typeof detail[0] === 'object' && 'msg' in detail[0]
          ? String(detail[0].msg)
          : undefined
    throw new Error(detailMsg ?? j.error ?? `POST /strategies/instances: ${res.status}`)
  }
  const id = j.strategy_instance_id
  if (id == null || !Number.isFinite(Number(id))) {
    throw new Error(j.error ?? 'Failed to create strategy instance')
  }
  return { strategy_instance_id: Number(id) }
}

export async function patchStrategyInstance(
  id: number,
  body: PatchStrategyInstanceBody,
): Promise<{ ok: boolean; error?: string }> {
  const res = await tradeFetch(strategyUrl(`/strategies/instances/${id}`), {
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
  const res = await tradeFetch(strategyUrl(`/strategies/instances/${id}`), {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`DELETE /strategies/instances/${id}: ${res.status}`)
  return res.json()
}

export async function fetchOpportunityDetail(id: number): Promise<StrategyOpportunityDetail> {
  const res = await tradeFetch(strategyUrl(`/strategies/opportunities/${id}`))
  if (!res.ok) throw new Error(`Strategy /opportunities/${id}: ${res.status}`)
  return res.json() as Promise<StrategyOpportunityDetail>
}

export async function createOpportunity(
  body: CreateOpportunityBody,
): Promise<{ strategy_opportunity_id: number }> {
  const res = await tradeFetch(strategyUrl('/strategies/opportunities'), {
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
  const res = await tradeFetch(strategyUrl(`/strategies/opportunities/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT /strategies/opportunities/${id}: ${res.status}`)
  return res.json()
}

export async function fetchGateSafety(): Promise<GateSafetyResponse> {
  const res = await tradeFetch(strategyUrl('/strategies/gate-safety'))
  if (!res.ok) throw new Error(`Strategy /gate-safety: ${res.status}`)
  return res.json() as Promise<GateSafetyResponse>
}

/**
 * Core `GateParams` defaults (TD-72): what a new gate set starts from. Throws on
 * a non-2xx or an answer missing a family — there is no local copy to fall back to.
 */
export async function fetchGateSafetyDefaults(): Promise<GateSafetyDefaultsResponse> {
  const res = await tradeFetch(strategyUrl('/strategies/gate-safety/defaults'))
  if (!res.ok) throw new Error(`Strategy /gate-safety/defaults: ${res.status}`)
  const parsed = GateSafetyDefaultsResponseSchema.safeParse(await res.json())
  if (!parsed.success) throw new Error('Strategy /gate-safety/defaults: answer has no complete gates object')
  return parsed.data as GateSafetyDefaultsResponse
}

export async function fetchGateSafetyFull(id: number): Promise<GateSafetyFull> {
  const res = await tradeFetch(strategyUrl(`/strategies/gate-safety/${id}`))
  if (!res.ok) throw new Error(`Strategy /gate-safety/${id}: ${res.status}`)
  return res.json() as Promise<GateSafetyFull>
}

export async function createGateSafety(
  payload: GateSafetyPayload,
): Promise<{ ok: boolean; gate_safety_strategy_id?: number; error?: string }> {
  const res = await tradeFetch(strategyUrl('/strategies/gate-safety'), {
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
  const res = await tradeFetch(strategyUrl(`/strategies/gate-safety/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`PUT /strategies/gate-safety/${id}: ${res.status}`)
  return res.json()
}

export async function fetchDimsGrouped(): Promise<DimsGroupedResponse> {
  const res = await tradeFetch(strategyUrl('/strategies/dims'))
  if (!res.ok) throw new Error(`Strategy /dims: ${res.status}`)
  return res.json() as Promise<DimsGroupedResponse>
}

// ── Template API ─────────────────────────────────────────────────────────────

export async function fetchTemplates(activeOnly = true): Promise<StrategyTemplatesResponse> {
  const qs = activeOnly ? '?active_only=true' : ''
  const res = await tradeFetch(strategyUrl(`/strategies/templates${qs}`))
  if (!res.ok) throw new Error(`Strategy /templates: ${res.status}`)
  return res.json() as Promise<StrategyTemplatesResponse>
}

export async function fetchTemplateDetail(id: number): Promise<StrategyTemplateDetail> {
  const res = await tradeFetch(strategyUrl(`/strategies/templates/${id}`))
  if (!res.ok) throw new Error(`Strategy /templates/${id}: ${res.status}`)
  return res.json() as Promise<StrategyTemplateDetail>
}

export function createTemplate(
  payload: Record<string, unknown>,
): Promise<{ strategy_template_id: number }> {
  // The server says *why* — `Invalid structure code: custom`, a duplicate code
  // — and a bare 400 makes the reader guess at something already known.
  return requestJson(strategyUrl('/strategies/templates'), { method: 'POST', body: payload })
}

export async function updateTemplate(
  id: number,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean }> {
  const res = await tradeFetch(strategyUrl(`/strategies/templates/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`PUT /strategies/templates/${id}: ${res.status}`)
  return res.json()
}

export async function deleteTemplate(id: number): Promise<{ ok: boolean }> {
  const res = await tradeFetch(strategyUrl(`/strategies/templates/${id}`), { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE /strategies/templates/${id}: ${res.status}`)
  return res.json()
}

export async function replaceTemplateLegs(
  id: number,
  legs: TemplateLegPayload[],
): Promise<{ ok: boolean }> {
  const res = await tradeFetch(strategyUrl(`/strategies/templates/${id}/legs`), {
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
  const res = await tradeFetch(strategyUrl(`/strategies/templates/${id}/params`), {
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
  const res = await tradeFetch(strategyUrl(`/strategies/templates/${id}/characteristics`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  if (!res.ok) throw new Error(`PUT /strategies/templates/${id}/characteristics: ${res.status}`)
  return res.json()
}

function fetchConfigOptions(path: string): Promise<{ options: TemplateConfigOption[] }> {
  return requestJson(strategyUrl(`/strategies/templates/options/${path}`))
}

/** Paths match Legacy + strategy API (`/templates/options/*` singular). */
export function fetchParamKindOptions() { return fetchConfigOptions('param-kind') }
export function fetchLegRoleOptions() { return fetchConfigOptions('leg-role') }
export function fetchLegDirectionOptions() { return fetchConfigOptions('leg-direction') }
export function fetchLegOptionRightOptions() { return fetchConfigOptions('leg-option-right') }
export function fetchMetaKeyOptions() { return fetchConfigOptions('meta-keys') }

export async function fetchMetaValueOptions(
  templateCode: string,
  metaKey: string,
): Promise<{ options: TemplateConfigOption[] }> {
  const res = await tradeFetch(
    strategyUrl(`/strategies/templates/options/meta-values?template_code=${encodeURIComponent(templateCode)}&meta_key=${encodeURIComponent(metaKey)}`),
  )
  if (!res.ok) return { options: [] }
  return res.json()
}

// ── Win Rate ──────────────────────────────────────────────────────────────────

export async function fetchWinRate(params?: {
  sinceTs?: number
  untilTs?: number
}): Promise<WinRateResponse> {
  const sp = new URLSearchParams()
  if (params?.sinceTs != null) sp.set('since_ts', String(params.sinceTs))
  if (params?.untilTs != null) sp.set('until_ts', String(params.untilTs))
  const qs = sp.toString()
  const res = await tradeFetch(strategyUrl(`/strategies/win-rate${qs ? `?${qs}` : ''}`))
  if (!res.ok) throw new Error(`GET /strategies/win-rate: ${res.status}`)
  return res.json() as Promise<WinRateResponse>
}

// ── Allocations ───────────────────────────────────────────────────────────────


export async function fetchAllocations(activeOnly = false): Promise<AllocationsResponse> {
  const qs = `?active_only=${activeOnly}`
  const res = await tradeFetch(strategyUrl(`/strategies/allocations${qs}`))
  if (!res.ok) throw new Error(`GET /strategies/allocations: ${res.status}`)
  return res.json() as Promise<AllocationsResponse>
}

export async function fetchAllocation(id: number): Promise<StrategyAllocation> {
  const res = await tradeFetch(strategyUrl(`/strategies/allocations/${id}`))
  if (!res.ok) throw new Error(`GET /strategies/allocations/${id}: ${res.status}`)
  return res.json() as Promise<StrategyAllocation>
}

export async function createAllocation(
  payload: AllocationPayload,
): Promise<{ strategy_allocation_id: number }> {
  const res = await tradeFetch(strategyUrl('/strategies/allocations'), {
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
  const res = await tradeFetch(strategyUrl(`/strategies/allocations/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((j as { detail?: string }).detail ?? String(res.status))
  return j as { ok: boolean }
}

export function setActiveAllocation(
  allocationId: number | null,
  opts?: { structureId?: number | null; gateSafetyId?: number | null },
): Promise<{ ok: boolean }> {
  // A refusal (409: the id does not exist) throws with the server's reason.
  return requestJson(monitorUrl('/config/active-strategy'), {
    method: 'POST',
    body: {
      active_strategy_structure_id: opts?.structureId ?? null,
      active_gate_safety_strategy_id: opts?.gateSafetyId ?? null,
      active_strategy_allocation_id: allocationId,
    },
  })
}

/**
 * Delete a Desk rule object (api 0.1.9, design Rev .140). The Desk calls these
 * only once its Undo toast has closed (Owner 2026-10-01: held delete). An
 * object still in use is refused with a 409 whose reason is the error's text.
 */
function deleteRule(path: string): Promise<{ ok: boolean }> {
  return requestJson(strategyUrl(path), { method: 'DELETE' })
}

export function deleteOpportunity(id: number): Promise<{ ok: boolean }> {
  return deleteRule(`/strategies/opportunities/${id}`)
}

export function deleteAllocation(id: number): Promise<{ ok: boolean }> {
  return deleteRule(`/strategies/allocations/${id}`)
}

export function deleteGateSafety(id: number): Promise<{ ok: boolean }> {
  return deleteRule(`/strategies/gate-safety/${id}`)
}
