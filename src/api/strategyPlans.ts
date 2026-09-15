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

export interface PlanWriteBody {
  account_id: string
  symbol: string
  structure_label: string
  qty: number
  legs?: PlanLeg[]
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
  source?: PlanSourceEntry[]
  expires_at?: string | null
}

/** The server's own words when it refuses, so the desk never invents a reason. */
async function planRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(strategyUrl(path), init)
  const body = (await res.json().catch(() => ({}))) as { detail?: string }
  if (!res.ok) {
    throw new Error(body.detail ?? `${init?.method ?? 'GET'} ${path}: ${res.status}`)
  }
  return body as T
}

function jsonBody(payload: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }
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
  return planRequest('/strategies/plans', jsonBody(payload))
}

export async function updateStrategyPlan(
  id: number,
  payload: Partial<PlanWriteBody>,
): Promise<{ ok: boolean }> {
  return planRequest(`/strategies/plans/${id}`, { ...jsonBody(payload), method: 'PUT' })
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
    jsonBody({ strategy_instance_id: strategyInstanceId }),
  )
}

export async function cancelStrategyPlan(id: number): Promise<{ ok: boolean }> {
  return planRequest(`/strategies/plans/${id}/cancel`, { method: 'POST' })
}
