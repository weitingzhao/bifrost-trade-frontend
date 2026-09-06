/** Shared formatters for the pipeline views — kept apart so the stepper and the
 *  rules panel can both use them without importing each other. */

/** Thousands separators; counts here run to five figures. */
export function num(n: number): string {
  return n.toLocaleString('en-US')
}

/** Two significant figures is enough to see where a five-second run went. */
export function fmtStageMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function pct(n: number, d: number): string {
  if (!d) return '—'
  return `${((n / d) * 100).toFixed(n / d < 0.01 ? 2 : 1)}%`
}

/** "$0.0003" for cents-of-a-cent LLM spend, "$1.23" once it is money. */
export function fmtJudgeCost(usd: number): string {
  if (usd === 0) return '$0'
  return `$${usd.toFixed(Math.abs(usd) < 0.01 ? 4 : 2)}`
}
