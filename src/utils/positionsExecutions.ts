import type { Execution } from '@/types/positions'

/** Align position vs execution contract_key: OCC local differs in segment 1; OPT|expiry|strike|right match. */
export function optExecutionMatchKey(accountId: string, contractKey: string): string {
  const acc = (accountId ?? '').trim()
  const parts = (contractKey ?? '').split('|')
  if (parts.length >= 5 && (parts[1] ?? '').toUpperCase().trim() === 'OPT') {
    const exp = (parts[2] ?? '').trim()
    const sn = parseFloat(String(parts[3] ?? '').trim())
    const strikeKey = Number.isFinite(sn) ? String(sn) : (parts[3] ?? '').trim()
    const right = (parts[4] ?? '').trim().toUpperCase().slice(0, 1)
    return `${acc}|OPT|${exp}|${strikeKey}|${right}`
  }
  return `${acc}|${(contractKey ?? '').trim()}`
}

export function buildLiveOptExecutionMap(executions: Execution[]): Map<string, Execution[]> {
  const map = new Map<string, Execution[]>()
  const opt = executions.filter((e) => (e.sec_type ?? '').toUpperCase() === 'OPT')
  for (const ex of opt) {
    if (ex.account_executions_id == null) continue
    const key = optExecutionMatchKey(ex.account_id ?? '', ex.contract_key ?? '')
    const arr = map.get(key)
    if (arr) arr.push(ex)
    else map.set(key, [ex])
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
  }
  return map
}

export function positionExecsForAttribution(full: { final: Execution[]; tws: Execution[] }): Execution[] {
  return full.final.length > 0 ? full.final : full.tws
}

export function mergeExecsUniqueById(a: Execution[], b: Execution[]): Execution[] {
  const seen = new Set<number>()
  const out: Execution[] = []
  for (const e of [...a, ...b]) {
    const id = e.account_executions_id
    if (id == null) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(e)
  }
  return out
}

export function executionStrategyInstanceIds(ex: Execution): number[] {
  const allocs = ex.instance_allocations
  if (allocs && allocs.length > 0) {
    const out: number[] = []
    for (const a of allocs) {
      const id = a.strategy_instance_id
      if (id != null && Number.isFinite(Number(id))) out.push(Number(id))
    }
    if (out.length > 0) return out
  }
  if (ex.strategy_instance_id != null && Number.isFinite(Number(ex.strategy_instance_id))) {
    return [Number(ex.strategy_instance_id)]
  }
  return []
}

export function executionMatchesInstanceGroup(
  ex: Execution,
  strategyInstanceId: number | null,
  strategyOpportunityId: number | null,
): boolean {
  if (strategyInstanceId == null) {
    return executionStrategyInstanceIds(ex).length === 0
  }
  const ids = executionStrategyInstanceIds(ex)
  if (!ids.includes(strategyInstanceId)) return false
  if (strategyOpportunityId == null) return true
  const exOpp =
    ex.strategy_opportunity_id != null && Number.isFinite(Number(ex.strategy_opportunity_id))
      ? Number(ex.strategy_opportunity_id)
      : null
  if (exOpp != null && exOpp !== strategyOpportunityId) return false
  return true
}

export function execPremiumPnl(execs: Execution[]): number {
  let sellPremium = 0
  let buyCost = 0
  for (const e of execs) {
    const side = (e.side ?? '').toUpperCase()
    const q = Math.abs(Number(e.quantity ?? e.qty) || 0)
    const p = Number(e.price) || 0
    const c = Number(e.commission) || 0
    if (side === 'SELL' || side === 'SLD' || side === 'S') {
      sellPremium += p * q * 100 - c
    } else if (side === 'BUY' || side === 'BOT' || side === 'B') {
      buyCost += p * q * 100 + c
    }
  }
  return sellPremium - buyCost
}
