/**
 * Opening the new-plan sheet already pointed at its source (TD-177).
 *
 * `/trade/plans?new=1` opens the order sheet; `source_kind` / `source_ref`
 * (and `symbol`, when the source names exactly one) pre-fill it. Nothing is
 * written until the reader saves — the same sheet, the same Save draft.
 *
 * The hypothesis card links here so its plans carry `source_kind =
 * 'hypothesis'` and `source_ref` = the hypothesis id: that is the pair
 * Research reads to put the filled trade back on the hypothesis (TD-143).
 */
import { PLAN_SOURCE_KINDS } from '@/utils/tradeOrigin'
import type { PlanSourceKind } from '@/lib/schemas/strategyPlan'

export const PLANS_PATH = '/trade/plans'

export interface PlanSeed {
  sourceKind: PlanSourceKind
  sourceRef: string | null
  symbol: string | null
}

function isSourceKind(value: string | null): value is PlanSourceKind {
  return value != null && (PLAN_SOURCE_KINDS as readonly string[]).includes(value)
}

/** The sheet's pre-fill from the URL; null when the link names no source. */
export function planSeedFromParams(params: URLSearchParams): PlanSeed | null {
  const kind = params.get('source_kind')
  if (!isSourceKind(kind)) return null
  const ref = (params.get('source_ref') ?? '').trim()
  const symbol = (params.get('symbol') ?? '').trim().toUpperCase()
  return { sourceKind: kind, sourceRef: ref || null, symbol: symbol || null }
}

/**
 * The new-plan sheet for one hypothesis. A hypothesis that names exactly one
 * symbol pre-fills it; one naming none or several leaves the reader to pick.
 */
export function hypothesisPlanHref(hypothesis: { id: string; symbols: readonly string[] }): string {
  const params = new URLSearchParams({ new: '1', source_kind: 'hypothesis', source_ref: hypothesis.id })
  const only = hypothesis.symbols.length === 1 ? hypothesis.symbols[0].trim().toUpperCase() : ''
  if (only) params.set('symbol', only)
  return `${PLANS_PATH}?${params.toString()}`
}
