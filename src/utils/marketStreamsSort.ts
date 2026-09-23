import type { MarketStreamsRow, OptPositionRow } from '@/utils/marketStreamsRows'

export type MarketStreamsSortMode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type LiveSortGroup = {
  label: string
  showGroupHeader: boolean
  stkRows: MarketStreamsRow[]
  optRows: OptPositionRow[]
  /**
   * The group's Since $, summed over the rows that have one; `null` when none
   * does. After the close the option quotes are empty, so a short-options
   * group of seven unpriced rows used to total `$0` — a sum of unknowns
   * printed as a measured zero, beside seven rows that each said `—`.
   */
  totalPnl: number | null
  /** Rows in the group with no Since $ to add, so a partial sum can say so. */
  unpriced: number
}

export function cmpSymbolLocale(a: string, b: string, dir: 1 | -1): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' }) * dir
}

function expiryDigitsToSortKey(expiry: string): number {
  const s = String(expiry ?? '').replace(/\D/g, '')
  if (s.length >= 8) return parseInt(s.slice(0, 8), 10) || 0
  if (s.length === 6) return parseInt(`${s}01`, 10) || 0
  return 0
}

export function formatExpiryIbGroupLabel(expiry: string): string {
  const s = String(expiry ?? '').replace(/\D/g, '')
  if (s.length < 8) return expiry?.trim() ? String(expiry).trim() : 'Other'
  const y = parseInt(s.slice(0, 4), 10)
  const mo = parseInt(s.slice(4, 6), 10) - 1
  const d = parseInt(s.slice(6, 8), 10)
  if (!Number.isFinite(y) || mo < 0 || mo > 11 || !Number.isFinite(d)) return String(expiry).trim() || 'Other'
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][mo] ?? ''
  return `${mon} ${String(d).padStart(2, '0')}'${String(y).slice(2)}`
}

export function optionRowSortKey(row: OptPositionRow): string {
  const exp = String(row.expiry ?? '').replace(/\D/g, '')
  const strike = Number.isFinite(row.strike) ? String(row.strike).padStart(12, '0') : '0'
  const sym = (row.symbol || '').toUpperCase()
  const ck = (row.contract_key || '').toUpperCase()
  return `${sym}|${exp}|${strike}|${ck}`
}

export function sortOptRowsAlpha(rows: OptPositionRow[], dir: 1 | -1): OptPositionRow[] {
  return [...rows].sort(
    (a, b) => optionRowSortKey(a).localeCompare(optionRowSortKey(b), undefined, { sensitivity: 'base' }) * dir,
  )
}

export function marketStreamsSortHeaderMeta(
  mode: MarketStreamsSortMode,
): { suffix: string | null; arrow: 'up' | 'down' | null } {
  if (mode === 1) return { suffix: null, arrow: null }
  if (mode === 2) return { suffix: null, arrow: 'up' }
  if (mode === 3) return { suffix: null, arrow: 'down' }
  if (mode === 4 || mode === 5) return { suffix: 'T+', arrow: mode === 4 ? 'up' : 'down' }
  if (mode === 6 || mode === 7) return { suffix: 'T+S+', arrow: mode === 6 ? 'up' : 'down' }
  if (mode === 8 || mode === 9) return { suffix: 'E+', arrow: mode === 8 ? 'up' : 'down' }
  return { suffix: null, arrow: null }
}

export type MarketStreamsSortFamily = 'def' | 'alpha' | 'type' | 'side' | 'exp'

/**
 * Which family a mode belongs to; the accent follows the family, so the two
 * arrows of one mode read as the same sort.
 *
 * `side` was called `gamma` and took `--color-success` — the severity green
 * on a column header, which §14.7 rule 2 reserves for dots and tags (design
 * Rev 2026-09-23.2). The family is Type × side, so it is named for that.
 */
export function marketStreamsSortFamily(mode: MarketStreamsSortMode): MarketStreamsSortFamily {
  if (mode === 1) return 'def'
  if (mode === 2 || mode === 3) return 'alpha'
  if (mode === 4 || mode === 5) return 'type'
  if (mode === 6 || mode === 7) return 'side'
  return 'exp'
}

/**
 * The sort line under the section header (design Rev 2026-09-23.2).
 *
 * Nine modes live behind one column header that cycles on click, so which one
 * is standing — and what order it actually produces — was only knowable by
 * remembering. The copy is the design's, verbatim.
 */
