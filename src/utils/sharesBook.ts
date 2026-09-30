/**
 * Positions › Shares (design Rev .115, §5.1.4b): every stock-like holding —
 * stocks, fixed income, cash-like — as the broker reports it, on the one page
 * that holds the whole book.
 *
 * Figures are the ones Accounts' holdings table computed (`accountsStockPositions`),
 * so the two never disagree while both exist: Value is quantity × mark, Daily
 * is against the prior close, and Unrealized is market value − cost, the
 * broker's Chg. Backing is Room to add's own cover (`coverByAccountSymbol`):
 * shares standing behind short calls on the same account × symbol, the rest
 * spare, and the spare in whole calls — so the band's "+N calls spare" is the
 * CallsSpare Room to add counts. Fixed income and cash-like back puts through
 * buying power, never calls.
 *
 * The type is the Owner's instrument registration (core 0.27.0, design Rev
 * .119): IB books a bond or T-bill ETF as STK, so secType cannot tell, and the
 * category is never read for it. An unregistered instrument is a stock.
 */
import { computeStockPositionRowMetrics } from '@/utils/accountsStockPositions'
import { stockBookBucket } from '@/utils/bookLive'
import { isInstrumentRegistered } from '@/utils/positionsGrouping'
import type { CoverRow } from '@/utils/bookVsBase'
import type { LivePositionRow } from '@/types/positions'
import type { DailyBenchmark, QuoteItem } from '@/types/market'

export type ShareBucket = 'stk' | 'fi' | 'cash'
export type ShareGrouping = 'cat' | 'type' | 'none'

export const SHARE_BUCKETS: readonly (readonly [ShareBucket, string])[] = [
  ['stk', 'Stocks'],
  ['fi', 'Fixed income'],
  ['cash', 'Cash-like'],
]

export const UNCATEGORISED = 'Uncategorised'

export interface ShareRow {
  key: string
  accountId: string
  symbol: string
  contractKey: string
  bucket: ShareBucket
  /** The Owner registered this instrument's class; an unregistered one reads as a stock. */
  registered: boolean
  /** The Owner's category; empty when none. */
  category: string
  categoryId: number | null
  qty: number
  mark: number | null
  /** Unix seconds of the mark — a live quote, or the snapshot's price stamp. */
  markAt: number | null
  value: number | null
  daily: number | null
  dailyPct: number | null
  unreal: number | null
  unrealPct: number | null
  /** Stocks only; null for fixed income and cash-like, which back no calls. */
  backing: { held: number; behindCalls: number; spare: number; spareCalls: number } | null
}

export interface ShareGroup {
  key: string
  label: string
  rows: ShareRow[]
  value: number
  daily: number
  unreal: number
  /** Whole calls the stocks here could still cover; null when the group holds no stock. */
  callsSpare: number | null
}

const coverKey = (acct: string, sym: string) => `${acct}\x00${sym.toUpperCase()}`

export function buildShareRows(input: {
  stocks: readonly LivePositionRow[]
  quotesBySymbol: Readonly<Record<string, QuoteItem>>
  benchBySymbol: Readonly<Record<string, DailyBenchmark>>
  cover: readonly CoverRow[]
}): ShareRow[] {
  const cover = new Map(input.cover.map((c) => [coverKey(c.accountId, c.symbol), c]))
  return input.stocks
    .filter((p) => (p.secType ?? 'STK') === 'STK' && Number(p.position ?? 0) !== 0)
    .map((p) => {
      const symbol = (p.symbol ?? '').trim().toUpperCase()
      const accountId = (p.account_id ?? '').trim()
      const m = computeStockPositionRowMetrics(p, input.quotesBySymbol[symbol], input.benchBySymbol[symbol])
      const bucket = stockBookBucket(p) as ShareBucket
      const c = cover.get(coverKey(accountId, symbol))
      const held = c?.held ?? Math.floor(Number(p.position ?? 0))
      return {
        key: `${accountId}|${p.contract_key ?? symbol}`,
        accountId,
        symbol,
        contractKey: p.contract_key ?? '',
        bucket,
        registered: isInstrumentRegistered(p),
        category: (p.category ?? '').trim(),
        categoryId: p.category_id ?? null,
        qty: Number(p.position ?? 0),
        mark: m.currPrice,
        markAt: m.updTs,
        value: m.totalMarket,
        daily: m.dailyUsd,
        dailyPct: m.dailyPct,
        unreal: m.changeUsd,
        unrealPct: m.changePct,
        backing:
          bucket === 'stk'
            ? {
                held,
                behindCalls: c?.backing ?? 0,
                spare: c?.spare ?? held,
                spareCalls: c?.moreCalls ?? Math.floor(held / 100),
              }
            : null,
      }
    })
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
}

