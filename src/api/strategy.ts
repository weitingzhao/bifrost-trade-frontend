import type {
  OpportunitiesResponse,
  StructuresResponse,
  StructurePayload,
  TradesResponse,
  Trade,
  StrategyStructure,
  StrategyOpportunityDetail,
  CreateTradeBody,
  PatchTradeBody,
  CreateOpportunityBody,
  GateSetResponse,
  GateSetFull,
  GateSetPayload,
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
  GateSetDefaultsResponseSchema,
  GateSetFullSchema,
  GateSetResponseSchema,
  OpportunitiesResponseSchema,
  StrategyAllocationSchema,
  TradesResponseSchema,
  TradeDetailSchema,
  StrategyOpportunityDetailSchema,
} from '@/lib/schemas/strategy'
import type { CreateTemplateBody, GateSetDefaultsResponse } from '@/types/strategy'
import type { TemplateCharacteristicsBody, TemplateLegsBody, TemplateParamsBody } from '@/types/requestBodies'
import { monitorUrl, strategyUrl } from '@/lib/devApiUrl'
import { requestDelete, requestJson, type DeleteOutcome, httpFailure } from '@/lib/http'


// The five response-modelled resources (api 0.3.1) are read through their
// schemas; the types are those schemas' `z.infer`. Advisory: a mismatch is
// reported (DEV console, PROD drift record) and the answer still passes.
const validateTrades = withValidation<TradesResponse>(TradesResponseSchema, 'strategy/trades')
const validateTrade = withValidation<Trade>(TradeDetailSchema, 'strategy/trades/:id')
const validateOpportunities = withValidation<OpportunitiesResponse>(OpportunitiesResponseSchema, 'strategy/opportunities')
const validateOpportunity = withValidation<StrategyOpportunityDetail>(
  StrategyOpportunityDetailSchema,
  'strategy/opportunities/:id',
)
const validateGateSetList = withValidation<GateSetResponse>(GateSetResponseSchema, 'strategy/gate-sets')
const validateGateSet = withValidation<GateSetFull>(GateSetFullSchema, 'strategy/gate-sets/:id')
const validateAllocations = withValidation<AllocationsResponse>(AllocationsResponseSchema, 'strategy/allocations')
const validateAllocation = withValidation<StrategyAllocation>(StrategyAllocationSchema, 'strategy/allocations/:id')

/** List page needs inactive rows too — Legacy calls with active_only=false. */
export async function fetchOpportunities(activeOnly = false): Promise<OpportunitiesResponse> {
  const qs = new URLSearchParams({ active_only: String(activeOnly) })
  const url = strategyUrl(`/strategies/opportunities?${qs}`)
  return validateOpportunities(await requestJson(url, { label: `Strategy /opportunities` }), url)
}

export async function fetchStructures(activeOnly = false): Promise<StructuresResponse> {
  const qs = `?active_only=${activeOnly}`
  return requestJson<StructuresResponse>(strategyUrl(`/strategies/structures${qs}`), { label: `Strategy /structures` })
}

export async function fetchStructure(id: number): Promise<StrategyStructure> {
  return requestJson<StrategyStructure>(strategyUrl(`/strategies/structures/${id}`), { label: `Strategy /structures/${id}` })
}

/**
 * The writes the Rules inspectors make, one place (TD-62): the api functions below send
 * exactly these, and `strategyWriteLabel` prints them on the inspectors and in refusals,
 * so the label a reader copies into curl is the request the app makes.
 */
export const STRATEGY_WRITES = {
  createStructure: { method: 'POST', path: () => '/strategies/structures' },
  structure: { method: 'PUT', path: (id: number) => `/strategies/structures/${id}` },
  opportunity: { method: 'PATCH', path: (id: number) => `/strategies/opportunities/${id}` },
  allocation: { method: 'PATCH', path: (id: number) => `/strategies/allocations/${id}` },
} as const

type StrategyWrite = (typeof STRATEGY_WRITES)[keyof typeof STRATEGY_WRITES]

/** `METHOD /api/account/...` as the request goes out (the path only, never the host). */
export function strategyWriteLabel(write: StrategyWrite, id?: number): string {
  const url = strategyUrl(write.path(id as number))
  return `${write.method} ${new URL(url, 'http://local').pathname}`
}

export async function createStructure(
  payload: StructurePayload,
): Promise<{ strategy_structure_id: number }> {
  const write = STRATEGY_WRITES.createStructure
  return requestJson<{ strategy_structure_id: number }>(strategyUrl(write.path()), {
    method: write.method,
    body: payload,
    label: strategyWriteLabel(write),
  })
}

export async function updateStructure(
  id: number,
  payload: StructurePayload,
): Promise<{ ok: boolean }> {
  const write = STRATEGY_WRITES.structure
  return requestJson<{ ok: boolean }>(strategyUrl(write.path(id)), {
    method: write.method,
    body: payload,
    label: strategyWriteLabel(write, id),
  })
}

