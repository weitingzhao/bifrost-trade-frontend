import type { GreeksRow } from '@/types/research'

export function fmtIV(iv: number | null): string {
  if (iv == null) return '—'
  return `${(iv * 100).toFixed(1)}%`
}

export function fmtGreek(v: number | null, decimals = 4): string {
  if (v == null) return '—'
  return v.toFixed(decimals)
}

export function groupByExpiry(rows: GreeksRow[]): Map<string, GreeksRow[]> {
  const map = new Map<string, GreeksRow[]>()
  for (const row of rows) {
    const arr = map.get(row.expiry) ?? []
    arr.push(row)
    map.set(row.expiry, arr)
  }
  return map
}

export function dteFromTradeDate(expiry: string, tradeDate: string): number {
  const dte = Math.round((new Date(expiry).getTime() - new Date(tradeDate).getTime()) / 86_400_000)
  return Math.max(0, dte)
}
