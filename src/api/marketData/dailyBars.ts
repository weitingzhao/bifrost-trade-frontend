/**
 * Daily bars for one option contract and its underlying.
 *
 * Review's method needs a trade's *path*, not just its two ends: the best mark
 * it printed, the worst it sat through, and where those fell relative to the
 * exit. Until 2026-09-18 that path was recorded as missing on every Review
 * page; it is not — `market.option_daily` carries the contract's own daily
 * OHLCV, and a fill-by-fill check against it put every fill price inside its
 * day's low–high range.
 *
 * Coverage measured the same day, over all 67 closed trades in the DEV book:
 * 60 have a bar on 80%+ of the business days they were held, 5 are partial, 0
 * are empty, and 2 could not be asked because their closing fill carries no
 * date. Partial is a real state, so the caller is handed the bar count and the
 * window it actually got rather than a curve that silently interpolates.
 *
 * This reads across the domain boundary into the market-data warehouse and
 * stays a read (D13).
 */
import { marketDataPluginUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { OptionDailyResponseSchema, StockDailyResponseSchema } from '@/lib/schemas/marketData'

export interface DailyBar {
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
}

interface OptionDailyResponse {
  ok: boolean
  rows: { option_ticker: string; bar_date: string; open: number | null; high: number | null; low: number | null; close: number | null }[]
}

interface StockDailyResponse {
  ok: boolean
  data: Record<string, { symbol: string; bar_time: string; close: number | null }[]>
}

const validateOptionDaily = withValidation<OptionDailyResponse>(
  OptionDailyResponseSchema,
  'market-data/options/daily',
)

const validateStockDaily = withValidation<StockDailyResponse>(
  StockDailyResponseSchema,
  'market-data/stocks/db/bars/daily',
)

/**
 * The vendor's ticker for an OCC contract key.
 *
 * The ledger's `contract_key` opens with the 21-character OSI symbol — six
 * characters of root, space-padded, then `YYMMDD`, `C`/`P` and the strike in
 * thousandths. The vendor drops the padding and prefixes `O:`.
 */
export function occToOptionTicker(contractKey: string): string | null {
  const osi = contractKey.split('|')[0] ?? ''
  if (osi.length < 21) return null
  const root = osi.slice(0, 6).trim()
  const tail = osi.slice(6, 21)
  if (!root || !/^\d{6}[CP]\d{8}$/.test(tail)) return null
  return `O:${root}${tail}`
}

/** One contract's daily bars over a closed date range, earliest first. */
export async function fetchOptionDailyBars(
  optionTicker: string,
  from: string,
  to: string,
): Promise<DailyBar[]> {
  const qs = new URLSearchParams({ option_ticker: optionTicker, from, to, limit: '5000' })
  const res = await fetch(marketDataPluginUrl(`/market/options/daily?${qs}`))
  if (!res.ok) throw new Error(`market-data /options/daily: ${res.status}`)
  const j = validateOptionDaily(await res.json()) as Partial<OptionDailyResponse>
  const rows = Array.isArray(j.rows) ? j.rows : []
  return rows
    .map((r) => ({ date: String(r.bar_date).slice(0, 10), open: r.open, high: r.high, low: r.low, close: r.close }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * One underlying's daily closes, earliest first.
 *
 * The endpoint takes a lookback in days rather than a window, so the caller's
 * range is turned into a lookback and the result sliced back down here.
 */
export async function fetchStockDailyCloses(symbol: string, from: string, to: string): Promise<DailyBar[]> {
  const start = Date.parse(`${from}T00:00:00Z`)
  const days = Number.isFinite(start)
    ? Math.min(3000, Math.max(1, Math.ceil((Date.now() - start) / 86_400_000) + 5))
    : 400
  const qs = new URLSearchParams({ symbols: symbol, days: String(days) })
  const res = await fetch(marketDataPluginUrl(`/market/stocks/db/bars/daily?${qs}`))
  if (!res.ok) throw new Error(`market-data /stocks/db/bars/daily: ${res.status}`)
  const j = validateStockDaily(await res.json()) as Partial<StockDailyResponse>
  const rows = j.data?.[symbol] ?? []
  return rows
    .map((r) => ({ date: String(r.bar_time).slice(0, 10), open: null, high: null, low: null, close: r.close }))
    .filter((b) => b.date >= from && b.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))
}
