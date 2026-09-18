/**
 * Corporate actions from the Market Data Plugin.
 *
 * One symbol per call — the plugin's endpoint takes `symbol`, not a list — so
 * the caller fans out over the book and the query cache holds one entry per
 * name. Measured 2026-09-17 on DEV: deep history (INTC back to 1980) and not one
 * row dated ahead of today on any of the 28 symbols checked. That is the book's
 * quiet period, not the feed's reach — the plugin's nightly whole-market pull
 * asks for a −7 / +60 day window (3,736 dividend rows that night), and names
 * that declare early do come back dated ahead. A dividend simply does not exist
 * until its issuer declares it.
 *
 * Nothing here writes.
 */
import { marketDataPluginUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { CorporateActionsResponseSchema } from '@/lib/schemas/marketData'

export interface CorporateActionRow {
  symbol: string
  action_type: string
  ex_date: string | null
  record_date: string | null
  payment_date: string | null
  /** A split's ratio, read `ratio_from : ratio_to` — 1 : 10 is a ten-for-one. */
  ratio_from: number | null
  ratio_to: number | null
  /** Per share, on a dividend. Null on a split. */
  amount: number | null
  currency: string | null
  /** The vendor's own annotation: a payment frequency, or an adjustment type. */
  description?: string | null
  /** When the plugin last pulled this row — the backfill's own stamp. */
  fetched_at?: string | null
}

export interface CorporateActionsResponse {
  ok: boolean
  symbol: string
  rows: CorporateActionRow[]
  count: number
}

const validate = withValidation<CorporateActionsResponse>(
  CorporateActionsResponseSchema,
  'market-data/market/corporate-actions',
)

export async function fetchCorporateActions(
  symbol: string,
  limit = 400,
  signal?: AbortSignal,
): Promise<CorporateActionsResponse> {
  const params = new URLSearchParams({ symbol, limit: String(limit) })
  const res = await fetch(`${marketDataPluginUrl('/market/corporate-actions')}?${params.toString()}`, {
    signal,
  })
  if (!res.ok) throw new Error(`corporate-actions ${symbol}: ${res.status}`)
  return validate(await res.json())
}
