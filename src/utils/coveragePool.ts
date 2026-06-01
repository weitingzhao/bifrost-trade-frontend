import type { StockCoverageItem } from '@/types/positions'

export type CoveragePoolSortCol =
  | 'symbol'
  | 'account'
  | 'held'
  | 'held_amt'
  | 'backed_amt'
  | 'required'
  | 'cost_basis'
  | 'market_price'

export function coverageRowMarketValueTotal(ci: StockCoverageItem): number | null {
  const h = ci.held_shares
  const p = ci.live_last_price
  if (h == null || !Number.isFinite(h) || h <= 0) return null
  if (p == null || !Number.isFinite(p)) return null
  return h * p
}

export function sortStockCoverageItemsByColumn(
  list: StockCoverageItem[],
  col: CoveragePoolSortCol,
  dir: 'asc' | 'desc',
): StockCoverageItem[] {
  const out = [...list]
  const m = dir === 'asc' ? 1 : -1
  out.sort((a, b) => {
    if (col === 'symbol') return m * a.symbol.localeCompare(b.symbol)
    if (col === 'account') return m * (a.account_id || '').localeCompare(b.account_id || '')
    if (col === 'held') return m * ((a.held_shares || 0) - (b.held_shares || 0))
    if (col === 'held_amt') {
      const ca = Math.floor(Math.max(0, a.held_shares) / 100)
      const cb = Math.floor(Math.max(0, b.held_shares) / 100)
      return m * (ca - cb)
    }
    if (col === 'backed_amt') {
      const ca = Math.floor(
        Math.max(0, Math.min(a.held_shares || 0, a.required_shares || 0)) / 100,
      )
      const cb = Math.floor(
        Math.max(0, Math.min(b.held_shares || 0, b.required_shares || 0)) / 100,
      )
      return m * (ca - cb)
    }
    if (col === 'required') return m * ((a.required_shares || 0) - (b.required_shares || 0))
    if (col === 'cost_basis') {
      const va = a.cost_basis_total
      const vb = b.cost_basis_total
      const fa = va != null && Number.isFinite(va)
      const fb = vb != null && Number.isFinite(vb)
      if (!fa && !fb) return 0
      if (!fa) return 1
      if (!fb) return -1
      return m * (va - vb)
    }
    if (col === 'market_price') {
      const va = coverageRowMarketValueTotal(a)
      const vb = coverageRowMarketValueTotal(b)
      const fa = va != null && Number.isFinite(va)
      const fb = vb != null && Number.isFinite(vb)
      if (!fa && !fb) return 0
      if (!fa) return 1
      if (!fb) return -1
      return m * (va - vb)
    }
    return a.symbol.localeCompare(b.symbol)
  })
  return out
}

export function groupCoverageByAccount(
  rows: StockCoverageItem[],
  sortCol: CoveragePoolSortCol,
  sortDir: 'asc' | 'desc',
  streamHostAccountId: string,
  streamSecondaryAccountId: string,
): { accountId: string; items: StockCoverageItem[] }[] {
  const by = new Map<string, StockCoverageItem[]>()
  for (const r of rows) {
    const k = (r.account_id ?? '').trim() || '—'
    if (!by.has(k)) by.set(k, [])
    by.get(k)!.push(r)
  }
  const rank = (id: string) => {
    const t = (id ?? '').trim()
    if (streamHostAccountId && t === streamHostAccountId) return 0
    if (streamSecondaryAccountId && t === streamSecondaryAccountId) return 1
    return 2
  }
  const keys = [...by.keys()].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra - rb
    return a.localeCompare(b)
  })
  return keys.map((accountId) => ({
    accountId,
    items: sortStockCoverageItemsByColumn(by.get(accountId)!, sortCol, sortDir),
  }))
}

/** Watchlist opportunities: required = watchlist-only hedge slice. */
export function buildWatchlistBackingCoverageItems(
  stockCoverageItems: StockCoverageItem[],
): StockCoverageItem[] {
  return stockCoverageItems
    .filter((ci) => (ci.watchlist_scope_instances ?? 0) > 0 && ci.optionable_supported !== false)
    .map((ci) => {
      const rw = ci.required_watchlist_shares ?? 0
      return { ...ci, required_shares: rw, surplus_or_gap: ci.held_shares - rw }
    })
}

/** Long stock left after all opportunity hedges; can back further options. */
export function buildOptionUnderlyingPoolItems(
  stockCoverageItems: StockCoverageItem[],
): StockCoverageItem[] {
  const out: StockCoverageItem[] = []
  for (const ci of stockCoverageItems) {
    if (ci.optionable_supported === false) continue
    const held = ci.held_shares
    const req = ci.required_shares
    if (!Number.isFinite(held) || held <= 0) continue
    const avail = Math.max(0, held - req)
    if (avail <= 0) continue
    const ratio = held > 0 ? avail / held : 0
    const costSlice = ci.cost_basis_total != null ? ci.cost_basis_total * ratio : null
    const dailySlice = ci.daily_pnl != null ? ci.daily_pnl * ratio : null
    const totalSlice = ci.total_pnl != null ? ci.total_pnl * ratio : null
    const dailyPct =
      dailySlice != null && ci.daily_pnl != null && Math.abs(ci.daily_pnl) > 1e-9 ? ci.daily_pct : null
    const totalPct =
      costSlice != null && costSlice > 0 && totalSlice != null ? (totalSlice / costSlice) * 100 : null
    out.push({
      ...ci,
      held_shares: avail,
      required_shares: 0,
      required_watchlist_shares: 0,
      surplus_or_gap: avail,
      cost_basis_total: costSlice,
      daily_pnl: dailySlice,
      daily_pct: dailyPct,
      total_pnl: totalSlice,
      total_pct: totalPct,
      instances_needing: 0,
      backing_opportunities: [],
      watchlist_scope_instances: 0,
    })
  }
  out.sort((a, b) => a.symbol.localeCompare(b.symbol) || a.account_id.localeCompare(b.account_id))
  return out
}

export function underlyingPoolMarketTotal(
  items: StockCoverageItem[],
  sectionAccount: 'all' | string,
): number {
  const rows =
    sectionAccount === 'all'
      ? items
      : items.filter((ci) => (ci.account_id ?? '').trim() === sectionAccount)
  return rows.reduce((s, ci) => {
    const h = ci.held_shares
    const p = ci.live_last_price
    if (p == null || !Number.isFinite(p) || !Number.isFinite(h)) return s
    return s + h * p
  }, 0)
}

export function fmtHeldSharesWhole(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return String(Math.round(n))
}

export function fmtSurplusShares(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n >= 0 ? `+${n.toFixed(3)}` : n.toFixed(3)
}
