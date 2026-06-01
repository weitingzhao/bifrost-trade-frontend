import type { IbAccountSnapshot, IbPositionRow } from '@/types/monitor'
import type { LivePositionRow, StockCoverageItem } from '@/types/positions'
import type { QuoteItem } from '@/types/market'
import { assignColor, type DonutSegment } from '@/utils/donutChart'
import { isLedgerCashLikeCategory, isLedgerFixedIncomeCategory, ibPositionMarketValue } from '@/utils/stockCategories'
import { fmtUsd } from '@/utils/positions'

export type UnderlyingCategoryFilter = 'Stocks' | 'Fixed Income' | 'Cash-like'
export const UNDERLYING_CATEGORY_ORDER: UnderlyingCategoryFilter[] = ['Stocks', 'Fixed Income', 'Cash-like']

/** Asset-mix donut + legend — matches Legacy --coverage-pie-* tokens. */
export const ASSET_MIX_CHART_COLORS = {
  stock: '#38bdf8',
  fi: '#4ade80',
  cashLike: '#2dd4bf',
  cash: '#fbbf24',
  bp: '#e879f9',
  options: '#c084fc',
} as const

/** Legacy coverage-asset-pie-ring-track stroke. */
export const COVERAGE_PIE_EMPTY = 'rgba(255, 255, 255, 0.14)'

export const UNDERLYING_CATEGORY_COLORS: Record<UnderlyingCategoryFilter, string> = {
  Stocks: '#38bdf8',
  'Fixed Income': '#fbbf24',
  'Cash-like': '#2dd4bf',
}

export type OptionStockMixCategory = 'Backing Pool' | 'Other Stock' | 'Cash-like'

export const OPTION_STOCK_MIX_COLORS: Record<OptionStockMixCategory, string> = {
  'Backing Pool': '#76b900',
  'Other Stock': '#38bdf8',
  'Cash-like': '#2dd4bf',
}

export type OptionDetailFootnote =
  | { kind: 'stock'; costFmt: string; mvFmt: string; tone: 'profit' | 'loss' | 'flat' }
  | { kind: 'text'; text: string; tone: 'profit' | 'loss' | 'flat' }

export type ChartDonutSegment = DonutSegment & {
  marketValueTooltip?: string
  optionDetailFoot?: OptionDetailFootnote
}

export interface AssetMixIncludeFlags {
  includeFi: boolean
  includeCashLike: boolean
  includeBp: boolean
}

export interface CoverageAssetPieData {
  coreStockMV: number
  fixedIncomeMV: number
  cashLikeMV: number
  cash: number | null
  bp: number | null
  denom: number
  pStock: number
  pFixedIncome: number
  pCashLike: number
  pCash: number
  pBp: number
  includeBpInChart: boolean
  includeFiInChart: boolean
  includeCashLikeInChart: boolean
  simpleCenterPct: boolean
  netLiq: number | null
}

