/**
 * Turning plans into rows: the filter, the counts, and the short texts.
 *
 * Pure, so the table and the tests read the same derivation. Anything that is a
 * number the desk cannot compute is absent here rather than filled in — the
 * page renders those cells as `Not computed`.
 */
import type { PlanEffectiveStatus, PlanLeg, StrategyPlan } from '@/lib/schemas/strategyPlan'

export const PLAN_FILTERS = ['all', 'draft', 'intended', 'expired', 'filled', 'cancelled'] as const
export type PlanFilterValue = (typeof PLAN_FILTERS)[number]

export const PLAN_FILTER_LABELS: Record<PlanFilterValue, string> = {
  all: 'All',
  draft: 'Draft',
  intended: 'Intended',
  expired: 'Expired',
  filled: 'Filled',
  cancelled: 'Cancelled',
}

export function isPlanFilter(value: string | null | undefined): value is PlanFilterValue {
  return value != null && (PLAN_FILTERS as readonly string[]).includes(value)
}

/** Counts per segment, by `effective_status` — so `Expired` counts intents, not a stored state. */
export function planFilterCounts(plans: readonly StrategyPlan[]): Record<PlanFilterValue, number> {
  const counts: Record<PlanFilterValue, number> = {
    all: plans.length,
    draft: 0,
    intended: 0,
    expired: 0,
    filled: 0,
    cancelled: 0,
  }
  for (const plan of plans) counts[plan.effective_status] += 1
  return counts
}

export function filterPlans(
  plans: readonly StrategyPlan[],
  filter: PlanFilterValue,
): StrategyPlan[] {
  if (filter === 'all') return [...plans]
  return plans.filter((plan) => plan.effective_status === filter)
}

const STATUS_ORDER: Record<PlanEffectiveStatus, number> = {
  intended: 0,
  expired: 1,
  draft: 2,
  filled: 3,
  cancelled: 4,
}

/** Live plans first: an intent waiting on a fill is what the desk came here for. */
export function sortPlans(plans: readonly StrategyPlan[]): StrategyPlan[] {
  return [...plans].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.effective_status] - STATUS_ORDER[b.effective_status]
    if (byStatus !== 0) return byStatus
    return (b.created_at ?? '').localeCompare(a.created_at ?? '')
  })
}

const STATUS_TAG_VARIANT: Record<PlanEffectiveStatus, 'neutral' | 'info' | 'warning'> = {
  draft: 'neutral',
  intended: 'info',
  expired: 'warning',
  filled: 'neutral',
  cancelled: 'neutral',
}

export function planStatusVariant(status: PlanEffectiveStatus) {
  return STATUS_TAG_VARIANT[status]
}

/** `S 20261120 180P` per leg, joined — the same shorthand the chain uses. */
export function planLegsText(legs: readonly PlanLeg[]): string {
  if (legs.length === 0) return '—'
  return legs
    .map((leg) => {
      const side = leg.side === 'sell' ? 'S' : 'B'
      if (leg.sec_type === 'STK') return `${side} shares`
      const expiry = (leg.expiry ?? '').replace(/-/g, '')
      const strike = leg.strike == null ? '' : String(leg.strike)
      const ratio = leg.ratio > 1 ? ` ×${leg.ratio}` : ''
      return `${side} ${expiry} ${strike}${leg.right ?? ''}${ratio}`
    })
    .join(' · ')
}

export function planSourceText(plan: Pick<StrategyPlan, 'source_kind' | 'source_ref'>): string {
  return plan.source_ref ? `${plan.source_kind} · ${plan.source_ref}` : plan.source_kind
}

function shortDate(iso: string | null): string | null {
  if (!iso) return null
  const day = iso.slice(0, 10)
  return day.length === 10 ? day : iso
}

/**
 * The one date the row's status makes worth showing.
 *
 * A draft has no date to wait for, so it says so rather than borrowing one.
 */
export function planWhenText(
  plan: Pick<StrategyPlan, 'effective_status' | 'expires_at' | 'filled_at' | 'cancelled_at'>,
): string {
  if (plan.effective_status === 'filled') return `filled ${shortDate(plan.filled_at) ?? '—'}`
  if (plan.effective_status === 'cancelled') {
    return `cancelled ${shortDate(plan.cancelled_at) ?? '—'}`
  }
  if (plan.effective_status === 'expired') return `expired ${shortDate(plan.expires_at) ?? '—'}`
  if (plan.effective_status === 'intended') {
    const expires = shortDate(plan.expires_at)
    return expires ? `expires ${expires}` : 'no expiry'
  }
  return 'draft'
}

/** Which actions a plan's state allows. `filled` and `cancelled` are read-only. */
export function planActions(status: PlanEffectiveStatus): {
  canEdit: boolean
  canIntend: boolean
  canLinkFill: boolean
  canCancel: boolean
} {
  return {
    canEdit: status === 'draft',
    canIntend: status === 'draft',
    canLinkFill: status === 'intended' || status === 'expired',
    canCancel: status === 'draft' || status === 'intended' || status === 'expired',
  }
}
