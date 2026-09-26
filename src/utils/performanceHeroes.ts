import { pnlColorClass } from '@/utils/dailyChange'
import type { ReadingMetric, ReadingTone } from '@/utils/performanceReading'

/** How a reading is inked: direction for P&L, the unrealized orange, or quiet. */
export function readingToneClass(tone: ReadingTone, raw?: number | null): string {
  const byTone: Record<ReadingTone, string> = {
    pnl: pnlColorClass(raw),
    loss: 'text-loss',
    unrealized: 'text-unrealized',
    plain: 'text-foreground',
    soft: 'text-foreground/80',
    muted: 'text-muted-foreground',
  }
  return byTone[tone]
}

export interface PerformanceHero {
  label: string
  value: string
  raw?: number | null
  tone: ReadingTone
  sub: string
  title?: string
}

/**
 * The page's hero row (§16.2, Rev .82): the Profitability group, promoted
 * out of the range strip — Total P&L, Realized, Unrealized and Net of fees,
 * with Commissions as Net's sub line. What stays in the strip is Consistency
 * and Risk; nothing is printed twice.
 *
 * Read from `buildReadingMetrics`, the one read of the response, so the heroes
 * and Portfolio Overview (which quotes the same metrics) cannot disagree. The
 * sub lines say what each number is on this side: Total is net of fees plus
 * unrealized, and Unrealized is every open position now, not the range — a
 * reader who took it for the range's would misread the row (§16.3).
 */
export function splitReading(
  metrics: readonly ReadingMetric[],
  rangeWord: string,
): { heroes: PerformanceHero[]; strip: ReadingMetric[] } {
  const find = (prefix: string) => metrics.find((m) => m.label.startsWith(prefix))
  const total = find('Profitability')
  const realized = find('Realized')
  const unrealized = find('Unrealized')
  const net = find('Net of fees')
  const commissions = find('Commissions')
  const promoted = new Set([total, realized, unrealized, net, commissions].filter((m) => m != null))
  const heroes: PerformanceHero[] = []
  if (total) {
    heroes.push({ label: 'Total P&L', value: total.value, raw: total.raw, tone: total.tone, sub: `net of fees + unrealized · ${rangeWord}`, title: total.title })
  }
  if (realized) {
    heroes.push({ label: 'Realized', value: realized.value, raw: realized.raw, tone: realized.tone, sub: 'legs closed in the range', title: realized.title })
  }
  if (unrealized) {
    heroes.push({ label: 'Unrealized', value: unrealized.value, raw: unrealized.raw, tone: unrealized.tone, sub: 'every open position now · not limited to the range', title: unrealized.title })
  }
  if (net) {
    heroes.push({
      label: 'Net of fees',
      value: net.value,
      raw: net.raw,
      tone: net.tone,
      sub: commissions ? `commissions ${commissions.value}` : 'realized less commissions',
      title: commissions?.title ?? net.title,
    })
  }
  return { heroes, strip: metrics.filter((m) => !promoted.has(m)) }
}
