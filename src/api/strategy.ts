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
  AllocationsResponseSchema,
  GateSafetyDefaultsResponseSchema,
  GateSafetyFullSchema,
  GateSafetyResponseSchema,
  OpportunitiesResponseSchema,
  StrategyAllocationSchema,
  StrategyInstancesResponseSchema,
  StrategyInstanceDetailSchema,
  StrategyOpportunityDetailSchema,
} from '@/lib/schemas/strategy'
import type { CreateTemplateBody, GateSafetyDefaultsResponse } from '@/types/strategy'
import type { TemplateCharacteristicsBody, TemplateLegsBody, TemplateParamsBody } from '@/types/requestBodies'
import { monitorUrl, strategyUrl } from '@/lib/devApiUrl'
import { tradeFetch } from '@/lib/tradeFetch'
import { requestDelete, requestJson, type DeleteOutcome } from '@/lib/http'


// The five response-modelled resources (api 0.3.1) are read through their
// schemas; the types are those schemas' `z.infer`. Advisory: a mismatch is
// reported (DEV console, PROD drift record) and the answer still passes.
const validateInstances = withValidation<StrategyInstancesResponse>(StrategyInstancesResponseSchema, 'strategy/instances')
const validateInstance = withValidation<StrategyInstance>(StrategyInstanceDetailSchema, 'strategy/instances/:id')
const validateOpportunities = withValidation<OpportunitiesResponse>(OpportunitiesResponseSchema, 'strategy/opportunities')
const validateOpportunity = withValidation<StrategyOpportunityDetail>(
  StrategyOpportunityDetailSchema,
  'strategy/opportunities/:id',
)
const validateGateSafetyList = withValidation<GateSafetyResponse>(GateSafetyResponseSchema, 'strategy/gate-safety')
const validateGateSafety = withValidation<GateSafetyFull>(GateSafetyFullSchema, 'strategy/gate-safety/:id')
const validateAllocations = withValidation<AllocationsResponse>(AllocationsResponseSchema, 'strategy/allocations')
const validateAllocation = withValidation<StrategyAllocation>(StrategyAllocationSchema, 'strategy/allocations/:id')

/** List page needs inactive rows too — Legacy calls with active_only=false. */
export async function fetchOpportunities(activeOnly = false): Promise<OpportunitiesResponse> {
  const qs = new URLSearchParams({ active_only: String(activeOnly) })
  const url = strategyUrl(`/strategies/opportunities?${qs}`)
  const res = await tradeFetch(url)
  if (!res.ok) throw new Error(`Strategy /opportunities: ${res.status}`)
  return validateOpportunities(await res.json(), url)
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
  const url = strategyUrl(`/strategies/instances${qs ? `?${qs}` : ''}`)
  const res = await tradeFetch(url)
  if (!res.ok) throw new Error(`Strategy /instances: ${res.status}`)
  return validateInstances(await res.json(), url)
}

