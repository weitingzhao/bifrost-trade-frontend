/**
 * Turning plans into rows: the filter, the counts, and the short texts.
 *
 * Pure, so the table and the tests read the same derivation. Anything that is a
 * number the desk cannot compute is absent here rather than filled in — the
 * page renders those cells as `Not computed`.
 */
import type { PlanEffectiveStatus, PlanLeg, StrategyPlan } from '@/lib/schemas/strategyPlan'

// Moved to the shared layer when the shell's Objective control became its second reader (§14.2).
export { planFilterCounts } from '@/utils/planStatusCounts'

/**
 * The design's five segments. `Open` is draft + intended — the book you are
 * still working — and the default. Draft-only and cancelled-only views retired
 * with the design's own list; `All` still reaches every row.
 */
export const PLAN_FILTERS = ['open', 'intended', 'filled', 'expired', 'all'] as const
export type PlanFilterValue = (typeof PLAN_FILTERS)[number]

export const PLAN_FILTER_LABELS: Record<PlanFilterValue, string> = {
  open: 'Open',
  intended: 'Intended',
  filled: 'Filled',
  expired: 'Expired',
  all: 'All',
}

/** Old links said `?status=draft` / `?status=cancelled`; they land on the scope that contains them. */
export function isPlanFilter(value: string | null | undefined): value is PlanFilterValue {
  return value != null && (PLAN_FILTERS as readonly string[]).includes(value)
}

export function coercePlanFilter(value: string | null | undefined): PlanFilterValue {
  if (isPlanFilter(value)) return value
  if (value === 'draft') return 'open'
  if (value === 'cancelled') return 'all'
  return 'open'
}

export function filterPlans(
  plans: readonly StrategyPlan[],
  filter: PlanFilterValue,
): StrategyPlan[] {
  if (filter === 'all') return [...plans]
  if (filter === 'open') {
    return plans.filter(
      (plan) => plan.effective_status === 'draft' || plan.effective_status === 'intended',
    )
  }
  return plans.filter((plan) => plan.effective_status === filter)
}

/**
 * The design's two account toggles. A plan on an account that is neither the
 * host nor the secondary is never hidden by them — a toggle only speaks for
 * the account it names.
 */
export function planInAccountScope(
  plan: Pick<StrategyPlan, 'account_id'>,
  scope: { host: boolean; secondary: boolean },
  hostAccountId: string,
  secondaryAccountId: string,
): boolean {
  if (hostAccountId && plan.account_id === hostAccountId) return scope.host
  if (secondaryAccountId && plan.account_id === secondaryAccountId) return scope.secondary
  return true
}

/** The design's order — the live book first, the record after it. */
const STATUS_ORDER: Record<PlanEffectiveStatus, number> = {
  intended: 0,
  draft: 1,
  filled: 2,
  expired: 3,
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

/** The design ambers a waiting intent's date; everything else stays quiet. */
export function planWhenTone(status: PlanEffectiveStatus): 'warning' | 'muted' {
  return status === 'intended' ? 'warning' : 'muted'
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
