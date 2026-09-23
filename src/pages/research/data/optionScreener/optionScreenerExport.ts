/**
 * Export CSV — the rows the table is showing, with the engine's own columns
 * beside the design's. Score, rating and risk are not table columns (the design
 * draws none of them); the export keeps them, so nothing the engine said is
 * lost by being left off the screen.
 */
import type { ScreenGroup } from './screenerModel'
import { annReturnPct, cashPerContract, contractToken } from './screenerModel'

export function exportScreenerCsv(groups: readonly ScreenGroup[], structureType: string): void {
  const header = [
    'contract', 'symbol', 'expiry', 'strike', 'right', 'dte',
    'delta', 'prob_itm_pct', 'mid', 'ann_return_pct', 'spread_pct', 'oi', 'cash_per_contract',
    'engine_score', 'engine_rating', 'engine_risk',
  ]
  const rows = groups.flatMap((g) =>
    g.rows.map((r) => {
      const ret = annReturnPct(r)
      return [
        contractToken(g.symbol, r), g.symbol, r.expiry, r.strike, r.right, r.dte,
        r.delta ?? '',
        r.prob_itm != null ? (r.prob_itm * 100).toFixed(1) : '',
        r.mid ?? '',
        ret != null ? ret.toFixed(2) : '',
        r.spread_pct != null ? (r.spread_pct * 100).toFixed(2) : '',
        r.oi ?? '',
        cashPerContract(r),
        r.score, r.rating, r.risk,
      ]
    }),
  )
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `option_screen_${structureType}_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