/** `InstanceRow` without `executions_count` (the list alone carries it). */
export async function fetchStrategyInstance(id: number): Promise<StrategyInstance> {
  const url = strategyUrl(`/strategies/instances/${id}`)
  const res = await tradeFetch(url)
  if (!res.ok) throw new Error(`Strategy /instances/${id}: ${res.status}`)
  return validateInstance(await res.json(), url)
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

/**
 * Change the fields sent (api 0.3.0): `null` clears a label or notes, a blank
 * string is refused (400). Answers the instance as GET /instances/{id} does.
 */
export async function patchStrategyInstance(
  id: number,
  body: PatchStrategyInstanceBody,
): Promise<StrategyInstance> {
  const url = strategyUrl(`/strategies/instances/${id}`)
  return validateInstance(await requestJson(url, { method: 'PATCH', body }), url)
}

/**
 * A missing instance resolves as `deleted: 'gone'`. Refused with the server's
 * reason: 409 while fills are attributed or split-allocated to it, 503 when
 * the Golden Source cannot be read (nothing deleted).
 */
export function deleteStrategyInstance(id: number): Promise<DeleteOutcome> {
  return requestDelete(strategyUrl(`/strategies/instances/${id}`))
}

export async function fetchOpportunityDetail(id: number): Promise<StrategyOpportunityDetail> {
  const url = strategyUrl(`/strategies/opportunities/${id}`)
  const res = await tradeFetch(url)
  if (!res.ok) throw new Error(`Strategy /opportunities/${id}: ${res.status}`)
  return validateOpportunity(await res.json(), url)
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

/**
 * Change the fields sent (api 0.3.0; the PUT it replaces reset the gate, the
 * scope and is_active when they were left out). `symbols` and
 * `entry_conditions` replace the stored lists whole. Answers the opportunity
 * as GET /opportunities/{id} does; a refusal throws the server's reason.
 */
export async function patchOpportunity(
  id: number,
  body: Partial<CreateOpportunityBody>,
): Promise<StrategyOpportunityDetail> {
  const url = strategyUrl(`/strategies/opportunities/${id}`)
  return validateOpportunity(await requestJson(url, { method: 'PATCH', body }), url)
}

export async function fetchGateSafety(): Promise<GateSafetyResponse> {
  const url = strategyUrl('/strategies/gate-safety')
  const res = await tradeFetch(url)
  if (!res.ok) throw new Error(`Strategy /gate-safety: ${res.status}`)
  return validateGateSafetyList(await res.json(), url)
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
  const url = strategyUrl(`/strategies/gate-safety/${id}`)
  const res = await tradeFetch(url)
  if (!res.ok) throw new Error(`Strategy /gate-safety/${id}: ${res.status}`)
  return validateGateSafety(await res.json(), url)
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
  payload: CreateTemplateBody,
): Promise<{ strategy_template_id: number }> {
  // The server says *why* — `Invalid structure code: custom`, a duplicate code
  // — and a bare 400 makes the reader guess at something already known.
  return requestJson(strategyUrl('/strategies/templates'), { method: 'POST', body: payload })
}

/** The info and dimensions PATCH /strategies/templates/{id} takes; `null` clears a nullable one. */
export interface TemplateInfoPatch {
  template_code?: string
  display_name?: string
  dim_direction?: string | null
  dim_structure?: string | null
  dim_coverage?: string | null
  dim_risk?: string | null
  dim_volatility?: string | null
  dim_time?: string | null
  explanation?: string | null
  typical_use?: string | null
  example?: string | null
  nature?: string | null
  sort_order?: number
  is_active?: boolean
}

/**
 * Change a template's info and dimensions (api 0.3.0). A blank text is refused
 * (400 "send null to clear it"); a code another template uses is 409. Answers
 * the template as GET /templates/{id} does. Legs, params and characteristics
 * stay on their own PUTs below.
 */
export function updateTemplate(id: number, payload: TemplateInfoPatch): Promise<StrategyTemplateDetail> {
  return requestJson(strategyUrl(`/strategies/templates/${id}`), { method: 'PATCH', body: payload })
}

/**
 * A missing template resolves as `deleted: 'gone'`; one that structures still
 * use (deactivated ones count) is 409 with their names.
 */
export function deleteTemplate(id: number): Promise<DeleteOutcome> {
  return requestDelete(strategyUrl(`/strategies/templates/${id}`))
}

export async function replaceTemplateLegs(
  id: number,
  legs: TemplateLegPayload[],
): Promise<{ ok: boolean }> {
  const body: TemplateLegsBody = { legs }
  const res = await tradeFetch(strategyUrl(`/strategies/templates/${id}/legs`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT /strategies/templates/${id}/legs: ${res.status}`)
  return res.json()
}

export async function replaceTemplateParams(
  id: number,
  items: MetaParamPayload[],
): Promise<{ ok: boolean }> {
  const body: TemplateParamsBody = { items }
  const res = await tradeFetch(strategyUrl(`/strategies/templates/${id}/params`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT /strategies/templates/${id}/params: ${res.status}`)
  return res.json()
}

export async function replaceTemplateCharacteristics(
  id: number,
  items: string[],
): Promise<{ ok: boolean }> {
  const body: TemplateCharacteristicsBody = { items }
  const res = await tradeFetch(strategyUrl(`/strategies/templates/${id}/characteristics`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
  const url = strategyUrl(`/strategies/allocations?active_only=${activeOnly}`)
  const res = await tradeFetch(url)
  if (!res.ok) throw new Error(`GET /strategies/allocations: ${res.status}`)
  return validateAllocations(await res.json(), url)
}

export async function fetchAllocation(id: number): Promise<StrategyAllocation> {
  const url = strategyUrl(`/strategies/allocations/${id}`)
  const res = await tradeFetch(url)
  if (!res.ok) throw new Error(`GET /strategies/allocations/${id}: ${res.status}`)
  return validateAllocation(await res.json(), url)
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

/**
 * Change the fields sent (api 0.3.0). `allocation_limits` keys patch one by
 * one (`null` clears both); `strategy_opportunity_ids` replaces the
 * membership. Answers the allocation as GET /allocations/{id} does.
 */
export async function updateAllocation(id: number, payload: Partial<AllocationPayload>): Promise<StrategyAllocation> {
  const url = strategyUrl(`/strategies/allocations/${id}`)
  return validateAllocation(await requestJson(url, { method: 'PATCH', body: payload }), url)
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
 * object still in use is refused with a 409 whose reason is the error's text;
 * one already gone (another tab, a second ⌘Z) resolves as `deleted: 'gone'`.
 */
function deleteRule(path: string): Promise<DeleteOutcome> {
  return requestDelete(strategyUrl(path))
}

export function deleteOpportunity(id: number): Promise<DeleteOutcome> {
  return deleteRule(`/strategies/opportunities/${id}`)
}

export function deleteAllocation(id: number): Promise<DeleteOutcome> {
  return deleteRule(`/strategies/allocations/${id}`)
}

export function deleteGateSafety(id: number): Promise<DeleteOutcome> {
  return deleteRule(`/strategies/gate-safety/${id}`)
}