export const MARKET_STREAMS_SORT_LINE: Record<
  MarketStreamsSortMode,
  { name: string; order: string; hint: string }
> = {
  1: { name: 'Default', order: 'by category, in your order', hint: 'drag ⋮⋮ to reorder rows and categories' },
  2: { name: 'A–Z ▲', order: 'stocks, then options', hint: 'row order is yours only in Default' },
  3: { name: 'Z–A ▼', order: 'stocks, then options', hint: 'row order is yours only in Default' },
  4: { name: 'Type ▲', order: 'stocks → options', hint: 'row order is yours only in Default' },
  5: { name: 'Type ▼', order: 'options → stocks', hint: 'row order is yours only in Default' },
  6: {
    name: 'Type × side ▲',
    order: 'long stocks → short options → short stocks → long options → no position',
    hint: 'row order is yours only in Default',
  },
  7: {
    name: 'Type × side ▼',
    order: 'short options → long stocks → long options → short stocks → no position',
    hint: 'row order is yours only in Default',
  },
  8: { name: 'Expiry ▲', order: 'stocks, then options by expiry, nearest first', hint: 'row order is yours only in Default' },
  9: { name: 'Expiry ▼', order: 'stocks, then options by expiry, furthest first', hint: 'row order is yours only in Default' },
}

export function buildUnifiedGroupedRows(args: {
  mode: MarketStreamsSortMode
  filteredRows: MarketStreamsRow[]
  optPositionRows: OptPositionRow[]
  /** One option row's Since $, or null when it cannot be priced. */
  optPnl: (row: OptPositionRow) => number | null
}): LiveSortGroup[] | null {
  const { mode, filteredRows, optPositionRows, optPnl } = args
  if (mode === 1) return null

  const stkRows = [...filteredRows]
  const optRows = [...optPositionRows]

  const finite = (v: number | null | undefined) => (v != null && Number.isFinite(v) ? v : null)
  const grp = (label: string, show: boolean, stk: MarketStreamsRow[], opt: OptPositionRow[]): LiveSortGroup => {
    const vals = [...stk.map((r) => finite(r.pnlCost)), ...opt.map((r) => finite(optPnl(r)))]
    const known = vals.filter((v): v is number => v != null)
    return {
      label,
      showGroupHeader: show,
      stkRows: stk,
      optRows: opt,
      totalPnl: known.length > 0 ? known.reduce((a, b) => a + b, 0) : null,
      unpriced: vals.length - known.length,
    }
  }

  const sortStk = (rows: MarketStreamsRow[], dir: 1 | -1) =>
    [...rows].sort((a, b) => cmpSymbolLocale(a.symbol, b.symbol, dir))
  const sortOpt = (rows: OptPositionRow[], dir: 1 | -1) => sortOptRowsAlpha(rows, dir)

  if (mode === 2) return [grp('', false, sortStk(stkRows, 1), sortOpt(optRows, 1))]
  if (mode === 3) return [grp('', false, sortStk(stkRows, -1), sortOpt(optRows, -1))]

  if (mode === 4) {
    const out: LiveSortGroup[] = []
    if (stkRows.length) out.push(grp('Total Stocks', true, sortStk(stkRows, 1), []))
    if (optRows.length) out.push(grp('Total Options', true, [], sortOpt(optRows, 1)))
    return out.length ? out : [grp('', false, stkRows, optRows)]
  }

  if (mode === 5) {
    const out: LiveSortGroup[] = []
    if (optRows.length) out.push(grp('Total Options', true, [], sortOpt(optRows, -1)))
    if (stkRows.length) out.push(grp('Total Stocks', true, sortStk(stkRows, -1), []))
    return out.length ? out : [grp('', false, stkRows, optRows)]
  }

  if (mode === 6) {
    const longStk = stkRows.filter(r => (r.qty ?? 0) > 0)
    const shortStk = stkRows.filter(r => (r.qty ?? 0) < 0)
    const flatStk = stkRows.filter(r => !(r.qty ?? 0))
    const shortOpt = optRows.filter(r => r.qty < 0)
    const longOpt = optRows.filter(r => r.qty > 0)
    const out: LiveSortGroup[] = []
    if (longStk.length) out.push(grp('Total Long Stocks', true, sortStk(longStk, 1), []))
    if (shortOpt.length) out.push(grp('Total Short Options', true, [], sortOpt(shortOpt, 1)))
    if (shortStk.length) out.push(grp('Total Short Stocks', true, sortStk(shortStk, 1), []))
    if (longOpt.length) out.push(grp('Total Long Options', true, [], sortOpt(longOpt, 1)))
    if (flatStk.length) out.push(grp('No position', true, sortStk(flatStk, 1), []))
    return out.length ? out : [grp('', false, stkRows, optRows)]
  }

  if (mode === 7) {
    const longStk = stkRows.filter(r => (r.qty ?? 0) > 0)
    const shortStk = stkRows.filter(r => (r.qty ?? 0) < 0)
    const flatStk = stkRows.filter(r => !(r.qty ?? 0))
    const shortOpt = optRows.filter(r => r.qty < 0)
    const longOpt = optRows.filter(r => r.qty > 0)
    const out: LiveSortGroup[] = []
    if (shortOpt.length) out.push(grp('Total Short Options', true, [], sortOpt(shortOpt, -1)))
    if (longStk.length) out.push(grp('Total Long Stocks', true, sortStk(longStk, -1), []))
    if (longOpt.length) out.push(grp('Total Long Options', true, [], sortOpt(longOpt, -1)))
    if (shortStk.length) out.push(grp('Total Short Stocks', true, sortStk(shortStk, -1), []))
    // The descending half of the pair dropped every watched stock the book
    // holds none of, while the ascending half kept them — the same rows
    // appeared and vanished with the arrow. Judged a defect, not a ruling
    // (design Rev 2026-09-23.2).
    if (flatStk.length) out.push(grp('No position', true, sortStk(flatStk, -1), []))
    return out.length ? out : [grp('', false, stkRows, optRows)]
  }

  if (mode === 8 || mode === 9) {
    const dir: 1 | -1 = mode === 8 ? 1 : -1
    const out: LiveSortGroup[] = []
    if (stkRows.length) out.push(grp('Stocks', true, sortStk(stkRows, dir), []))
    const expMap = new Map<string, OptPositionRow[]>()
    for (const r of optRows) {
      const k = String(r.expiry ?? '').trim() || 'Other'
      if (!expMap.has(k)) expMap.set(k, [])
      expMap.get(k)!.push(r)
    }
    const keys = Array.from(expMap.keys()).sort((a, b) => {
      const ka = expiryDigitsToSortKey(a)
      const kb = expiryDigitsToSortKey(b)
      if (ka !== kb) return dir === 1 ? ka - kb : kb - ka
      return a.localeCompare(b)
    })
    for (const k of keys) {
      out.push(grp(formatExpiryIbGroupLabel(k), true, [], sortOpt(expMap.get(k) ?? [], dir)))
    }
    return out.length ? out : [grp('', false, stkRows, optRows)]
  }

  return null
}