export async function fetchTrades(params?: {
  opportunityId?: number
  accountId?: string
  /** Unix seconds; the plan's `intended_at` when looking for the fill it caused. */
  openedAtFrom?: number
}): Promise<TradesResponse> {
  const sp = new URLSearchParams()
  if (params?.opportunityId != null) {
    sp.set('strategy_opportunity_id', String(params.opportunityId))
  }
  if (params?.accountId) sp.set('account_id', params.accountId)
  if (params?.openedAtFrom != null) sp.set('from_ts', String(params.openedAtFrom))
  const qs = sp.toString()
  const url = strategyUrl(`/trades${qs ? `?${qs}` : ''}`)
  return validateTrades(await requestJson(url, { label: `Strategy /trades` }), url)
}

/** `TradeRow` without `executions_count` (the list alone carries it). */
export async function fetchTrade(id: number): Promise<Trade> {
  const url = strategyUrl(`/trades/${id}`)
  return validateTrade(await requestJson(url, { label: `Strategy /trades/${id}` }), url)
}

/** POST /trades answers `{ trade_id }`; no `ok` field. */
export async function createTrade(
  body: CreateTradeBody,
): Promise<{ trade_id: number }> {
  // A refusal throws HttpError with the server's detail (a 422's messages joined).
  const j = await requestJson<{ trade_id?: number; error?: string }>(strategyUrl('/trades'), {
    method: 'POST',
    body,
    label: 'POST /trades',
  })
  const id = j.trade_id
  if (id == null || !Number.isFinite(Number(id))) {
    throw new Error(j.error ?? 'Failed to create trade')
  }
  return { trade_id: Number(id) }
}

/**
 * Change the fields sent (api 0.3.0): `null` clears a label, a blank
 * string is refused (400). Answers the instance as GET /instances/{id} does.
 */
export async function patchTrade(
  id: number,
  body: PatchTradeBody,
): Promise<Trade> {
  const url = strategyUrl(`/trades/${id}`)
  return validateTrade(await requestJson(url, { method: 'PATCH', body }), url)
}

/**
 * A missing instance resolves as `deleted: 'gone'`. Refused with the server's
 * reason: 409 while fills are attributed or split-allocated to it, 503 when
 * the Golden Source cannot be read (nothing deleted).
 */
export function deleteTrade(id: number): Promise<DeleteOutcome> {
  return requestDelete(strategyUrl(`/trades/${id}`))
}

export async function fetchOpportunityDetail(id: number): Promise<StrategyOpportunityDetail> {
  const url = strategyUrl(`/strategies/opportunities/${id}`)
  return validateOpportunity(await requestJson(url, { label: `Strategy /opportunities/${id}` }), url)
}

export async function createOpportunity(
  body: CreateOpportunityBody,
): Promise<{ strategy_opportunity_id: number }> {
  return requestJson(strategyUrl('/strategies/opportunities'), { method: 'POST', body: body, label: `POST /strategies/opportunities` })
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
  const write = STRATEGY_WRITES.opportunity
  const url = strategyUrl(write.path(id))
  return validateOpportunity(await requestJson(url, { method: write.method, body }), url)
}

export async function fetchGateSets(): Promise<GateSetResponse> {
  const url = strategyUrl('/gate-sets')
  return validateGateSetList(await requestJson(url, { label: `Strategy /gate-sets` }), url)
}

/**
 * Core `GateParams` defaults (TD-72): what a new gate set starts from. Throws on
 * a non-2xx or an answer missing a family — there is no local copy to fall back to.
 */
export async function fetchGateSetDefaults(): Promise<GateSetDefaultsResponse> {
  const raw = await requestJson<unknown>(strategyUrl('/gate-sets/defaults'), {
    label: 'Strategy /gate-sets/defaults',
  })
  const parsed = GateSetDefaultsResponseSchema.safeParse(raw)
  if (!parsed.success) throw new Error('Strategy /gate-sets/defaults: answer has no complete gates object')
  return parsed.data as GateSetDefaultsResponse
}

export async function fetchGateSetFull(id: number): Promise<GateSetFull> {
  const url = strategyUrl(`/gate-sets/${id}`)
  return validateGateSet(await requestJson(url, { label: `Strategy /gate-sets/${id}` }), url)
}

export async function createGateSet(
  payload: GateSetPayload,
): Promise<{ ok: boolean; gate_safety_strategy_id?: number; error?: string }> {
  return requestJson(strategyUrl('/gate-sets'), { method: 'POST', body: payload, label: `POST /gate-sets` })
}

export async function updateGateSet(
  id: number,
  payload: GateSetPayload,
): Promise<{ ok: boolean; error?: string }> {
  return requestJson(strategyUrl(`/gate-sets/${id}`), { method: 'PUT', body: payload, label: `PUT /gate-sets/${id}` })
}

