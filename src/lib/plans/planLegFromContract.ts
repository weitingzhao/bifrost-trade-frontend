/**
 * Reading a contract label into a leg draft — without a side.
 *
 * `NVDA 2026-11-20 245C` names the contract. It never says buy or sell, so the
 * draft has no direction; the reader picks one in the form before the plan can
 * be marked intended. Anything unparseable yields no drafts rather than a guess.
 */
export type PlanLegDraft = {
  sec_type: 'OPT'
  right: 'C' | 'P'
  strike: number
  expiry: string
  ratio: number
  contract_key: string
}

const LEG = /\b([A-Z][A-Z.]{0,9})\s+(\d{4}-\d{2}-\d{2})\s+(\d+(?:\.\d+)?)\s*([CP])\b/g

export function planLegsFromContract(contract: string | null | undefined): PlanLegDraft[] {
  if (!contract) return []
  const legs: PlanLegDraft[] = []
  for (const match of contract.toUpperCase().matchAll(LEG)) {
    const [, symbol, expiry, strike, right] = match
    legs.push({
      sec_type: 'OPT',
      right: right as 'C' | 'P',
      strike: Number(strike),
      expiry,
      ratio: 1,
      contract_key: `${symbol}|OPT|${expiry.replace(/-/g, '')}|${strike}|${right}`,
    })
  }
  return legs
}
