/**
 * How much risk the book may add, and how big one trade may be.
 *
 * Two pages read this: Risk Budget states the lines and what has been spent
 * against them, Sizing spends them one candidate at a time. They share the
 * derivation rather than each writing their own, because a budget that two
 * pages compute differently is worse than no budget.
 *
 * The lines themselves are a *policy*, edited in the design's Rules engine.
 * That engine does not exist on this side, so every line here is nullable and
 * a null says "nobody has written this", never "zero". The distinction is the
 * whole point: a per-trade cap of zero would block every trade, and a per-trade
 * cap that was never written blocks nothing and protects nothing.
 *
 * Budget is spent on **decisions**, not fills — a sized plan reserves its max
 * loss the moment it leaves Sizing and releases it if it is cancelled unfilled.
 * Closes and derisks never consume budget.
 */

/** The lines the design edits in Rules. Null is "never written". */
export interface RiskPolicy {
  perTradePct: number | null
  dailyCapPct: number | null
  weeklyCapPct: number | null
}

/** Nothing on this side stores the policy yet. */
export const UNWRITTEN_POLICY: RiskPolicy = {
  perTradePct: null,
  dailyCapPct: null,
  weeklyCapPct: null,
}

export const RISK_BUDGET_UNRECORDED = {
  policy:
    'The three lines are a policy the design edits in Trade › Rules, and this side has no store for it. Every line below is unwritten — not zero. A cap of zero would block every trade; a cap that was never written blocks nothing, and saying so is the only honest reading.',
  spend:
    'Budget is spent on decisions, not fills: a sized plan reserves its max loss the moment it leaves Sizing, and releases it if the plan is cancelled unfilled. Closes and derisks never consume budget. Nothing records a sizing decision on this side, so nothing can be shown as spent — which is not the same as nothing having been spent.',
  log: 'What was suggested, what was taken, and how it turned out is Review’s subject. Nothing writes a sizing decision, so the log has no rows to carry rather than no decisions to show.',
  overrides:
    'The design allows an override downward only: sizing up means changing the cap itself, in Rules. With no cap written, there is nothing to override in either direction.',
} as const

export interface BudgetReadings {
  /** Net liquidation the percentages are taken of. */
  netLiquidation: number | null
  policy: RiskPolicy
  /** Risk reserved by today's decisions; null when nothing records one. */
  spentToday: number | null
  /** Risk reserved since Monday; null for the same reason. */
  spentThisWeek: number | null
}

export interface BudgetLine {
  key: 'per-trade' | 'daily' | 'weekly'
  label: string
  scope: string
  pct: number | null
  /** `pct × netLiquidation`, when both are known. */
  amount: number | null
  spent: number | null
  /** What is left of the line; null when either side is unknown. */
  left: number | null
  /** 0–1+ of the line consumed. */
  use: number | null
  breached: boolean
  /** Why this line cannot be read, when it cannot. */
  noLine: string | null
}

export function budgetLines(r: BudgetReadings): BudgetLine[] {
  const nlv = r.netLiquidation != null && r.netLiquidation > 0 ? r.netLiquidation : null
  const line = (
    key: BudgetLine['key'],
    label: string,
    scope: string,
    pct: number | null,
    spent: number | null,
  ): BudgetLine => {
    const amount = pct != null && nlv != null ? pct * nlv : null
    const use = amount != null && amount > 0 && spent != null ? spent / amount : null
    return {
      key,
      label,
      scope,
      pct,
      amount,
      spent,
      left: amount != null && spent != null ? amount - spent : null,
      use,
      breached: use != null && use > 1,
      noLine:
        pct == null
          ? 'no line written'
          : nlv == null
            ? 'the broker reported no net liquidation to take the percentage of'
            : null,
    }
  }
  return [
    line('per-trade', 'Per trade', 'one decision', r.policy.perTradePct, null),
    line('daily', 'Daily open-risk cap', 'today', r.policy.dailyCapPct, r.spentToday),
    line('weekly', 'Weekly open-risk cap', 'Mon–today', r.policy.weeklyCapPct, r.spentThisWeek),
  ]
}

