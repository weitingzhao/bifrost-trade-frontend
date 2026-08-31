import type { ScreenerSymbolGroup } from '@/types/research'

export function exportScreenerCsv(groups: ScreenerSymbolGroup[], structureType: string): void {
  const header = [
    'symbol', 'strike', 'right', 'expiry', 'dte',
    'rating', 'risk', 'score', 'iv', 'premium', 'prob_itm',
    'bid', 'ask', 'mid', 'spread_pct', 'oi',
    'delta', 'gamma', 'theta', 'vega',
  ]
  const rows = groups.flatMap(g =>
    g.contracts.map(c => [
      g.symbol, c.strike, c.right, c.expiry, c.dte,
      c.rating, c.risk, c.score,
      c.iv != null ? (c.iv * 100).toFixed(2) : '',
      c.premium != null ? c.premium.toFixed(2) : '',
      c.prob_itm != null ? (c.prob_itm * 100).toFixed(1) : '',
      c.bid ?? '', c.ask ?? '', c.mid ?? '',
      c.spread_pct != null ? (c.spread_pct * 100).toFixed(2) : '',
      c.oi ?? '',
      c.delta ?? '', c.gamma ?? '', c.theta ?? '', c.vega ?? '',
    ]),
  )
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `screener_${structureType}_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
