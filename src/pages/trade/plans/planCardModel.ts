/**
 * Derivations the open plan reads — pure, so the card and the tests agree.
 *
 * Everything here is read out of the plan row itself. What needs the market
 * (a spot mark for Reg-T) or the account book (free cash, maintenance) is not
 * derived here at all; the card marks those cells and says why.
 */
import type { PlanLeg, StrategyPlan } from '@/lib/schemas/strategyPlan'

/** DDMMMYY-ish leg date, `2026-11-21` → `21Nov26` — §14.4's contract spelling. */
export function legExpiryText(expiry: string | null | undefined): string {
  if (!expiry || expiry.length < 10) return expiry ?? '—'
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const m = Number(expiry.slice(5, 7))
  if (!Number.isFinite(m) || m < 1 || m > 12) return expiry
  return `${expiry.slice(8, 10)}${months[m - 1]}${expiry.slice(2, 4)}`
}

export interface TimelineStep {
  label: string
  when: string | null
  on: boolean
}

/**
 * Draft → Intent → Filled/Expired → Linked, each from the field that stores it.
 * `Linked` is the instance link, the only record a fill leaves on the plan.
 */
export function planTimeline(
  plan: Pick<
    StrategyPlan,
    'created_at' | 'intended_at' | 'filled_at' | 'expires_at' | 'effective_status' | 'strategy_instance_id'
  >,
): TimelineStep[] {
  const day = (iso: string | null) => (iso ? iso.slice(0, 16).replace('T', ' ') : null)
  const expired = plan.effective_status === 'expired'
  return [
    { label: 'Draft', when: day(plan.created_at), on: true },
    { label: 'Intent', when: day(plan.intended_at), on: plan.intended_at != null },
    {
      label: expired ? 'Expired' : 'Filled',
      when: expired ? day(plan.expires_at) : day(plan.filled_at),
      on: expired || plan.filled_at != null,
    },
    {
      label: 'Linked',
      when: plan.strategy_instance_id ? `#${plan.strategy_instance_id}` : null,
      on: plan.strategy_instance_id != null,
    },
  ]
}

/**
 * The basket line the desk pastes into TWS — the design's Copy for TWS.
 * `AMD · Sell 6 21Nov26 140P · limit 2.45` per leg; nothing is sent anywhere.
 */
export function twsCopyText(
  plan: Pick<StrategyPlan, 'symbol' | 'qty' | 'legs_json' | 'limit_price'>,
): string {
  const legs = plan.legs_json
    .map((leg) => {
      const side = leg.side === 'sell' ? 'Sell' : 'Buy'
      const qty = plan.qty * leg.ratio
      if (leg.sec_type === 'STK') return `${side} ${qty * 100} shares`
      return `${side} ${qty} ${legExpiryText(leg.expiry)} ${leg.strike ?? ''}${leg.right ?? ''}`
    })
    .join(' · ')
  const limit = plan.limit_price != null ? ` · limit ${plan.limit_price}` : ''
  return `${plan.symbol} · ${legs}${limit}`
}

/**
 * What the plan's own legs secure. Short puts pin cash at strike × 100 × qty —
 * pure arithmetic on stored fields. Everything past that (Reg-T, free cash,
 * pressure) needs a spot mark or the account book and is NOT computed here.
 */
export function planCashSecured(
  plan: Pick<StrategyPlan, 'qty' | 'legs_json'>,
): number | null {
  const shortPuts = plan.legs_json.filter(
    (leg): leg is PlanLeg & { strike: number } =>
      leg.side === 'sell' && leg.right === 'P' && leg.strike != null,
  )
  if (shortPuts.length === 0) return null
  return shortPuts.reduce((sum, leg) => sum + leg.strike * 100 * plan.qty * leg.ratio, 0)
}

/** `+$1,470 · 1.75% on cash` when both halves are real; the credit alone otherwise. */
export function creditOnCash(credit: number | null, cashSecured: number | null): string | null {
  if (credit == null || cashSecured == null || cashSecured <= 0) return null
  return `${((credit / cashSecured) * 100).toFixed(2)}% on cash`
}

/**
 * The record behind the Intent section: the plan as stored, spelled as JSON.
 * It is `strategy_plan`, not the prototype's `research.ai_draft` — printing a
 * kind the server never wrote would fabricate a record.
 */
export function planIntentJson(plan: StrategyPlan): string {
  return JSON.stringify(
    {
      kind: 'strategy_plan',
      advisory: true,
      d10: 'BLOCKED',
      strategy_plan_id: plan.strategy_plan_id,
      symbol: plan.symbol,
      structure: plan.structure_label,
      account: plan.account_id,
      qty: plan.qty,
      legs: plan.legs_json.map((leg) => ({
        side: leg.side,
        sec_type: leg.sec_type,
        right: leg.right,
        strike: leg.strike,
        expiry: leg.expiry,
        ratio: leg.ratio,
        mid_at_plan: leg.mid_at_plan ?? null,
      })),
      limit_price: plan.limit_price,
      target: plan.target_kind ? { kind: plan.target_kind, value: plan.target_value } : null,
      stop: plan.stop_kind ? { kind: plan.stop_kind, value: plan.stop_value } : null,
      expires_at: plan.expires_at,
    },
    null,
    2,
  )
}

/** expires_at pushed to seven days from now, the design's window. */
export function extendedExpiry(nowIso: string): string {
  const t = new Date(nowIso)
  t.setUTCDate(t.getUTCDate() + 7)
  return t.toISOString().slice(0, 10)
}