function parseSummaryNumber(acc: IbAccountSnapshot | undefined, key: string): number | null {
  const s = acc?.summary
  if (!s || typeof s !== 'object') return null
  const v = (s as Record<string, unknown>)[key]
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

function accountCashAndBp(acc: IbAccountSnapshot | undefined): { cash: number | null; bp: number | null } {
  return {
    cash: parseSummaryNumber(acc, 'TotalCashValue'),
    bp: parseSummaryNumber(acc, 'BuyingPower'),
  }
}

export function resolveUnderlyingCategory(pos: IbPositionRow): UnderlyingCategoryFilter {
  const raw = String(pos.category ?? '').trim()
  if (isLedgerFixedIncomeCategory(raw)) return 'Fixed Income'
  if (isLedgerCashLikeCategory(raw)) return 'Cash-like'
  return 'Stocks'
}

export function resolveDonutPrice(
  pos: IbPositionRow,
  quotesByCk: Record<string, QuoteItem>,
  quotesBySymbol: Record<string, QuoteItem>,
): number | null {
  if (pos.price != null && Number.isFinite(Number(pos.price)) && Number(pos.price) > 0) {
    return Math.abs(Number(pos.price))
  }
  const ck = pos.contract_key
  if (ck) {
    const q = quotesByCk[ck]
    const qp = q?.last ?? q?.mid
    if (qp != null && Number.isFinite(qp) && qp > 0) return Math.abs(qp)
  }
  const sym = (pos.symbol ?? '').toUpperCase()
  if (sym) {
    const q = quotesBySymbol[sym]
    const qp = q?.last ?? q?.mid
    if (qp != null && Number.isFinite(qp) && qp > 0) return Math.abs(qp)
  }
  if (pos.avgCost != null && Number.isFinite(Number(pos.avgCost)) && Math.abs(Number(pos.avgCost)) > 0) {
    const ac = Math.abs(Number(pos.avgCost))
    if ((pos.secType ?? '').toUpperCase() === 'OPT') return ac / 100
    return ac
  }
  return null
}

function sumStockMvForAccount(stocks: LivePositionRow[], accountId: 'all' | string): number {
  let sum = 0
  for (const p of stocks) {
    const acc = (p.account_id ?? '').trim()
    if (accountId !== 'all' && acc !== accountId) continue
    sum += ibPositionMarketValue(p)
  }
  return sum
}

export function buildCoverageAssetPieData(
  accounts: IbAccountSnapshot[],
  coreStocks: LivePositionRow[],
  fixedIncomeStocks: LivePositionRow[],
  cashLikeStocks: LivePositionRow[],
  chartAccountId: 'all' | string,
  flags: AssetMixIncludeFlags,
): CoverageAssetPieData {
  const snap = (id: string) =>
    id ? accounts.find((a) => (a.account_id ?? '').trim() === id) : undefined

  const coreStockMV = sumStockMvForAccount(coreStocks, chartAccountId)
  const fixedIncomeMV = sumStockMvForAccount(fixedIncomeStocks, chartAccountId)
  const cashLikeMV = sumStockMvForAccount(cashLikeStocks, chartAccountId)
  let cash: number | null = null
  let bp: number | null = null

  if (chartAccountId === 'all') {
    const ids = new Set<string>()
    for (const a of accounts) {
      const id = (a.account_id ?? '').trim()
      if (id) ids.add(id)
    }
    for (const id of ids) {
      const { cash: c, bp: b } = accountCashAndBp(snap(id))
      if (c != null) cash = (cash ?? 0) + c
      if (b != null) bp = (bp ?? 0) + b
    }
    if (ids.size === 0) {
      cash = null
      bp = null
    }
  } else {
    const ag = accountCashAndBp(snap(chartAccountId))
    cash = ag.cash
    bp = ag.bp
  }

  const wCore = Math.max(0, coreStockMV)
  const wFi = Math.max(0, fixedIncomeMV)
  const wCl = Math.max(0, cashLikeMV)
  const wCash = cash != null && Number.isFinite(cash) ? Math.max(0, cash) : 0
  const wBp = bp != null && Number.isFinite(bp) ? Math.max(0, bp) : 0
  const wFiIn = flags.includeFi ? wFi : 0
  const wClIn = flags.includeCashLike ? wCl : 0
  const wBpIn = flags.includeBp ? wBp : 0
  const denom = wCore + wFiIn + wClIn + wCash + wBpIn

  const netLiq =
    chartAccountId === 'all'
      ? accounts.reduce((s, a) => {
          const n = parseSummaryNumber(a, 'NetLiquidation')
          return s + (n != null && Number.isFinite(n) ? n : 0)
        }, 0)
      : parseSummaryNumber(snap(chartAccountId), 'NetLiquidation')

  return {
    coreStockMV,
    fixedIncomeMV,
    cashLikeMV,
    cash,
    bp,
    denom,
    pStock: denom > 0 ? wCore / denom : 0,
    pFixedIncome: denom > 0 && flags.includeFi ? wFi / denom : 0,
    pCashLike: denom > 0 && flags.includeCashLike ? wCl / denom : 0,
    pCash: denom > 0 ? wCash / denom : 0,
    pBp: denom > 0 && flags.includeBp ? wBp / denom : 0,
    includeBpInChart: flags.includeBp,
    includeFiInChart: flags.includeFi,
    includeCashLikeInChart: flags.includeCashLike,
    simpleCenterPct: !flags.includeBp && !flags.includeFi && !flags.includeCashLike,
    netLiq: netLiq != null && Number.isFinite(netLiq) && netLiq > 0 ? netLiq : null,
  }
}

export function fmtMvAbbrev(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${n < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${n < 0 ? '-' : ''}$${(abs / 1_000).toFixed(1)}k`
  return fmtUsd(n, true)
}

function filterAccounts(
  accounts: IbAccountSnapshot[],
  chartAccountId: 'all' | string,
): IbAccountSnapshot[] {
  if (chartAccountId === 'all') return accounts
  return accounts.filter((a) => (a.account_id ?? '').trim() === chartAccountId)
}

export function buildSymbolDonutSegments(
  accounts: IbAccountSnapshot[],
  chartAccountId: 'all' | string,
  categoryFilter: Record<UnderlyingCategoryFilter, boolean>,
  resolvePrice: (pos: IbPositionRow) => number | null,
): ChartDonutSegment[] {
  const filtered = filterAccounts(accounts, chartAccountId)
  const bySymbol = new Map<string, number>()
  for (const account of filtered) {
    for (const pos of account.positions ?? []) {
      if ((pos.secType ?? '').toUpperCase() === 'OPT') continue
      const cat = resolveUnderlyingCategory(pos)
      if (!categoryFilter[cat]) continue
      const qty = Number(pos.position)
      if (!Number.isFinite(qty) || qty === 0) continue
      const price = resolvePrice(pos)
      if (price == null) continue
      const sym = (pos.symbol ?? '?').toUpperCase()
      const mv = Math.abs(qty) * price
      bySymbol.set(sym, (bySymbol.get(sym) ?? 0) + mv)
    }
  }
  return [...bySymbol.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label,
      value,
      color: assignColor(i),
    }))
}

export function buildCategoryDetailLegendGroups(
  symbolSegments: ChartDonutSegment[],
  accounts: IbAccountSnapshot[],
  chartAccountId: 'all' | string,
  categoryFilter: Record<UnderlyingCategoryFilter, boolean>,
  resolvePrice: (pos: IbPositionRow) => number | null,
): { category: UnderlyingCategoryFilter; segments: ChartDonutSegment[] }[] {
  const filtered = filterAccounts(accounts, chartAccountId)
  const byCategorySymbol = new Map<UnderlyingCategoryFilter, Map<string, number>>()
  for (const account of filtered) {
    for (const pos of account.positions ?? []) {
      if ((pos.secType ?? '').toUpperCase() === 'OPT') continue
      const cat = resolveUnderlyingCategory(pos)
      if (!categoryFilter[cat]) continue
      const qty = Number(pos.position)
      if (!Number.isFinite(qty) || qty === 0) continue
      const price = resolvePrice(pos)
      if (price == null) continue
      const sym = (pos.symbol ?? '?').toUpperCase()
      const mv = Math.abs(qty) * price
      if (!byCategorySymbol.has(cat)) byCategorySymbol.set(cat, new Map())
      const m = byCategorySymbol.get(cat)!
      m.set(sym, (m.get(sym) ?? 0) + mv)
    }
  }
  const colorMap = new Map(symbolSegments.map((s) => [s.label, s.color]))
  return UNDERLYING_CATEGORY_ORDER.map((category) => {
    const m = byCategorySymbol.get(category)
    if (!m || m.size === 0) return null
    const segments: ChartDonutSegment[] = [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], idx) => ({
        label,
        value,
        color: colorMap.get(label) ?? assignColor(idx),
      }))
    return { category, segments }
  }).filter((g): g is { category: UnderlyingCategoryFilter; segments: ChartDonutSegment[] } => g != null)
}

export function buildUnderlyingCategorySegments(
  accounts: IbAccountSnapshot[],
  chartAccountId: 'all' | string,
  resolvePrice: (pos: IbPositionRow) => number | null,
): ChartDonutSegment[] {
  const filtered = filterAccounts(accounts, chartAccountId)
  const byCategory = new Map<UnderlyingCategoryFilter, number>()
  for (const account of filtered) {
    for (const pos of account.positions ?? []) {
      if ((pos.secType ?? '').toUpperCase() === 'OPT') continue
      const cat = resolveUnderlyingCategory(pos)
      const qty = Number(pos.position)
      if (!Number.isFinite(qty) || qty === 0) continue
      const price = resolvePrice(pos)
      if (price == null) continue
      const mv = Math.abs(qty) * price
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + mv)
    }
  }
  return UNDERLYING_CATEGORY_ORDER.map((cat) => ({
    label: cat,
    value: byCategory.get(cat) ?? 0,
    color: UNDERLYING_CATEGORY_COLORS[cat],
  })).filter((seg) => seg.value > 0)
}

function buildOptionContractLabel(pos: IbPositionRow): string | null {
  const parts = (pos.contract_key ?? '').split('|')
  if (parts.length >= 5 && (parts[1] ?? '').toUpperCase() === 'OPT') {
    const sym = (parts[0] ?? pos.symbol ?? '?').toUpperCase()
    const right = (parts[4] ?? pos.right ?? '').toString().toUpperCase().slice(0, 1)
    const strike = parts[3] ?? String(pos.strike ?? '')
    return `${sym} ${right === 'C' ? 'C' : 'P'}${strike}`
  }
  const sym = (pos.symbol ?? '?').toUpperCase()
  const right = (pos.right ?? '').toString().toUpperCase().slice(0, 1)
  const strike = pos.strike ?? ''
  return `${sym} ${right}${strike}`
}

function readUnrealizedPnl(pos: IbPositionRow): number | null {
  const raw = (pos as Record<string, unknown>).unrealized_pnl ?? (pos as Record<string, unknown>).unrealizedPNL
  const v = Number(raw)
  return Number.isFinite(v) ? v : null
}

export function optionUnderlyingFootnote(
  pos: IbPositionRow,
  stockRows: IbPositionRow[],
  resolvePrice: (p: IbPositionRow) => number | null,
): OptionDetailFootnote {
  const symbol = (pos.symbol ?? '').trim().toUpperCase()
  const optQty = Number(pos.position)
  const right = (pos.right ?? '').toUpperCase().slice(0, 1)
  const strike = pos.strike != null && Number.isFinite(Number(pos.strike)) ? Number(pos.strike) : null
  const optPnl = readUnrealizedPnl(pos)

  const stk = stockRows.find(
    (p) =>
      (p.secType ?? '').toUpperCase() === 'STK' &&
      (p.symbol ?? '').trim().toUpperCase() === symbol &&
      Number(p.position) !== 0,
  )
  if (stk) {
    const sq = Number(stk.position)
    const ac = stk.avgCost != null ? Number(stk.avgCost) : NaN
    const px = resolvePrice(stk)
    const costUsd =
      Number.isFinite(sq) && sq !== 0 && Number.isFinite(ac) && ac > 0 ? Math.abs(sq) * ac : null
    const mvUsd =
      px != null && Number.isFinite(px) && px > 0 && Number.isFinite(sq) && sq !== 0 ? Math.abs(sq) * px : null
    let tone: 'profit' | 'loss' | 'flat' = 'flat'
    const stkPnl = readUnrealizedPnl(stk)
    if (stkPnl != null && stkPnl > 0) tone = 'profit'
    else if (stkPnl != null && stkPnl < 0) tone = 'loss'
    else if (costUsd != null && mvUsd != null) {
      tone = mvUsd - costUsd > 0 ? 'profit' : mvUsd - costUsd < 0 ? 'loss' : 'flat'
    }
    return {
      kind: 'stock',
      costFmt: costUsd != null ? fmtUsd(costUsd) : '—',
      mvFmt: mvUsd != null ? fmtUsd(mvUsd) : '—',
      tone,
    }
  }
  if (optQty < 0 && right === 'P' && strike != null && strike > 0) {
    const marginUsd = strike * Math.abs(optQty) * 100
    return {
      kind: 'text',
      text: `Margin (est.) ${fmtUsd(marginUsd)}`,
      tone: optPnl != null && optPnl < 0 ? 'loss' : optPnl != null && optPnl > 0 ? 'profit' : 'flat',
    }
  }
  return { kind: 'stock', costFmt: '—', mvFmt: '—', tone: 'flat' }
}

export function buildOptionDetailSegments(
  accounts: IbAccountSnapshot[],
  chartAccountId: 'all' | string,
  resolvePrice: (pos: IbPositionRow) => number | null,
): ChartDonutSegment[] {
  const filtered = filterAccounts(accounts, chartAccountId)
  const stkByAccount = new Map<string, IbPositionRow[]>()
  for (const account of filtered) {
    const accId = (account.account_id ?? '').trim()
    stkByAccount.set(
      accId,
      (account.positions ?? []).filter((p) => (p.secType ?? '').toUpperCase() === 'STK'),
    )
  }
  const byContract = new Map<string, { mv: number; foot: OptionDetailFootnote | null }>()
  for (const account of filtered) {
    const accId = (account.account_id ?? '').trim()
    const stocks = stkByAccount.get(accId) ?? []
    for (const pos of account.positions ?? []) {
      const qty = Number(pos.position)
      if (!Number.isFinite(qty) || qty === 0) continue
      if ((pos.secType ?? '').toUpperCase() !== 'OPT') continue
      const price = resolvePrice(pos)
      if (price == null) continue
      const label = buildOptionContractLabel(pos)
      if (!label) continue
      const mv = Math.abs(qty) * price * 100
      const foot = optionUnderlyingFootnote(pos, stocks, resolvePrice)
      const prev = byContract.get(label) ?? { mv: 0, foot: null }
      prev.mv += mv
      prev.foot = foot
      byContract.set(label, prev)
    }
  }
  return [...byContract.entries()]
    .sort((a, b) => b[1].mv - a[1].mv)
    .map(([label, bucket], i) => ({
      label,
      value: bucket.mv,
      color: assignColor(i),
      optionDetailFoot: bucket.foot ?? undefined,
    }))
}

export function liveStockRowCovKey(row: Pick<LivePositionRow, 'symbol' | 'account_id'>): string {
  return `${(row.symbol ?? '').toUpperCase().trim()}\x1f${(row.account_id ?? '').trim()}`
}

export function buildOptionStockMix(
  liveStocks: LivePositionRow[],
  watchlistCoverageItems: StockCoverageItem[],
  chartAccountId: 'all' | string,
): {
  segments: ChartDonutSegment[]
  backingPct: number
  otherPct: number
  cashLikePct: number
  backingKeys: Set<string>
  otherKeys: Set<string>
} {
  const matchAcct = (accountId: string) =>
    chartAccountId === 'all' || (accountId ?? '').trim() === chartAccountId

  let cashLikeMv = 0
  for (const p of liveStocks) {
    if ((p.secType ?? '').toUpperCase() !== 'STK') continue
    if (!matchAcct(p.account_id ?? '')) continue
    if (!isLedgerCashLikeCategory(String(p.category ?? ''))) continue
    cashLikeMv += ibPositionMarketValue(p)
  }

  let backingMv = 0
  const backingKeys = new Set<string>()
  for (const ci of watchlistCoverageItems) {
    if (!matchAcct(ci.account_id)) continue
    const rw = (ci as StockCoverageItem & { required_watchlist_shares?: number }).required_watchlist_shares ?? 0
    const backedShares = Math.min(Math.max(0, ci.held_shares), rw || ci.required_shares)
    const price = ci.live_last_price
    if (price != null && backedShares > 0) {
      backingMv += backedShares * price
      if (backedShares > 1e-9) backingKeys.add(liveStockRowCovKey(ci))
    }
  }

  let coreOptionableMv = 0
  for (const p of liveStocks) {
    if ((p.secType ?? '').toUpperCase() !== 'STK') continue
    if (!matchAcct(p.account_id ?? '')) continue
    const cat = String(p.category ?? '')
    if (isLedgerFixedIncomeCategory(cat) || isLedgerCashLikeCategory(cat)) continue
    if (p.optionable === false) continue
    coreOptionableMv += ibPositionMarketValue(p)
  }

  const otherMv = Math.max(0, coreOptionableMv - backingMv)
  const totalMv = backingMv + otherMv + cashLikeMv
  const pct = (v: number) => (totalMv > 0 ? (v / totalMv) * 100 : 0)

  const otherKeys = new Set<string>()
  for (const p of liveStocks) {
    if ((p.secType ?? '').toUpperCase() !== 'STK') continue
    if (!matchAcct(p.account_id ?? '')) continue
    const cat = String(p.category ?? '')
    if (isLedgerFixedIncomeCategory(cat) || isLedgerCashLikeCategory(cat)) continue
    if (p.optionable === false) continue
    const key = liveStockRowCovKey(p)
    if (!backingKeys.has(key)) otherKeys.add(key)
  }

  const segments: ChartDonutSegment[] = [
    { label: 'Backing Pool', value: backingMv, color: OPTION_STOCK_MIX_COLORS['Backing Pool'] },
    { label: 'Other Stock', value: otherMv, color: OPTION_STOCK_MIX_COLORS['Other Stock'] },
    { label: 'Cash-like', value: cashLikeMv, color: OPTION_STOCK_MIX_COLORS['Cash-like'] },
  ].filter((s) => s.value > 0)

  return {
    segments,
    backingPct: pct(backingMv),
    otherPct: pct(otherMv),
    cashLikePct: pct(cashLikeMv),
    backingKeys,
    otherKeys,
  }
}
