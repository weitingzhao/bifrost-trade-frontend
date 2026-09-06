/**
 * Reading the receipt an outcome rule leaves on a hypothesis (B3).
 *
 * A Validated tag with nothing behind it reads like a click. The line these
 * helpers produce says what settled it: the excess over the benchmark at the
 * horizon, against the threshold that decided.
 */
import type { Hypothesis, HypothesisResolution } from '@/api/researchHypothesis'

export function isRuleResolved(h: Pick<Hypothesis, 'resolution_json'>): boolean {
  const r = h.resolution_json
  return !!r && typeof r === 'object' && (r.decision === 'validated' || r.decision === 'rejected')
}

function signedPctText(v: number): string {
  const pct = v * 100
  return `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(2)}%`
}

/**
 * "By outcome rule · +4.20% vs SPY over 20 sessions (validate ≥ +3.00%)".
 * Null when the receipt is missing the number it is supposed to carry.
 */
export function resolutionLine(r: HypothesisResolution | null | undefined): string | null {
  if (!r || typeof r !== 'object') return null
  const excess = r.outcome?.excess_return
  if (typeof excess !== 'number' || !Number.isFinite(excess)) return null
  const bench = r.outcome?.benchmark_symbol ?? r.rule?.benchmark ?? 'benchmark'
  const horizon = r.outcome?.horizon_days ?? r.rule?.horizon_days
  const window = typeof horizon === 'number' ? ` over ${horizon} session${horizon === 1 ? '' : 's'}` : ''
  const threshold =
    r.decision === 'validated' && typeof r.rule?.validate_excess === 'number'
      ? ` (validate ≥ ${signedPctText(r.rule.validate_excess)})`
      : r.decision === 'rejected' && typeof r.rule?.reject_excess === 'number'
        ? ` (reject ≤ ${signedPctText(r.rule.reject_excess)})`
        : ''
  return `By outcome rule · ${signedPctText(excess)} vs ${bench}${window}${threshold}`
}