/** What Sizing is allowed to put on, per candidate. */
export interface SizingCaps {
  /** Loss if the structure goes fully against you, per contract. */
  maxLossPerContract: number | null
  /** Margin the broker would hold, per contract. */
  marginPerContract: number | null
  /** The per-trade risk line, in currency. */
  riskBudgetPerTrade: number | null
  /** Room to the backing gate, in currency. */
  marginHeadroom: number | null
  /** β-weighted Δ$ the candidate adds per contract. */
  betaDeltaPerContract: number | null
  /** The name's β-Δ$ before the trade, and the book's. */
  nameBetaDelta: number | null
  bookBetaDelta: number | null
  concentrationCeiling: number
  /**
   * Room left under the active allocation's gate, in contracts.
   *
   * The fourth cap (design DECISIONS 2026-09-18). A gate is a limit at scope =
   * allocation, so it only applies to a candidate an opportunity covers; a hand
   * plan is outside every allocation and the cap does not apply to it at all.
   * `null` is that case — *not applicable*, which is a different answer from
   * *could not be computed*, and the one place this model must not conflate
   * them: treating "no gate applies" as a missing cap would make a hand plan
   * look constrained by a rule it is not under.
   */
  gateRoom: number | null
  /** True when an opportunity covers the candidate and a gate therefore applies. */
  gateApplies: boolean
}

export type BindingCap = 'risk' | 'margin' | 'concentration' | 'gate'

export interface SizingResult {
  nByRisk: number | null
  nByMargin: number | null
  nByConcentration: number | null
  /** Null when no gate applies — see `SizingCaps.gateRoom`. */
  nByGate: number | null
  /** The smallest cap that could be computed. Null when none could. */
  n: number | null
  binding: BindingCap | null
  /** Caps that could not be computed, and why — never silently skipped. */
  missing: { cap: BindingCap; why: string }[]
}

/**
 * How many contracts each cap allows, and which one binds.
 *
 * Every cap floors: a cap that allows 2.9 contracts allows two. A cap that
 * cannot be computed is listed in `missing` rather than treated as unlimited,
 * because an uncomputed cap silently widens the answer — the one failure mode
 * that matters in a sizing tool.
 */
export function sizeCandidate(c: SizingCaps): SizingResult {
  const missing: SizingResult['missing'] = []

  let nByRisk: number | null = null
  if (c.riskBudgetPerTrade == null) missing.push({ cap: 'risk', why: 'no per-trade risk line is written' })
  else if (c.maxLossPerContract == null || c.maxLossPerContract <= 0)
    missing.push({ cap: 'risk', why: 'the candidate carries no max loss per contract' })
  else nByRisk = Math.max(0, Math.floor(c.riskBudgetPerTrade / c.maxLossPerContract))

  let nByMargin: number | null = null
  if (c.marginHeadroom == null) missing.push({ cap: 'margin', why: 'nothing priced the room to the gate' })
  else if (c.marginPerContract == null || c.marginPerContract <= 0)
    missing.push({ cap: 'margin', why: 'the candidate carries no margin per contract' })
  else nByMargin = Math.max(0, Math.floor(c.marginHeadroom / c.marginPerContract))

  let nByConcentration: number | null = null
  if (c.betaDeltaPerContract == null || Math.abs(c.betaDeltaPerContract) <= 0) {
    missing.push({ cap: 'concentration', why: 'the candidate carries no β-weighted Δ$' })
  } else if (c.nameBetaDelta == null || c.bookBetaDelta == null || c.bookBetaDelta <= 0) {
    missing.push({ cap: 'concentration', why: 'the book carries no β-weighted Δ$ to take a share of' })
  } else {
    // Adding n contracts moves both the name and the book, so the ceiling is
    // solved rather than divided into: (name + n·d) / (book + n·d) ≤ ceiling.
    const d = Math.abs(c.betaDeltaPerContract)
    const room = c.concentrationCeiling * c.bookBetaDelta - Math.abs(c.nameBetaDelta)
    const slope = d * (1 - c.concentrationCeiling)
    nByConcentration = slope <= 0 ? 0 : Math.max(0, Math.floor(room / slope))
  }

  // A gate that does not apply is silent: it neither caps nor reports missing.
  let nByGate: number | null = null
  if (c.gateApplies) {
    if (c.gateRoom == null) missing.push({ cap: 'gate', why: 'the gate applies, but nothing reads the room left under it' })
    else nByGate = Math.max(0, Math.floor(c.gateRoom))
  }

  const caps: { cap: BindingCap; n: number }[] = []
  if (nByRisk != null) caps.push({ cap: 'risk', n: nByRisk })
  if (nByMargin != null) caps.push({ cap: 'margin', n: nByMargin })
  if (nByConcentration != null) caps.push({ cap: 'concentration', n: nByConcentration })
  if (nByGate != null) caps.push({ cap: 'gate', n: nByGate })
  const smallest = caps.length === 0 ? null : caps.reduce((a, b) => (b.n < a.n ? b : a))

  return {
    nByRisk,
    nByMargin,
    nByConcentration,
    nByGate,
    n: smallest?.n ?? null,
    binding: smallest?.cap ?? null,
    missing,
  }
}
