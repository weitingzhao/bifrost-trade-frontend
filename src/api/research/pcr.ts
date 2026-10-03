/**
 * One name's daily put/call ratios from Research's PCR store
 * (`features.option_metric_pcr_daily`, `/analytics/options/pcr`). The store
 * has gaps — PLTR carries 103 sessions over 2025-11…2026-09 — so callers
 * place readings by date, not by index.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { PcrHistorySchema } from '@/lib/schemas/research'
import { HttpError, requestJson } from '@/lib/http'

export interface PcrRow {
  symbol: string
  trade_date: string
  pcr_oi: number | null
  pcr_volume: number | null
  total_put_oi?: number | null
  total_call_oi?: number | null
  total_put_volume?: number | null
  total_call_volume?: number | null
}

const validatePcr = withValidation<{ rows: PcrRow[]; count: number }>(PcrHistorySchema, 'research/analytics/options/pcr')

/** Oldest first; a name with no rows answers []. */
export async function fetchPcrHistory(symbol: string, lookbackDays = 365): Promise<PcrRow[]> {
  const sym = (symbol || '').trim().toUpperCase()
  if (!sym) return []
  const q = new URLSearchParams({ symbol: sym, lookback_days: String(lookbackDays) })
  let raw: unknown
  try {
    raw = await requestJson<unknown>(`${researchEngineUrl('/analytics/options/pcr')}?${q}`, {
      label: 'research /analytics/options/pcr',
    })
  } catch (e) {
    // No rows for the name is a 404 — an answer, not a failure.
    if (e instanceof HttpError && e.status === 404) return []
    throw e
  }
  const j = validatePcr(raw)
  return [...j.rows].sort((a, b) => a.trade_date.localeCompare(b.trade_date))
}
