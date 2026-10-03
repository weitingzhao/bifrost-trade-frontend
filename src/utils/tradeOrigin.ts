/**
 * Where a trade came from (design Rev .112, §5.1.2): the plan it was opened
 * under, and through that plan the idea — its source, its reference, and the
 * screen and backtest run that argued for it.
 *
 * The plan is the only record that joins an idea to a trade: a plan names the
 * trade it became in `trade_id`. Source is the server's own five
 * values (Owner, Rev .108); the old Outcome page's four are not mapped onto
 * them. Lens and run have no store at all — no plan or trade field holds
 * either — so they read as unrecorded rather than as "none".
 *
 * Measured on DEV 2026-09-29: 3 plans on file, all cancelled, none linked to a
 * trade — so today every trade reads "no plan".
 */
import type { PlanSourceKind, StrategyPlan } from '@/lib/schemas/strategyPlan'

/**
 * Where settled money is read by where the idea came from (Rev .112): the
 * retired Outcome page's address forwards here, and every door that used to
 * open Outcome opens this.
 */
export const RECORD_BY_SOURCE_PATH = '/review/playbook?tab=record&cut=source'

/** The server's enum, in the order Trade Plans offers it. */
export const PLAN_SOURCE_KINDS = ['manual', 'symbol', 'hypothesis', 'inbox_draft', 'roll'] as const satisfies readonly PlanSourceKind[]

export const PLAN_SOURCE_LABELS: Record<PlanSourceKind, string> = {
  manual: 'Manual',
  symbol: 'Symbol',
  hypothesis: 'Hypothesis',
  inbox_draft: 'Inbox draft',
  roll: 'Roll',
}

/** One line on what each source means, as the Record table subtitles it. */
export const PLAN_SOURCE_SUBS: Record<PlanSourceKind, string> = {
  hypothesis: 'from The Book › Hypotheses',
  symbol: 'from a Symbol reading',
  inbox_draft: 'an approved Decision Inbox draft',
  manual: 'a judgement call',
  roll: 'continues an earlier trade',
}

/** The two halves of an idea's origin nothing stores yet. */
export const ORIGIN_UNRECORDED = {
  lens: 'Nothing records the screen an idea came through: no plan or trade field holds a lens.',
  run: 'No backtest run is linked to a plan or a trade, so there is nothing to compare the result against.',
} as const

export interface TradeOrigin {
  planId: number
  sourceKind: PlanSourceKind
  source: string
  ref: string | null
  /** `YYYY-MM-DD` the plan said to be out by; null when it named no date. */
  exitBy: string | null
  targetKind: StrategyPlan['target_kind']
  targetValue: number | null
  stopKind: StrategyPlan['stop_kind']
  stopValue: number | null
}

/**
 * The plan behind each trade, keyed by trade id. A trade two plans name keeps
 * the one that reached it — filled over any other status — and, between equals,
 * the newer plan.
 */
export function originsByTrade(plans: readonly StrategyPlan[]): Map<number, TradeOrigin> {
  const out = new Map<number, TradeOrigin>()
  const filledPlan = new Set<number>()
  for (const p of plans) {
    const id = p.trade_id
    if (id == null) continue
    const filled = p.status === 'filled'
    const cur = out.get(id)
    const curFilled = cur != null && filledPlan.has(cur.planId)
    if (cur && ((curFilled && !filled) || (curFilled === filled && cur.planId > p.strategy_plan_id))) continue
    if (filled) filledPlan.add(p.strategy_plan_id)
    out.set(id, {
      planId: p.strategy_plan_id,
      sourceKind: p.source_kind,
      source: PLAN_SOURCE_LABELS[p.source_kind],
      ref: p.source_ref?.trim() || null,
      exitBy: p.exit_by ? p.exit_by.slice(0, 10) : null,
      targetKind: p.target_kind,
      targetValue: p.target_value,
      stopKind: p.stop_kind,
      stopValue: p.stop_value,
    })
  }
  return out
}

/**
 * A plan's one written form (Rev .113, §5.1.4a): `TP-` and the id padded to
 * four digits (`TP-0007`, `TP-0212`; 10000 and up as is). `#NNN` is a Trade's.
 */
export function planToken(planId: number): string {
  return `TP-${String(planId).padStart(4, '0')}`
}

/** Trading › Plans with this plan selected — where a TP token lands. */
export function planPath(planId: number): string {
  return `/trade/plans?plan=${planId}`
}

/** The plan's exit terms in a line: target, stop and the date, each only when the plan wrote it. */
export function planTermsText(o: TradeOrigin): string {
  const target =
    o.targetValue == null
      ? null
      : o.targetKind === 'credit_pct'
        ? `target ${o.targetValue}% of credit kept`
        : o.targetKind === 'underlying_price'
          ? `target underlying $${o.targetValue}`
          : `target $${o.targetValue}`
  const stop =
    o.stopValue == null
      ? null
      : o.stopKind === 'credit_multiple'
        ? `stop at a loss of ${o.stopValue}× credit`
        : o.stopKind === 'underlying_price'
          ? `stop underlying $${o.stopValue}`
          : `stop $${o.stopValue}`
  const parts = [target, stop, o.exitBy ? `out by ${o.exitBy}` : null].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'no target, stop or exit date written'
}
