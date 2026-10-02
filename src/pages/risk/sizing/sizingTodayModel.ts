/**
 * Sizing's Today and This week (design Rev .107, Budget merged into Sizing):
 * the risk the book took on, trade by trade, at max loss rather than premium.
 *
 * The design spends budget on *decisions* — a sized plan reserves its max loss
 * when it leaves Sizing. Nothing on this side records a sizing decision, so the
 * rows are the fills: what was actually taken. Suggested stays unrecorded and
 * says so; it is never back-filled with the size taken.
 *
 * Max loss at entry, per fill, where the contract pins it down:
 *   stock bought        qty × price
 *   option bought       premium paid, price × 100 × qty
 *   put sold            (strike − premium) × 100 × qty
 *   call sold           unbounded unless covered — not priced here
 * A fill that booked realised P&L is a close; closes and derisks never spend
 * budget (the design's own rule), so it reads 0 with that note.
 */
import type { Execution } from '@/types/positions'

export interface TakenRow {
  key: string
  /** Unix seconds; null when the fill carries only a trade date. */
  time: number | null
  symbol: string
  contract: string
  taken: number
  /** Max loss at entry; 0 for a close; null when the contract does not pin it. */
  risk: number | null
  note: string
  /** Running total in time order, over the rows priced so far. */
  cum: number
}

export interface WeekDay {
  label: string
  date: string
  risk: number
  today: boolean
}

const MULTIPLIER = 100

function qtyOf(e: Execution): number {
  return Math.abs(Number(e.quantity) || 0)
}

function fillRight(e: Execution): string {
  return (e.option_right ?? '').toUpperCase().slice(0, 1)
}

function isOption(e: Execution): boolean {
  return (e.sec_type ?? '').toUpperCase() === 'OPT'
}

function sideOf(e: Execution): 'buy' | 'sell' {
  return String(e.side).toLowerCase().startsWith('s') ? 'sell' : 'buy'
}

function expiryTag(expiry: string | undefined): string {
  const m = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec((expiry ?? '').trim())
  if (!m) return ''
  const mon = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Number(m[2]) - 1]
  return `${m[3]}${mon}${m[1].slice(2)}`
}

export function contractText(e: Execution): string {
  const side = sideOf(e) === 'sell' ? 'sell' : 'buy'
  if (!isOption(e)) return `${side} ${qtyOf(e)} sh`
  return `${side} ${expiryTag(e.expiry ?? undefined)} ${e.strike ?? ''}${fillRight(e)}`.replace(/\s+/g, ' ').trim()
}

/** Max loss at entry for one fill, with the reason it reads the way it does. */
export function fillRisk(e: Execution): { risk: number | null; note: string } {
  if (e.realized_pnl != null && Number(e.realized_pnl) !== 0) {
    return { risk: 0, note: 'close — no budget' }
  }
  const qty = qtyOf(e)
  const price = Math.abs(Number(e.price) || 0)
  if (!isOption(e)) {
    return sideOf(e) === 'buy'
      ? { risk: qty * price, note: 'shares at cost' }
      : { risk: null, note: 'short stock — unbounded' }
  }
  if (sideOf(e) === 'buy') return { risk: price * MULTIPLIER * qty, note: 'premium paid' }
  if (fillRight(e) === 'P' && e.strike != null) {
    return { risk: Math.max(0, e.strike - price) * MULTIPLIER * qty, note: 'strike less credit' }
  }
  return { risk: null, note: 'short call — covered or unbounded, not priced' }
}

/** YYYY-MM-DD of a fill in New York, where the trading day is counted. */
export function fillDate(e: Execution): string | null {
  if (e.time != null && Number.isFinite(e.time)) return nyDate(e.time)
  const d = (e.trade_date ?? '').slice(0, 10)
  return d.length === 10 ? d : null
}

export function nyDate(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

/** Today's fills, newest first, each with the running total up to it. */
export function takenToday(fills: readonly Execution[], today: string): TakenRow[] {
  const rows = fills
    .filter((e) => fillDate(e) === today)
    .slice()
    .sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
  let cum = 0
  const out = rows.map((e, i) => {
    const { risk, note } = fillRisk(e)
    cum += risk ?? 0
    return {
      key: e.exec_id ?? `${e.account_executions_id ?? 'x'}-${i}`,
      time: e.time,
      symbol: (e.symbol ?? '').toUpperCase(),
      contract: contractText(e),
      taken: qtyOf(e),
      risk,
      note,
      cum,
    }
  })
  return out.reverse()
}

/** Monday of the week `today` falls in, through today — the design's six bars less the weekend. */
export function weekOf(fills: readonly Execution[], today: string): WeekDay[] {
  const [y, m, d] = today.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  const dow = (t.getUTCDay() + 6) % 7 // Monday = 0
  const days: WeekDay[] = []
  for (let i = 0; i <= Math.min(dow, 4); i += 1) {
    const day = new Date(Date.UTC(y, m - 1, d - dow + i)).toISOString().slice(0, 10)
    days.push({
      label: day === today ? 'today' : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i],
      date: day,
      risk: 0,
      today: day === today,
    })
  }
  if (dow > 4) days.push({ label: 'today', date: today, risk: 0, today: true })
  const byDate = new Map(days.map((day) => [day.date, day]))
  for (const e of fills) {
    const date = fillDate(e)
    const day = date ? byDate.get(date) : undefined
    if (day) day.risk += fillRisk(e).risk ?? 0
  }
  return days
}
