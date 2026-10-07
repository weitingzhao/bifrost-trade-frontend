/**
 * Playbook › Record › Earned from (Rev .112, §5.1.3): whether a play earned the
 * way it says — θ and vega for a sell-vol play, Δ for a drift play — from the
 * snapshot attribution P&L Explain computes per trade (api 0.12.0, TD-138).
 * Quoted per play by summing its trades' rows; never recomputed here.
 */
import type { AttributionSums } from '@/lib/schemas/snapshots'

export interface EarnedFrom {
  /** θ + vega over the play's read rows. */
  carry: number
  /** Δ + Γ over the same rows. */
  drift: number
  unexplained: number
  readRows: number
  trades: number
  /** `θ+vega 62% · Δ 38%` — shares of |carry| + |drift|; null when both are zero. */
  text: string | null
}

export function earnedFromByPlay(
  trades: readonly { play: string | null; tradeId: number | null }[],
  byTrade: readonly (AttributionSums & { trade_id: number | null })[],
): Map<string, EarnedFrom> {
  const sums = new Map(byTrade.filter((t) => t.trade_id != null).map((t) => [t.trade_id as number, t]))
  const idsByPlay = new Map<string, Set<number>>()
  for (const t of trades) {
    if (!t.play || t.tradeId == null) continue
    const ids = idsByPlay.get(t.play) ?? new Set<number>()
    ids.add(t.tradeId)
    idsByPlay.set(t.play, ids)
  }
  const out = new Map<string, EarnedFrom>()
  for (const [play, ids] of idsByPlay) {
    let carry = 0
    let drift = 0
    let unexplained = 0
    let readRows = 0
    let n = 0
    for (const id of ids) {
      const s = sums.get(id)
      if (!s || s.read_rows === 0) continue
      n += 1
      carry += s.theta_pnl + s.vega_pnl
      drift += s.delta_pnl + s.gamma_pnl
      unexplained += s.unexplained
      readRows += s.read_rows
    }
    if (readRows === 0) continue
    const whole = Math.abs(carry) + Math.abs(drift)
    const text =
      whole > 0
        ? `θ+vega ${Math.round((Math.abs(carry) / whole) * 100)}% · Δ ${Math.round((Math.abs(drift) / whole) * 100)}%`
        : null
    out.set(play, { carry, drift, unexplained, readRows, trades: n, text })
  }
  return out
}
