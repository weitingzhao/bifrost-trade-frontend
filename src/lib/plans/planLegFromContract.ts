/**
 * Reading legs out of a contract label.
 *
 * Symbol and the chain hand `＋ Plan this` a human label like
 * `NVDA 2026-11-20 245C`. That is enough to write the leg down, so the draft
 * arrives with legs rather than empty — but not enough to know direction, so
 * every parsed leg starts as `sell` and the reader confirms it in Edit before
 * marking the plan intended. Anything unparseable yields no legs at all rather
 * than a guess.
 */
import type { PlanLeg } from '@/lib/schemas/strategyPlan'

const LEG = /\b([A-Z][A-Z.]{0,9})\s+(\d{4}-\d{2}-\d{2})\s+(\d+(?:\.\d+)?)\s*([CP])\b/g

export function planLegsFromContract(contract: string | null | undefined): PlanLeg[] {
  if (!contract) return []
  const legs: PlanLeg[] = []
  for (const match of contract.toUpperCase().matchAll(LEG)) {
    const [, symbol, expiry, strike, right] = match
    legs.push({
      side: 'sell',
      sec_type: 'OPT',
      right: right as 'C' | 'P',
      strike: Number(strike),
      expiry,
      ratio: 1,
      contract_key: `${symbol}|OPT|${expiry.replace(/-/g, '')}|${strike}|${right}`,
      mid_at_plan: null,
      quote_asof: null,
    })
  }
  return legs
}
