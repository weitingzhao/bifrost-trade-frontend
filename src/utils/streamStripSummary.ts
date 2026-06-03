import type { StatusResponse } from '@/types/monitor'
import type { DailyBenchmark, QuoteItem } from '@/types/market'
import { fmtPctCompact, fmtUsdCompact } from '@/lib/format'
import {
  computeMarketStreamsLamp,
  computeMarketStreamsOk,
  computeOpenOrdersLamp,
  type LampColor,
} from '@/utils/livePageLamps'
import { computeMarketStreamDailyChange } from '@/utils/marketStreamsDailyTotals'
import { computeAccountSyncLamp } from '@/utils/daemonLamps'
import { quoteDisplayLast } from '@/utils/watchlistHelpers'
import { streamSymbolFromQuoteMapKey } from '@/utils/marketStreamsRows'

export type StreamStripTone = 'positive' | 'negative' | 'neutral'

export interface StreamStripSymbolRow {
  symbol: string
  changePct: number | null
  pnlVsBench: number | null
  tone: StreamStripTone
  displayValue: string
}

export interface StreamStripModel {
  streamsOnline: boolean
  streamsLamp: LampColor
  ordersLamp: LampColor
  openOrderCount: number
  ordersLampTitle: string
  totalDailyDollar: number
  totalDailyPct: number | null
  totalDailyPctDisplay: string
  totalDailyDollarDisplay: string
  totalDailyTone: StreamStripTone
  symbolRows: StreamStripSymbolRow[]
}

function toneForNumber(value: number | null | undefined): StreamStripTone {
  if (value == null || !Number.isFinite(value)) return 'neutral'
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'neutral'
}

/** Legacy L831–833: subscribed tickers plus any symbol already in the quotes cache. */
export function buildStripSymbolList(
  status: StatusResponse | null | undefined,
  quotesMap: Record<string, QuoteItem>,
): string[] {
  const fromQuotes = Object.keys(quotesMap)
    .map(streamSymbolFromQuoteMapKey)
    .filter((s): s is string => Boolean(s))
  return [
    ...new Set([...(status?.live_ui?.subscribed_tickers ?? []), ...fromQuotes]),
  ].sort()
}

function normalizeBenchmarks(
  raw: Record<string, DailyBenchmark> | undefined,
): Record<string, DailyBenchmark> {
  const out: Record<string, DailyBenchmark> = {}
  if (!raw) return out
  for (const [k, v] of Object.entries(raw)) {
    const key = k.trim().toUpperCase()
    if (key && v) out[key] = v
  }
  return out
}

/**
 * Builds global strip summary (Legacy dashboard-strip roll-up, without marquee items).
 */
export function buildStreamStripModel(
  status: StatusResponse | null | undefined,
  quotesMap: Record<string, QuoteItem>,
  benchmarksRaw: Record<string, DailyBenchmark> | undefined,
): StreamStripModel {
  const benchmarks = normalizeBenchmarks(benchmarksRaw)
  const watchlistSymbols = buildStripSymbolList(status, quotesMap)
  const accountsList = status?.portfolio?.accounts ?? []
  const streamsOnline = computeMarketStreamsOk(status, quotesMap)

  const rows = watchlistSymbols.map(symbol => {
    let qty = 0
    for (const acc of accountsList) {
      for (const p of acc?.positions ?? []) {
        const sym = (p.symbol || '').trim()
        const secType = (p.secType || '').toString().toUpperCase()
        const posQty = typeof p.position === 'number' ? p.position : 0
        if (!sym || sym !== symbol || secType !== 'STK' || !Number.isFinite(posQty) || posQty === 0) {
          continue
        }
        qty += posQty
      }
    }
    const symKey = (symbol || '').trim().toUpperCase()
    const quote = quotesMap[symKey] ?? quotesMap[symbol]
    const bench = benchmarks[symKey]
    const curr = quoteDisplayLast(quote)
    const { changePct, pnlVsBench } = computeMarketStreamDailyChange(bench, curr, qty)
    return { symbol, qty, changePct, pnlVsBench }
  })

  const totalDailyDollar = rows.reduce(
    (acc, row) =>
      acc + (row.pnlVsBench != null && Number.isFinite(row.pnlVsBench) ? row.pnlVsBench : 0),
    0,
  )

  const sumLastQty = watchlistSymbols.reduce((acc, symbol, index) => {
    const rowQty = Number.isFinite(rows[index]?.qty) ? rows[index]!.qty : 0
    const sk = (symbol || '').trim().toUpperCase()
    const last = quoteDisplayLast(quotesMap[sk] ?? quotesMap[symbol]) ?? 0
    return acc + last * rowQty
  }, 0)

  const totalDailyDenom = sumLastQty - totalDailyDollar
  const totalDailyPct =
    totalDailyDenom > 0 && Number.isFinite(totalDailyDollar)
      ? (totalDailyDollar / totalDailyDenom) * 100
      : null

  const symbolRows: StreamStripSymbolRow[] = watchlistSymbols.map((symbol, i) => {
    const row = rows[i]
    const pct = row?.changePct ?? null
    const dollar = row?.pnlVsBench ?? null
    const displayValue =
      pct != null && dollar != null
        ? `${fmtPctCompact(pct)} / ${fmtUsdCompact(dollar)}`
        : pct != null
          ? fmtPctCompact(pct)
          : dollar != null
            ? fmtUsdCompact(dollar)
            : '—'
    return {
      symbol,
      changePct: pct,
      pnlVsBench: dollar,
      tone: toneForNumber(pct ?? dollar),
      displayValue,
    }
  })

  const accountSync = computeAccountSyncLamp(status)

  return {
    streamsOnline,
    streamsLamp: computeMarketStreamsLamp(status ?? undefined, quotesMap),
    ordersLamp: computeOpenOrdersLamp(status ?? undefined),
    openOrderCount: (status?.portfolio?.open_orders ?? []).length,
    ordersLampTitle: `Open orders (PostgreSQL): ${accountSync.title}`,
    totalDailyDollar,
    totalDailyPct,
    totalDailyPctDisplay: fmtPctCompact(totalDailyPct),
    totalDailyDollarDisplay: fmtUsdCompact(totalDailyDollar),
    totalDailyTone: toneForNumber(totalDailyPct ?? totalDailyDollar),
    symbolRows,
  }
}
