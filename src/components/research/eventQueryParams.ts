import type { EventKind } from '@/api/research/backtestEvent'

/**
 * `event_def.params` for the Event backtest form — the keys research's resolvers
 * read (engines/backtest/event_query.py). SEPA and IV thresholds are on the
 * stored 0–100 scale; until research 0.176.1 the form sent `min_total_score`
 * (never read) for SEPA and 0.8 for IV, and both fired on nearly every session.
 */
export function eventQueryParams(
  kind: EventKind,
  opts: { symbols: string[]; sepaMinScore: number; ivThreshold: number; ivDirection: 'above' | 'below'; signalId: string },
): Record<string, unknown> {
  const params: Record<string, unknown> = { symbols: opts.symbols }
  if (kind === 'sepa_hit') {
    params.threshold = opts.sepaMinScore
  } else if (kind === 'iv_percentile_threshold') {
    params.threshold = opts.ivThreshold
    params.direction = opts.ivDirection
  } else if (kind === 'indicator_signal') {
    params.signal = opts.signalId
  }
  return params
}