export function sortRowsBySymbolOrder(
  rows: MarketStreamsRow[],
  order: string[] | undefined,
): MarketStreamsRow[] {
  if (!order?.length) return rows
  const orderIndex = new Map(order.map((s, i) => [s.toUpperCase(), i]))
  return [...rows].sort((a, b) => {
    const ia = orderIndex.get(a.symbol.toUpperCase()) ?? 9999
    const ib = orderIndex.get(b.symbol.toUpperCase()) ?? 9999
    if (ia !== ib) return ia - ib
    return a.symbol.localeCompare(b.symbol)
  })
}

export function sortOptRowsByBasisOrder(
  rows: OptPositionRow[],
  order: string[],
): OptPositionRow[] {
  const basisKeyOf = (r: OptPositionRow) => `${r.account_id.toLowerCase()}\t${r.contract_key}`
  const sorted = sortOptRowsAlpha(rows, 1)
  const knownOrder = order.filter(k => sorted.some(r => basisKeyOf(r) === k))
  if (knownOrder.length === 0) return sorted
  const rowByKey = new Map(sorted.map(r => [basisKeyOf(r), r]))
  const inOrder = knownOrder.map(k => rowByKey.get(k)).filter((r): r is OptPositionRow => r != null)
  const rest = sorted.filter(r => !knownOrder.includes(basisKeyOf(r)))
  return [...inOrder, ...rest]
}

export function cycleSortMode(mode: MarketStreamsSortMode): MarketStreamsSortMode {
  return ((((mode as number) % 9) + 1) as MarketStreamsSortMode)
}
