/**
 * One name's daily put/call ratios from Research's PCR store
 * (`features.option_metric_pcr_daily`, `/analytics/options/pcr`). The store
 * has gaps — PLTR carries 103 sessions over 2025-11…2026-09 — so callers
 * place readings by date, not by index.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { PcrHistorySchema } from '@/lib/schemas/research'

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
  const res = await fetch(`${researchEngineUrl('/analytics/options/pcr')}?${q}`)
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`research /analytics/options/pcr: ${res.status}`)
  const j = validatePcr(await res.json())
  return [...j.rows].sort((a, b) => a.trade_date.localeCompare(b.trade_date))
}