function groupOf(key: string, label: string, rows: ShareRow[]): ShareGroup {
  const sum = (f: (r: ShareRow) => number | null) => rows.reduce((a, r) => a + (f(r) ?? 0), 0)
  const stocks = rows.filter((r) => r.backing != null)
  return {
    key,
    label,
    rows,
    value: sum((r) => r.value),
    daily: sum((r) => r.daily),
    unreal: sum((r) => r.unreal),
    callsSpare: stocks.length ? stocks.reduce((a, r) => a + (r.backing?.spareCalls ?? 0), 0) : null,
  }
}

/**
 * Category (the default) groups by the Owner's buckets in their own order,
 * Uncategorised last; Type by stock · fixed income · cash-like; None is one
 * headless group. Empty groups are left out.
 */
export function groupShareRows(rows: readonly ShareRow[], by: ShareGrouping, categoryOrder: readonly string[]): ShareGroup[] {
  if (by === 'none') return [groupOf('all', '', [...rows])]
  if (by === 'type') {
    return SHARE_BUCKETS.map(([k, label]) => groupOf(k, label, rows.filter((r) => r.bucket === k))).filter((g) => g.rows.length)
  }
  const named = [...categoryOrder, ...rows.map((r) => r.category).filter((c) => c && !categoryOrder.includes(c))]
  const seen = [...new Set(named)]
  return [...seen.map((c) => groupOf(`cat:${c}`, c, rows.filter((r) => r.category === c))), groupOf('cat:', UNCATEGORISED, rows.filter((r) => !r.category))].filter(
    (g) => g.rows.length,
  )
}

export function sharesTotal(rows: readonly ShareRow[]): ShareGroup {
  return groupOf('total', 'Shares total', [...rows])
}

/** What the registration control says: the type is registered once per instrument, not per account. */
export const TYPE_REGISTERED =
  'The instrument’s type, registered once for every account — a bond or T-bill fund is fixed income or cash-like; an unregistered one counts as a stock'

/**
 * Rev .119: an unrealized percentage past ±999% reads as a bound. Calls sold
 * against the shares lower the broker's average cost, so the ratio outgrows
 * any sense; the title keeps the exact figure and says why.
 */
export function unrealizedPctText(pct: number | null): { text: string; title?: string } {
  if (pct == null || !Number.isFinite(pct)) return { text: '—' }
  if (Math.abs(pct) < 1000) return { text: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` }
  return {
    text: pct > 0 ? '>+999%' : '<−999%',
    title: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% — average cost is lowered by premium from calls sold against the shares`,
  }
}

/**
 * Trailing-twelve-month distribution yield: the cash dividends that went ex in
 * the last 365 days over today's mark. Fixed-income and T-bill ETFs pay
 * monthly and the corporate-action store carries each one; nothing on any side
 * serves an SEC yield or a duration, so this is the yield the book can read.
 */
export function ttmDistributionYield(
  dividends: readonly { ex_date: string | null; amount: number | null }[],
  mark: number | null,
  today: string,
): number | null {
  if (mark == null || mark <= 0) return null
  const from = new Date(Date.parse(`${today}T00:00:00Z`) - 365 * 86_400_000).toISOString().slice(0, 10)
  const paid = dividends.filter((d) => d.ex_date != null && d.ex_date > from && d.ex_date <= today && d.amount != null)
  if (paid.length === 0) return null
  return (paid.reduce((a, d) => a + (d.amount as number), 0) / mark) * 100
}
