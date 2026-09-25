/**
 * Earnings moves — the words and widths the History panel prints from
 * `/analytics/vol/earnings-moves`. Pure, so the rules are tested once.
 */
import type { EarningsMoves, EarningsPrint } from '@/api/research/vrp'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MINUS = '−'

const prints = (n: number) => `${n} print${n === 1 ? '' : 's'}`

/** `2026-08-03` → `3 Aug 26`, the design's print label. */
export function printLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MON[m - 1]} ${String(y).slice(2)}`
}

/** A move as a percent of the close, one decimal. */
export function movePct(x: number | null): string {
  return x == null ? '—' : `${(x * 100).toFixed(1)}%`
}

/** The straddle's charge reads as a range: `±11.4%`. */
export function pricedPct(x: number | null): string {
  return x == null ? '—' : `±${(x * 100).toFixed(1)}%`
}

export function ratioText(r: number | null): string {
  return r == null ? '—' : `${r.toFixed(2)}×`
}

/** The bar spans 0–2×, so its midline is where the straddle was fair. */
export function ratioBarWidth(r: number | null): number {
  return r == null ? 0 : Math.min(100, Math.max(0, (r / 2) * 100))
}

/** The move came in over what was charged. */
export function underPriced(p: EarningsPrint): boolean {
  return p.ratio != null && p.ratio > 1
}

export function crushText(pts: number | null): string {
  if (pts == null) return '—'
  const v = Math.round(pts)
  return `${v < 0 ? MINUS : v > 0 ? '+' : ''}${Math.abs(v)} pts`
}

/** The row's direction in words for a title: `up 29.5% against ±11.4%`. */
function missWords(p: EarningsPrint): string {
  return `${printLabel(p.filed)} (${p.direction ?? 'moved'} ${movePct(p.actual)} against ${pricedPct(p.priced)})`
}

/**
 * The sentence under the table. It says what the store holds when there is
 * nothing to summarise, rather than leaving an empty panel to be read as "no
 * earnings".
 */
export function earningsStory(m: EarningsMoves): string {
  const sym = m.symbol
  if (m.prints.length === 0) {
    if (m.filing_days === 0) {
      return `No 8-K on file for ${sym} — a fund files none, and the SEC feed covers only the market-data plugin's own list of names.`
    }
    return `${sym} has ${m.filing_days} filing days on file and none carries Item 2.02, the results release — no print to read.`
  }
  if (m.n === 0 || m.median_ratio == null) {
    return `None of the ${prints(m.prints.length)} could be priced — each row says what is missing.`
  }
  const parts = [
    `Median actual / priced ${m.median_ratio.toFixed(2)}× over ${prints(m.n)} — the straddle has been rich here ${m.rich} times out of ${m.n}.`,
  ]
  const misses = m.prints.filter(underPriced)
  if (misses.length > 0) {
    parts.push(`${misses.length === 1 ? 'The miss' : 'The misses'}: ${misses.map(missWords).join(', ')}.`)
  }
  const unpriced = m.prints.length - m.n
  if (unpriced > 0) parts.push(`${unpriced} of ${prints(m.prints.length)} could not be priced.`)
  return parts.join(' ')
}

/** Dashed marks for the IV chart, one per print, on its filing date. */
export function printMarks(m: EarningsMoves | null | undefined): { date: string; label: string; title: string }[] {
  return (m?.prints ?? []).map((p) => ({
    date: p.filed,
    label: 'E',
    title: `Earnings — 8-K Item 2.02 filed ${p.filed}`,
  }))
}