export async function fetchDimsGrouped(): Promise<DimsGroupedResponse> {
  return requestJson<DimsGroupedResponse>(strategyUrl('/strategies/dims'), { label: `Strategy /dims` })
}

// ── Template API ─────────────────────────────────────────────────────────────

export async function fetchTemplates(activeOnly = true): Promise<StrategyTemplatesResponse> {
  const qs = activeOnly ? '?active_only=true' : ''
  return requestJson<StrategyTemplatesResponse>(strategyUrl(`/strategies/templates${qs}`), { label: `Strategy /templates` })
}

export async function fetchTemplateDetail(id: number): Promise<StrategyTemplateDetail> {
  return requestJson<StrategyTemplateDetail>(strategyUrl(`/strategies/templates/${id}`), { label: `Strategy /templates/${id}` })
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
  return requestJson(strategyUrl(`/strategies/templates/${id}/legs`), { method: 'PUT', body: body, label: `PUT /strategies/templates/${id}/legs` })
}

export async function replaceTemplateParams(
  id: number,
  items: MetaParamPayload[],
): Promise<{ ok: boolean }> {
  const body: TemplateParamsBody = { items }
  return requestJson(strategyUrl(`/strategies/templates/${id}/params`), { method: 'PUT', body: body, label: `PUT /strategies/templates/${id}/params` })
}

export async function replaceTemplateCharacteristics(
  id: number,
  items: string[],
): Promise<{ ok: boolean }> {
  const body: TemplateCharacteristicsBody = { items }
  return requestJson(strategyUrl(`/strategies/templates/${id}/characteristics`), { method: 'PUT', body: body, label: `PUT /strategies/templates/${id}/characteristics` })
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
  // A failure leaves the picker without suggestions (Owner 10-03, TD-50 batch 4: kept on purpose —
  // the field still takes a typed value). A network error still throws, as before.
  try {
    return await requestJson<{ options: TemplateConfigOption[] }>(
      strategyUrl(`/strategies/templates/options/meta-values?template_code=${encodeURIComponent(templateCode)}&meta_key=${encodeURIComponent(metaKey)}`),
      { label: 'Strategy /templates/options/meta-values' },
    )
  } catch (e) {
    httpFailure(e)
    return { options: [] }
  }
}

// ── Win Rate ──────────────────────────────────────────────────────────────────

export async function fetchWinRate(params?: {
  sinceTs?: number
  untilTs?: number
}): Promise<WinRateResponse> {
  const sp = new URLSearchParams()
  if (params?.sinceTs != null) sp.set('from_ts', String(params.sinceTs))
  if (params?.untilTs != null) sp.set('to_ts', String(params.untilTs))
  const qs = sp.toString()
  return requestJson<WinRateResponse>(strategyUrl(`/trades/win-rate${qs ? `?${qs}` : ''}`), { label: `GET /trades/win-rate` })
}

// ── Allocations ───────────────────────────────────────────────────────────────


export async function fetchAllocations(activeOnly = false): Promise<AllocationsResponse> {
  const url = strategyUrl(`/strategies/allocations?active_only=${activeOnly}`)
  return validateAllocations(await requestJson(url, { label: `GET /strategies/allocations` }), url)
}

export async function fetchAllocation(id: number): Promise<StrategyAllocation> {
  const url = strategyUrl(`/strategies/allocations/${id}`)
  return validateAllocation(await requestJson(url, { label: `GET /strategies/allocations/${id}` }), url)
}

export async function createAllocation(
  payload: AllocationPayload,
): Promise<{ strategy_allocation_id: number }> {
  return requestJson<{ strategy_allocation_id: number }>(strategyUrl('/strategies/allocations'), {
    method: 'POST',
    body: payload,
    label: 'POST /strategies/allocations',
  })
}

/**
 * Change the fields sent (api 0.3.0). `allocation_limits` keys patch one by
 * one (`null` clears both); `strategy_opportunity_ids` replaces the
 * membership. Answers the allocation as GET /allocations/{id} does.
 */
export async function updateAllocation(id: number, payload: Partial<AllocationPayload>): Promise<StrategyAllocation> {
  const write = STRATEGY_WRITES.allocation
  const url = strategyUrl(write.path(id))
  return validateAllocation(await requestJson(url, { method: write.method, body: payload }), url)
}

export function setActiveAllocation(
  allocationId: number | null,
  opts?: { structureId?: number | null; gateSetId?: number | null },
): Promise<{ ok: boolean }> {
  // A refusal (409: the id does not exist) throws with the server's reason.
  return requestJson(monitorUrl('/config/active-strategy'), {
    method: 'POST',
    body: {
      active_strategy_structure_id: opts?.structureId ?? null,
      active_gate_safety_strategy_id: opts?.gateSetId ?? null,
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

export function deleteGateSet(id: number): Promise<DeleteOutcome> {
  return deleteRule(`/gate-sets/${id}`)
}
