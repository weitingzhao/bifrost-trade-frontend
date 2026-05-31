import { watchlistItemLabel } from '@/utils/watchlistHelpers'
import type { WatchlistItem } from '@/types/market'

/** Substring (multi-token AND) or ordered subsequence over label + symbol + contract_key. */
export function fuzzyMatchWatchlistItem(item: WatchlistItem, queryRaw: string): boolean {
  const q0 = queryRaw.trim().toLowerCase()
  if (!q0) return true
  const label = watchlistItemLabel(item).toLowerCase()
  const sym = String(item.symbol || '').trim().toLowerCase()
  const ck = String(item.contract_key || '').trim().toLowerCase()
  const hay = `${label} ${sym} ${ck}`.trim()
  const tokens = q0.split(/\s+/).filter(Boolean)
  if (tokens.length > 1) return tokens.every(t => hay.includes(t))
  const single = tokens[0]
  if (hay.includes(single)) return true
  let i = 0
  for (const ch of single) {
    const j = hay.indexOf(ch, i)
    if (j === -1) return false
    i = j + 1
  }
  return true
}
