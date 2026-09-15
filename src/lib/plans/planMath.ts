/**
 * What a plan reads as: its estimated cash, its written exit, its status word.
 *
 * Pure, and the only place the desk turns plan columns into text — the table,
 * the card and the form all read from here so they cannot say different things
 * about the same plan. Nothing is invented: a plan with no limit price has no
 * estimate, and says so with null rather than a zero.
 */
import type { PlanEffectiveStatus, StrategyPlan } from '@/lib/schemas/strategyPlan'

const OPTION_MULTIPLIER = 100

/**
 * Estimated cash at the limit price: positive for a credit, negative for a debit.
 *
 * The limit is the price of the combination, not of a leg, so it is counted once
 * — per contract for options, per share for stock. Null when no limit was
 * written: the plan has not said what it would pay.
 */
export function planEstCredit(plan: Pick<StrategyPlan, 'limit_price' | 'price_effect' | 'qty' | 'legs_json'>): number | null {
  if (plan.limit_price == null) return null
  const hasOption = plan.legs_json.some((leg) => leg.sec_type === 'OPT')
  const multiplier = hasOption ? OPTION_MULTIPLIER : 1
  const magnitude = plan.limit_price * plan.qty * multiplier
  const signed = plan.price_effect === 'debit' ? -magnitude : magnitude
  // Cash, so cents: 1.1 x 100 in binary floating point is 110.00000000000001.
  return Math.round(signed * 100) / 100
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * `2026-10-16` → `16 Oct`.
 *
 * Read off the string rather than through a `Date`: `exit_by` is a calendar day
 * the desk wrote, and parsing it into an instant would let the reader's timezone
 * move it to the day before.
 */
function formatExitDate(exitBy: string): string {
  const [, month, day] = exitBy.split('-')
  const name = MONTHS[Number(month) - 1]
  if (!name || !day) return exitBy
  return `${Number(day)} ${name}`
}

function formatTarget(kind: string, value: number): string {
  if (kind === 'credit_pct') return `TP ${value}% of credit`
  if (kind === 'option_price') return `TP at ${value}`
  return `TP underlying ${value}`
}

function formatStop(kind: string, value: number): string {
  if (kind === 'credit_multiple') return `Stop ${value}× credit`
  if (kind === 'option_price') return `Stop at ${value}`
  return `Stop underlying ${value}`
}

/**
 * The exit the plan wrote, in one line — or null when it wrote none.
 *
 * Null is the whole point: a plan with no exit has nothing for a review to
 * compare against, which is not the same as an exit of zero.
 */
export function planExitSummary(
  plan: Pick<StrategyPlan, 'target_kind' | 'target_value' | 'stop_kind' | 'stop_value' | 'exit_by'>,
): string | null {
  const parts: string[] = []
  if (plan.target_kind && plan.target_value != null) {
    parts.push(formatTarget(plan.target_kind, plan.target_value))
  }
  if (plan.stop_kind && plan.stop_value != null) {
    parts.push(formatStop(plan.stop_kind, plan.stop_value))
  }
  if (plan.exit_by) parts.push(`Exit by ${formatExitDate(plan.exit_by)}`)
  return parts.length > 0 ? parts.join(' · ') : null
}

const STATUS_LABELS: Record<PlanEffectiveStatus, string> = {
  draft: 'Draft',
  intended: 'Intended',
  expired: 'Expired',
  filled: 'Filled',
  cancelled: 'Cancelled',
}

export function planStatusLabel(status: PlanEffectiveStatus): string {
  return STATUS_LABELS[status] ?? status
}
