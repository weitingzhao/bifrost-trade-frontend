import type { QuoteItem, DailyBenchmark, WatchlistItem } from '@/types/market'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { PositionCategory } from '@/types/portfolio'
import { quoteDisplayLast, WL_CAT_WATCHING } from '@/utils/watchlistHelpers'
import { computeMarketStreamDailyChange } from '@/utils/marketStreamsDailyTotals'

export type StreamCategory = 'host' | 'secondary' | 'both' | null

export type MarketStreamsRow = {
  symbol: string
  quote?: QuoteItem | null
  qty: number | null
  avgCost: number | null
  changePct: number | null
  pnlVsBench: number | null
  pnlCost: number | null
  streamCategory: StreamCategory
  isInWatchlist: boolean
  category: string
  hostQty: number | null
  hostAvgCost: number | null
  hostPnlCost: number | null
  secondaryQty: number | null
  secondaryAvgCost: number | null
  secondaryPnlCost: number | null
  positionDailyPrevClose: number | null
}

export type OptPositionRow = {
  account_id: string
  contract_key: string
  symbol: string
  expiry: string
  strike: number
  right: string
  qty: number
  avg_cost: number | null
}

const norm = (id: string | null) => (id ?? '').trim().toLowerCase() || ''

export function isWatchlistStockCategoryWatching(category: string | null | undefined): boolean {
  return String(category ?? '').trim().toLowerCase() === WL_CAT_WATCHING.toLowerCase()
}

