/**
 * The model behind the inspector's Plan section (design Rev .138): the
 * fields as typed, and the write each one makes — none while a value is not
 * one the plan can hold yet.
 */
import type { PlanWriteBody } from '@/api/strategyPlans'
import type { PlanLeg, StrategyPlan } from '@/lib/schemas/strategyPlan'

/** What this section edits, in the shape the fields hold it. */
export interface PlanDraft {
  account_id: string
  qty: string
  legs: { strike: string; expiry: string }[]
  rationale: string
}

export type PlanEditField = 'account' | 'qty' | 'rationale' | `strike${number}` | `expiry${number}`

export function draftOf(plan: StrategyPlan): PlanDraft {
  return {
    account_id: plan.account_id,
    qty: String(plan.qty),
    legs: plan.legs_json.map((l) => ({
      strike: l.strike == null ? '' : String(l.strike),
      expiry: l.expiry ?? '',
    })),
    rationale: plan.rationale ?? '',
  }
}

/**
 * The write a field's value makes, or null when the value is not one the plan
 * can hold yet (an empty or partial number) — the field keeps what you typed,
 * and nothing is sent until it is a value.
 */
export function payloadFor(
  field: PlanEditField,
  draft: PlanDraft,
  legs: readonly PlanLeg[],
): Partial<PlanWriteBody> | null {
  if (field === 'account') return draft.account_id ? { account_id: draft.account_id } : null
  if (field === 'rationale') return { rationale: draft.rationale.trim() || null }
  if (field === 'qty') {
    const n = Number(draft.qty.replace(/,/g, ''))
    return Number.isInteger(n) && n >= 1 ? { qty: n } : null
  }
  const next: PlanLeg[] = []
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i]
    const d = draft.legs[i]
    if (leg.sec_type !== 'OPT' || !d) {
      next.push(leg)
      continue
    }
    const strike = d.strike.trim() === '' ? null : Number(d.strike.replace(/,/g, ''))
    if (strike != null && !(Number.isFinite(strike) && strike > 0)) return null
    if (d.expiry && !/^\d{4}-\d{2}-\d{2}$/.test(d.expiry)) return null
    next.push({ ...leg, strike, expiry: d.expiry || null })
  }
  return { legs_json: next }
}

