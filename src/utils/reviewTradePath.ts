/**
 * An instance's P&L line, every leg on one path (design Rev .104).
 *
 * The contract-level path (`reviewMarkPath`) is `cash(d) + openQty(d) ×
 * mark(d) × 100` for one contract. An instance sums that over its legs: a
 * roll closes one leg and opens the next on the same line, so the seam is
 * visible as a step in the cash and a change in which leg is marked. A leg's
 * mark on a day with no bar carries its last close forward; a day on which an
 * open leg has never been marked is skipped rather than priced at zero.
 *
 * Closed: the line ends on the close date at every fill's cash — the Ledger's
 * realised figure. Open: it ends at the last session with marks, and best /
 * worst are to date (the interim review).
 */
import { businessDaysBetween, daysBetween } from '@/lib/isoDate'
import type { DailyBar } from '@/api/marketData/dailyBars'
import type { MarkPath, MarkPoint } from '@/utils/reviewMarkPath'
import type { ReviewedTrade } from '@/utils/reviewedTrades'

const signed = (side: 'buy' | 'sell', qty: number) => (side === 'buy' ? qty : -qty)

export function buildTradePath(
  inst: Pick<ReviewedTrade, 'legs' | 'openedOn' | 'closedOn'>,
  barsByKey: ReadonlyMap<string, readonly DailyBar[]>,
  today: string,
): MarkPath | null {
  const start = inst.openedOn
  if (!start || inst.legs.length === 0) return null
  const end = inst.closedOn ?? today
  const closeOf = new Map<string, Map<string, number>>()
  const dates = new Set<string>()
  for (const leg of inst.legs) {
    const m = new Map<string, number>()
    for (const b of barsByKey.get(leg.contractKey) ?? []) {
      if (b.close == null || b.date < start || b.date > end) continue
      m.set(b.date, b.close)
      dates.add(b.date)
    }
    closeOf.set(leg.contractKey, m)
  }
  if (inst.closedOn) dates.add(inst.closedOn)
  const days = [...dates].sort()
  const last = new Map<string, number>()
  const held: MarkPoint[] = []
  for (const d of days) {
    let cash = 0
    let value = 0
    let net = 0
    let unknown = false
    for (const leg of inst.legs) {
      const c = closeOf.get(leg.contractKey)?.get(d)
      if (c != null) last.set(leg.contractKey, c)
      let q = 0
      for (const f of leg.fills) {
        if (f.date == null || f.date > d) continue
        cash += f.cash
        q += signed(f.side, f.qty)
      }
      if (q !== 0) {
        const mark = last.get(leg.contractKey)
        if (mark == null) unknown = true
        else value += q * mark * 100
        net += q
      }
    }
    if (unknown && !(inst.closedOn && d === inst.closedOn)) continue
    // Flat on its close date by construction: the line lands on every fill's cash.
    held.push({ date: d, openQty: inst.closedOn && d === inst.closedOn ? 0 : net, mark: 0, pl: inst.closedOn && d === inst.closedOn ? cash : cash + value })
  }
  if (held.length === 0) return null
  let best = held[0]
  let worst = held[0]
  for (const p of held) {
    if (p.pl > best.pl) best = p
    if (p.pl < worst.pl) worst = p
  }
  const tail = held[held.length - 1]
  return {
    held,
    ifHeld: [],
    best: best.pl,
    bestDate: best.date,
    worst: worst.pl,
    worstDate: worst.date,
    realised: tail.pl,
    captureOfBest: best.pl > 0 ? tail.pl / best.pl : null,
    cutLatencyDays: worst.date === tail.date ? null : daysBetween(worst.date, tail.date),
    everUnderwater: worst.pl < 0,
    bars: held.length,
    businessDays: businessDaysBetween(start, end),
  }
}