export function extractOptPositionRows(accounts: IbAccountSnapshot[]): OptPositionRow[] {
  const rows: OptPositionRow[] = []
  const seen = new Set<string>()
  for (const acc of accounts) {
    const accId = (acc?.account_id ?? '').toString().trim()
    if (!accId) continue
    for (const p of acc?.positions ?? []) {
      const secType = (p.secType ?? '').toString().toUpperCase()
      if (secType !== 'OPT') continue
      const ck = (p.contract_key ?? '').trim()
      const qty = typeof p.position === 'number' ? p.position : 0
      if (!ck || qty === 0) continue
      const dedupeKey = `${accId.toLowerCase()}|${ck}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      rows.push({
        account_id: accId,
        contract_key: ck,
        symbol: p.symbol ?? '',
        expiry: p.expiry ?? '',
        strike: Number(p.strike ?? 0),
        right: p.right ?? '',
        qty,
        avg_cost: p.avgCost != null ? Number(p.avgCost) : null,
      })
    }
  }
  return rows
}

export function extractStreamPositionSymbols(
  accounts: IbAccountSnapshot[],
  streamHostId: string | null,
  streamSecondaryId: string | null,
): { host: string[]; secondary: string[] } {
  const host: string[] = []
  const secondary: string[] = []
  const wantHost = norm(streamHostId)
  const wantSecondary = norm(streamSecondaryId)
  for (const acc of accounts) {
    const accId = (acc?.account_id ?? '').toString().trim()
    const accIdNorm = norm(accId)
    for (const p of acc?.positions ?? []) {
      const sym = (p.symbol ?? '').trim()
      const secType = (p.secType ?? '').toString().toUpperCase()
      const posQty = typeof p.position === 'number' ? p.position : 0
      if (!sym || secType !== 'STK' || !Number.isFinite(posQty) || posQty === 0) continue
      if (wantHost && accIdNorm === wantHost && !host.includes(sym)) host.push(sym)
      if (wantSecondary && accIdNorm === wantSecondary && !secondary.includes(sym)) secondary.push(sym)
    }
  }
  return { host, secondary }
}

/** Normalize quotesMap keys to STK stream symbols (ignore OPT contract_key keys). */
export function streamSymbolFromQuoteMapKey(key: string): string | null {
  const k = key.trim()
  if (!k) return null
  if (k.includes('|STK|')) {
    const sym = (k.split('|')[0] ?? '').trim().toUpperCase()
    return sym || null
  }
  if (k.includes('|')) return null
  return k.toUpperCase()
}

export function buildWatchlistSymbols(args: {
  subscribedTickers: string[]
  streamHostSymbols: string[]
  streamSecondarySymbols: string[]
  quoteSymbolKeys: string[]
}): string[] {
  const fromQuotes = args.quoteSymbolKeys
    .map(streamSymbolFromQuoteMapKey)
    .filter((s): s is string => Boolean(s))
  return [
    ...new Set([
      ...args.subscribedTickers,
      ...args.streamHostSymbols,
      ...args.streamSecondarySymbols,
      ...fromQuotes,
    ]),
  ].sort()
}

export function buildMarketStreamsRowForSymbol(args: {
  symbol: string
  accounts: IbAccountSnapshot[]
  quotesMap: Record<string, QuoteItem>
  benchmarks: Record<string, DailyBenchmark>
  streamHostId: string | null
  streamSecondaryId: string | null
  hasStreamAccounts: boolean
  wishlistSet: Set<string>
}): MarketStreamsRow {
  const {
    symbol,
    accounts,
    quotesMap,
    benchmarks,
    streamHostId,
    streamSecondaryId,
    hasStreamAccounts,
    wishlistSet,
  } = args

  const wantHost = norm(streamHostId)
  const wantSecondary = norm(streamSecondaryId)

  let qty = 0
  let totalCost = 0
  let hasCost = false
  let hostQty = 0
  let hostTotalCost = 0
  let hostHasCost = false
  let secondaryQty = 0
  let secondaryTotalCost = 0
  let secondaryHasCost = false
  let positionCategory = 'Uncategorized'
  const accountIdsWithSymbol: string[] = []
  let positionDailyPrevClose: number | null = null
  let positionDailyPrevClosePickWeight = -1

  for (const acc of accounts) {
    const accId = (acc?.account_id ?? '').toString().trim()
    const accIdNorm = norm(accId)
    const isAccHost = wantHost && accIdNorm === wantHost
    const isAccSecondary = wantSecondary && accIdNorm === wantSecondary

    for (const p of acc?.positions ?? []) {
      const sym = (p.symbol ?? '').trim()
      const secType = (p.secType ?? '').toString().toUpperCase()
      const posQty = typeof p.position === 'number' ? p.position : 0
      if (!sym || sym !== symbol || secType !== 'STK' || !Number.isFinite(posQty) || posQty === 0) continue

      const absQ = Math.abs(posQty)
      const dpcRaw = p.daily_prev_close
      const dpc =
        dpcRaw != null && Number.isFinite(Number(dpcRaw)) && Number(dpcRaw) > 0 ? Number(dpcRaw) : null
      if (dpc != null && absQ > positionDailyPrevClosePickWeight) {
        positionDailyPrevClose = dpc
        positionDailyPrevClosePickWeight = absQ
      }
      if (positionCategory === 'Uncategorized' && p.category && String(p.category).trim()) {
        positionCategory = String(p.category).trim()
      }
      if (accId && !accountIdsWithSymbol.includes(accId)) accountIdsWithSymbol.push(accId)

      qty += posQty
      const avg = p.avgCost != null && Number.isFinite(p.avgCost as number) ? (p.avgCost as number) : null
      if (avg != null) {
        totalCost += avg * posQty
        hasCost = true
      }
      if (isAccHost) {
        hostQty += posQty
        if (avg != null) {
          hostTotalCost += avg * posQty
          hostHasCost = true
        }
      }
      if (isAccSecondary) {
        secondaryQty += posQty
        if (avg != null) {
          secondaryTotalCost += avg * posQty
          secondaryHasCost = true
        }
      }
    }
  }

  let streamCategory: StreamCategory = null
  if (hasStreamAccounts && accountIdsWithSymbol.length > 0) {
    const isHost = wantHost ? accountIdsWithSymbol.some(id => norm(id) === wantHost) : false
    const isSecondary = wantSecondary ? accountIdsWithSymbol.some(id => norm(id) === wantSecondary) : false
    if (isHost && isSecondary) streamCategory = 'both'
    else if (isHost) streamCategory = 'host'
    else if (isSecondary) streamCategory = 'secondary'
  }

  const avgCost = hasCost && qty !== 0 ? totalCost / qty : null
  const hostAvgCost = hostHasCost && hostQty !== 0 ? hostTotalCost / hostQty : null
  const secondaryAvgCost = secondaryHasCost && secondaryQty !== 0 ? secondaryTotalCost / secondaryQty : null

  const symKey = (symbol || '').trim().toUpperCase()
  const quote = quotesMap[symKey] ?? quotesMap[symbol]
  const bench = benchmarks[symKey]
  const { changePct, pnlVsBench } = computeMarketStreamDailyChange(
    bench,
    quoteDisplayLast(quote),
    qty ?? 0,
    positionDailyPrevClose,
  )
  const lastVal = quoteDisplayLast(quote)
  const pnlCost =
    lastVal != null && avgCost != null && qty != null && Number.isFinite(qty) && qty !== 0
      ? (lastVal - avgCost) * qty
      : null
  const hostPnlCost =
    lastVal != null && hostAvgCost != null && hostQty !== 0 ? (lastVal - hostAvgCost) * hostQty : null
  const secondaryPnlCost =
    lastVal != null && secondaryAvgCost != null && secondaryQty !== 0
      ? (lastVal - secondaryAvgCost) * secondaryQty
      : null

  return {
    symbol,
    quote,
    qty: qty || null,
    avgCost,
    changePct,
    pnlVsBench,
    pnlCost,
    streamCategory,
    isInWatchlist: wishlistSet.has((symbol || '').trim().toUpperCase()),
    category: positionCategory,
    hostQty: hostQty || null,
    hostAvgCost,
    hostPnlCost,
    secondaryQty: secondaryQty || null,
    secondaryAvgCost,
    secondaryPnlCost,
    positionDailyPrevClose,
  }
}

export function splitWatchingAndMarketStreams(
  rows: MarketStreamsRow[],
  watchlistStkBySymbol: Map<string, WatchlistItem>,
): { marketStreamsRows: MarketStreamsRow[]; watchingTickerRows: MarketStreamsRow[] } {
  const watching: MarketStreamsRow[] = []
  const rest: MarketStreamsRow[] = []
  for (const r of rows) {
    const sym = (r.symbol || '').trim().toUpperCase()
    const wl = watchlistStkBySymbol.get(sym)
    if (wl && isWatchlistStockCategoryWatching(wl.category)) {
      watching.push({ ...r, category: WL_CAT_WATCHING })
    } else {
      rest.push(r)
    }
  }
  return { marketStreamsRows: rest, watchingTickerRows: watching }
}

export function filterByStreamAccount(
  rows: MarketStreamsRow[],
  filters: Set<'host' | 'secondary'>,
  hasStreamAccounts: boolean,
): MarketStreamsRow[] {
  if (!hasStreamAccounts || filters.size === 0) return rows
  return rows.filter(row => {
    if (filters.has('host') && (row.streamCategory === 'host' || row.streamCategory === 'both')) return true
    if (filters.has('secondary') && (row.streamCategory === 'secondary' || row.streamCategory === 'both')) return true
    return false
  })
}

export function filterByCategory(rows: MarketStreamsRow[], filters: Set<string>): MarketStreamsRow[] {
  if (filters.size === 0) return rows
  return rows.filter(row => filters.has(row.category))
}

export function computeStreamsSummary(
  filteredRows: MarketStreamsRow[],
  dailyTotals: { totalDailyDollar: number; totalDailyPct: number | null },
): {
  totalCostPnl: number
  sincePct: number | null
  totalDailyDollar: number
  totalDailyPct: number | null
} {
  const totalCostPnl = filteredRows.reduce(
    (a, r) => a + (r.pnlCost != null && Number.isFinite(r.pnlCost) ? r.pnlCost : 0),
    0,
  )
  const totalCost = filteredRows.reduce((a, r) => {
    const q = r.qty != null && Number.isFinite(r.qty) ? r.qty : 0
    const c = r.avgCost != null && Number.isFinite(r.avgCost) ? r.avgCost : 0
    return a + q * c
  }, 0)
  const sincePct = totalCost > 0 && Number.isFinite(totalCostPnl) ? (totalCostPnl / totalCost) * 100 : null
  return {
    totalCostPnl,
    sincePct,
    totalDailyDollar: dailyTotals.totalDailyDollar,
    totalDailyPct: dailyTotals.totalDailyPct,
  }
}

export function buildDefaultCategoryOrder(
  positionCategories: PositionCategory[],
  categoryNamesFromData: string[],
): string[] {
  const apiNames = new Set(positionCategories.map(c => c.name))
  const apiOrdered = [...positionCategories]
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
    .map(c => c.name)
  const dataOnly = categoryNamesFromData
    .filter(n => n !== 'Uncategorized' && !apiNames.has(n))
    .sort((a, b) => a.localeCompare(b))
  const uncategorizedFirst = categoryNamesFromData.includes('Uncategorized') ? ['Uncategorized'] : []
  return [...uncategorizedFirst, ...apiOrdered.filter(n => categoryNamesFromData.includes(n)), ...dataOnly]
}

export function buildStreamCategoryOrder(
  categoryOrder: string[],
  defaultCategoryOrder: string[],
  categoryNamesFromData: string[],
): string[] {
  const base = categoryOrder.length > 0 ? [...categoryOrder] : [...defaultCategoryOrder]
  const set = new Set(base)
  for (const c of categoryNamesFromData) {
    if (!set.has(c)) {
      base.push(c)
      set.add(c)
    }
  }
  return base
}

export function groupRowsByCategory(rows: MarketStreamsRow[]): Record<string, MarketStreamsRow[]> {
  const map: Record<string, MarketStreamsRow[]> = {}
  for (const row of rows) {
    const cat = row.category
    if (!map[cat]) map[cat] = []
    map[cat].push(row)
  }
  return map
}

export function buildWatchlistStkBySymbol(items: WatchlistItem[]): Map<string, WatchlistItem> {
  const m = new Map<string, WatchlistItem>()
  for (const w of items) {
    const sym = (w.symbol ?? '').trim().toUpperCase()
    if (sym) m.set(sym, w)
  }
  return m
}

export function extractWatchlistStkItems(items: WatchlistItem[]): WatchlistItem[] {
  return items.filter(w => {
    const sym = (w.symbol ?? '').trim()
    const st = (w.sec_type ?? '').toString().toUpperCase()
    return sym && (st === 'STK' || !st)
  })
}

export const SYMBOL_ORDER_STORAGE_KEY = 'market_streams_symbol_order'
export const OPT_ROW_ORDER_STORAGE_KEY = 'market_streams_opt_row_order'

export function loadSymbolOrderFromStorage(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(SYMBOL_ORDER_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, string[]>
  } catch {
    /* ignore */
  }
  return {}
}

export function saveSymbolOrderToStorage(order: Record<string, string[]>): void {
  try {
    localStorage.setItem(SYMBOL_ORDER_STORAGE_KEY, JSON.stringify(order))
  } catch {
    /* ignore */
  }
}

export function loadOptRowOrderFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(OPT_ROW_ORDER_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

export function saveOptRowOrderToStorage(order: string[]): void {
  try {
    localStorage.setItem(OPT_ROW_ORDER_STORAGE_KEY, JSON.stringify(order))
  } catch {
    /* ignore */
  }
}

export function applySymbolReorderInCategory(
  order: Record<string, string[]>,
  category: string,
  fromSymbol: string,
  toSymbol: string,
  fallbackSymbols: string[] = [],
): Record<string, string[]> {
  const current = order[category] ?? fallbackSymbols
  const fromIdx = current.indexOf(fromSymbol)
  const toIdx = current.indexOf(toSymbol)
  if (fromIdx === -1 || toIdx === -1) return order
  const next = [...current]
  next.splice(fromIdx, 1)
  const newToIdx = next.indexOf(toSymbol)
  if (newToIdx === -1) return order
  next.splice(newToIdx, 0, fromSymbol)
  return { ...order, [category]: next }
}

export function applyOptRowReorder(
  allBasisKeys: string[],
  currentOrder: string[],
  fromBasisKey: string,
  toBasisKey: string,
): string[] {
  const knownOrder = currentOrder.filter(k => allBasisKeys.includes(k))
  const rest = allBasisKeys.filter(k => !knownOrder.includes(k))
  const current = [...knownOrder, ...rest]
  const fromIdx = current.indexOf(fromBasisKey)
  const toIdx = current.indexOf(toBasisKey)
  if (fromIdx === -1 || toIdx === -1) return currentOrder
  const next = [...current]
  next.splice(fromIdx, 1)
  const newToIdx = next.indexOf(toBasisKey)
  if (newToIdx === -1) return currentOrder
  next.splice(newToIdx, 0, fromBasisKey)
  return next
}

export function optBasisKey(row: OptPositionRow): string {
  return `${row.account_id.toLowerCase()}\t${row.contract_key}`
}

/** True when quote is equity stream data (OPT rows must not overwrite underlying STK keys). */
export function isStkStreamQuote(q: QuoteItem): boolean {
  const st = (q.sec_type ?? '').toString().toUpperCase()
  if (st === 'STK') return true
  const ck = (q.contract_key ?? '').trim()
  return ck.includes('|STK|')
}

/** Merge GET /quotes or SSE items into a symbol-keyed map (uppercase STK keys); OPT by contract_key. */
export function mergeQuotesIntoSymbolMap(
  prev: Record<string, QuoteItem>,
  quotes: QuoteItem[],
): Record<string, QuoteItem> {
  const next = { ...prev }
  for (const q of quotes) {
    const sym = (q.symbol ?? '').trim()
    if (!sym) continue
    const mapKey = sym.toUpperCase()
    const st = (q.sec_type ?? '').toString().toUpperCase()
    const ck = (q.contract_key ?? '').toString().trim()
    const allowBareSymbolKey = !ck && st !== 'OPT'
    if (isStkStreamQuote(q) || allowBareSymbolKey) {
      next[mapKey] = q
    } else if (ck) {
      next[ck] = q
    }
  }
  return next
}

export function quotesByContractKeyFromMap(quotesMap: Record<string, QuoteItem>): Record<string, QuoteItem> {
  const out: Record<string, QuoteItem> = {}
  for (const q of Object.values(quotesMap)) {
    if (q.contract_key) out[q.contract_key] = q
  }
  return out
}

export function stkPositionCategoryFromAccounts(
  accounts: IbAccountSnapshot[],
  symbol: string,
): string {
  for (const acc of accounts) {
    for (const p of acc?.positions ?? []) {
      if ((p.symbol ?? '').trim() === symbol && (p.secType ?? '').toUpperCase() === 'STK') {
        if (p.category && String(p.category).trim()) return String(p.category).trim()
      }
    }
  }
  return 'Uncategorized'
}

export function reorderCategoryList(
  current: string[],
  dragged: string,
  dropTarget: string,
): string[] | null {
  if (!dragged || dragged === dropTarget) return null
  const fromIdx = current.indexOf(dragged)
  const toIdx = current.indexOf(dropTarget)
  if (fromIdx === -1 || toIdx === -1) return null
  const next = [...current]
  next.splice(fromIdx, 1)
  next.splice(next.indexOf(dropTarget), 0, dragged)
  return next
}
