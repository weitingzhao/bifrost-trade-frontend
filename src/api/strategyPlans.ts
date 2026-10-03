/**
 * Structured trade plans — `/api/strategy/strategies/plans`.
 *
 * The server owns the rules: a refusal comes back as 409 with the reason the
 * plan gave, and that text is what the desk shows. Nothing here decides whether
 * a move is allowed, and nothing here places an order (D10).
 */
import { withValidation } from '@/lib/apiValidation'
import { strategyUrl } from '@/lib/devApiUrl'
import {
  StrategyPlanSchema,
  StrategyPlansResponseSchema,
  type PlanLeg,
  type PlanSourceEntry,
  type PlanSourceKind,
  type StrategyPlan,
  type StrategyPlansResponse,
} from '@/lib/schemas/strategyPlan'
import { requestDelete, requestJson, type DeleteOutcome, type RequestJsonOptions } from '@/lib/http'

const validatePlans = withValidation<StrategyPlansResponse>(
  StrategyPlansResponseSchema,
  'strategy/plans',
)
const validatePlan = withValidation<StrategyPlan>(StrategyPlanSchema, 'strategy/plans/:id')

export interface PlanFilters {
  status?: string
  symbol?: string
  accountId?: string
  limit?: number
}

/**
 * POST / PATCH body. The legs and the source chain go under the names a plan is read
 * with, `legs_json` / `source_json` (api 0.6.7, TD-57): the server took only `legs` /
 * `source` before, and silently dropped `legs_json` on create.
 */
export interface PlanWriteBody {
  account_id: string
  symbol: string
  structure_label: string
  qty: number
  legs_json?: PlanLeg[]
  strategy_structure_id?: number | null
  strategy_opportunity_id?: number | null
  price_effect?: 'credit' | 'debit' | null
  limit_price?: number | null
  target_kind?: string | null
  target_value?: number | null
  stop_kind?: string | null
  stop_value?: number | null
  exit_by?: string | null
  rationale?: string | null
  source_kind?: PlanSourceKind
  source_ref?: string | null
  source_json?: PlanSourceEntry[]
  expires_at?: string | null
}

/** The server's own words when it refuses, so the desk never invents a reason. */
function planRequest<T>(path: string, init: RequestJsonOptions<T> = {}): Promise<T> {
  return requestJson<T>(strategyUrl(path), init)
}

export async function fetchStrategyPlans(filters: PlanFilters = {}): Promise<StrategyPlansResponse> {
  const qs = new URLSearchParams()
  if (filters.status) qs.set('status', filters.status)
  if (filters.symbol) qs.set('symbol', filters.symbol)
  if (filters.accountId) qs.set('account_id', filters.accountId)
  if (filters.limit) qs.set('limit', String(filters.limit))
  const query = qs.toString()
  return validatePlans(await planRequest(`/strategies/plans${query ? `?${query}` : ''}`))
}

export async function fetchStrategyPlan(id: number): Promise<StrategyPlan> {
  return validatePlan(await planRequest(`/strategies/plans/${id}`))
}

export async function createStrategyPlan(
  payload: PlanWriteBody,
): Promise<{ strategy_plan_id: number }> {
  return planRequest('/strategies/plans', { method: 'POST', body: payload })
}

/**
 * PATCH the fields sent (api 0.3.0). A draft takes any field; an intended plan
 * — expired or not — takes `expires_at` alone (Extend 7 days, Re-issue
 * intent), anything else is 409 with the reason. `null` clears a nullable
 * field, a blank text is 400. Answers the plan as GET /plans/{id} does.
 */
export async function updateStrategyPlan(
  id: number,
  payload: Partial<PlanWriteBody>,
): Promise<StrategyPlan> {
  return validatePlan(await planRequest(`/strategies/plans/${id}`, { method: 'PATCH', body: payload }))
}

export async function intendStrategyPlan(id: number): Promise<{ ok: boolean }> {
  return planRequest(`/strategies/plans/${id}/intend`, { method: 'POST' })
}

export async function linkStrategyPlanFill(
  id: number,
  strategyInstanceId: number,
): Promise<{ ok: boolean }> {
  return planRequest(
    `/strategies/plans/${id}/link-fill`,
    { method: 'POST', body: { strategy_instance_id: strategyInstanceId } },
  )
}

export async function cancelStrategyPlan(id: number): Promise<{ ok: boolean }> {
  return planRequest(`/strategies/plans/${id}/cancel`, { method: 'POST' })
}

/** Remove a draft (core 0.28.0). The desk calls this only once its Undo toast
 *  has closed (design Rev .138); anything past draft is refused with the reason
 *  (409). A plan already gone resolves as `deleted: 'gone'`. */
export function deleteStrategyPlan(id: number): Promise<DeleteOutcome> {
  return requestDelete(strategyUrl(`/strategies/plans/${id}`))
}
