import type { Execution } from '@/types/positions'
import { optExecutionMatchKey } from '@/utils/positionsExecutions'

/** Match TWS raw row to performance-book row: exec_id + account, else contract + time. */
export function findMatchingFinalForTws(t: Execution, finals: Execution[]): Execution | null {
  const acc = (t.account_id ?? '').trim()
  const eid = (t.exec_id ?? '').trim()
  if (eid) {
    const hit = finals.find(
      (f) => (f.exec_id ?? '').trim() === eid && (f.account_id ?? '').trim() === acc,
    )
    if (hit) return hit
  }
  const tt = t.time != null && Number.isFinite(Number(t.time)) ? Number(t.time) : null
  const ck = (t.contract_key ?? '').trim()
  if (tt == null || !ck) return null
  return (
    finals.find((f) => {
      if ((f.account_id ?? '').trim() !== acc) return false
      if ((f.contract_key ?? '').trim() !== ck) return false
      const ft = f.time != null ? Number(f.time) : null
      return ft != null && Math.abs(ft - tt) < 1.5
    }) ?? null
  )
}

/** Match performance-book row to TWS raw row (same rules as findMatchingFinalForTws). */
export function findMatchingTwsForFinal(f: Execution, twsRows: Execution[]): Execution | null {
  const acc = (f.account_id ?? '').trim()
  const eid = (f.exec_id ?? '').trim()
  if (eid) {
    const hit = twsRows.find(
      (t) => (t.exec_id ?? '').trim() === eid && (t.account_id ?? '').trim() === acc,
    )
    if (hit) return hit
  }
  const ft = f.time != null && Number.isFinite(Number(f.time)) ? Number(f.time) : null
  const ck = (f.contract_key ?? '').trim()
  if (ft == null || !ck) return null
  return (
    twsRows.find((t) => {
      if ((t.account_id ?? '').trim() !== acc) return false
      if ((t.contract_key ?? '').trim() !== ck) return false
      const tt = t.time != null ? Number(t.time) : null
      return tt != null && Math.abs(tt - ft) < 1.5
    }) ?? null
  )
}

export function hasStrategyAttribution(ex: Execution): boolean {
  return ex.strategy_instance_id != null || ex.strategy_opportunity_id != null
}

/** TWS row needs sync when final peer has attribution and ids differ. */
export function twsNeedsStrategySyncFromFinal(t: Execution, f: Execution): boolean {
  if (!hasStrategyAttribution(f)) return false
  const siT = t.strategy_instance_id ?? null
  const soT = t.strategy_opportunity_id ?? null
  const siF = f.strategy_instance_id ?? null
  const soF = f.strategy_opportunity_id ?? null
  return siT !== siF || soT !== soF
}

/** Final row needs sync when TWS peer has attribution and ids differ. */
export function finalNeedsStrategySyncFromTws(f: Execution, t: Execution): boolean {
  if (!hasStrategyAttribution(t)) return false
  const siT = t.strategy_instance_id ?? null
  const soT = t.strategy_opportunity_id ?? null
  const siF = f.strategy_instance_id ?? null
  const soF = f.strategy_opportunity_id ?? null
  return siT !== siF || soT !== soF
}

export function buildCanonicalOptContractKeySet(executions: Execution[]): Set<string> {
  const s = new Set<string>()
  for (const e of executions) {
    if ((e.sec_type ?? '').toUpperCase() !== 'OPT') continue
    if (e.account_executions_id == null) continue
    s.add(optExecutionMatchKey(e.account_id ?? '', e.contract_key ?? ''))
  }
  return s
}

export function shouldShowOptionExecSync(params: {
  book: 'final' | 'tws'
  exec: Execution
  crossBookMatch: Execution | null
  canonicalOptContractKeys: Set<string>
}): boolean {
  const { book, exec, crossBookMatch, canonicalOptContractKeys } = params
  if (crossBookMatch == null) return false
  const contractKey = optExecutionMatchKey(exec.account_id ?? '', exec.contract_key ?? '')
  if (!canonicalOptContractKeys.has(contractKey)) return false
  if (book === 'tws') return twsNeedsStrategySyncFromFinal(exec, crossBookMatch)
  return finalNeedsStrategySyncFromTws(exec, crossBookMatch)
}
