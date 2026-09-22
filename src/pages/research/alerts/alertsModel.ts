/**
 * The Alerts page, read out of the one queue the shell panel already shows.
 *
 * `Research Event Radar.dc.html` (Rev 2026-09-20.16) calls this page **Alerts**
 * — "conditions you armed, and what has fired" — and states the Fired
 * section's source itself: *the same items as the Analyze-alerts group — one
 * queue, two views*. So the page reads `/research/alerts`, the same store the
 * shell's panel reads, through the same three helpers (§14.2).
 *
 * ## What the store actually holds
 *
 * Measured on DEV 2026-09-22, the whole store within its own caps (200 rows,
 * 90 days): **44 alerts, and every one of them has `symbol: null`.** They are
 * lens-quality alerts — `weight_shift` 23 and `hit_rate_drop` 21, over
 * `vrp` 16 · `gex_regime` 10 · `iv_rank` 7 · `momentum` 7 · `opex_pin` 4 — and
 * not the per-symbol price alerts the prototype's fixture draws (SMCI through
 * a short-strike buffer). The design's own footer is what settles it: this is
 * the Analyze-alerts queue, and the Analyze-alerts queue is about lenses.
 *
 * So `Scope` is the lens, and every row keeps the design's shape: what fired,
 * when, how far it has moved since, and where to go to look at it.
 *
 * ## The movement column, in the alert's own units
 *
 * The design's `since fire −0.4%` needs a price at fire time. Nothing here has
 * a symbol to price. But each alert carries the movement that *made* it fire,
 * in its own units — `hit_rate_drop` its two weekly rates, `weight_shift` its
 * 30-day rate against its own mean — so the column reads that instead of a
 * dash. It is the same question asked of a lens rather than of a price.
 */
import {
  alertHref,
  alertLamp,
  alertSummary,
  rankAlerts,
  severityRank,
  type AlertShape,
} from '@/lib/alertRanking'
import type { AnalyzeAlert } from '@/api/research/alertScan'
import { fmtPctFromFraction } from '@/lib/format'

/** The reason payload is untyped, so a rate only prints when it is a number. */
const pctOf = (v: unknown): string =>
  fmtPctFromFraction(typeof v === 'number' ? v : null)

/** What the two kinds mean, in the reader's words rather than the column name. */
const KIND_TEXT: Record<string, string> = {
  weight_shift: 'its 30-day hit rate has moved off its own mean',
  hit_rate_drop: 'hot-side hit rate fell week over week',
  composite_high: 'composite score reached the top of the book',
}

const DEST_LABEL: Array<[string, string]> = [
  ['/research/signal-decay', 'Signal Decay →'],
  ['/research/scan', 'Vol ratings →'],
]

function destLabel(to: string): string {
  return DEST_LABEL.find(([p]) => to.startsWith(p))?.[1] ?? 'Open →'
}

export interface FiredRow {
  id: string
  lamp: 'red' | 'yellow' | 'gray'
  /** The lens, or the symbol on the day one arrives with a symbol. */
  scope: string
  scopeIsSymbol: boolean
  when: string
  what: string
  /** How far the reading has moved, in the alert's own units. */
  since: string | null
  sinceTone: 'up' | 'down' | 'flat'
  to: string
  dest: string
  severity: string
}

/**
 * How far the reading moved, out of the alert's own `reason`.
 *
 * Null rather than a dash when the payload does not carry the pair: a row that
 * says nothing about its movement and a row whose movement is zero are
 * different facts, and only one of them is a reading.
 */
export function sinceReading(item: AnalyzeAlert): { text: string; tone: 'up' | 'down' | 'flat' } | null {
  const r = item.reason
  if (r == null || typeof r === 'string') return null
  if (item.kind === 'hit_rate_drop') {
    if (r.curr_rate == null || r.prev_rate == null) return null
    return {
      text: `${pctOf(r.curr_rate)} in ${String(r.curr_week ?? 'this week')} against ${pctOf(r.prev_rate)} in ${String(r.prev_week ?? 'the week before')}`,
      tone: 'down',
    }
  }
  if (item.kind === 'weight_shift') {
    if (r.latest_hit_rate_30d == null || r.mean_hit_rate == null) return null
    const z = typeof r.z === 'number' ? r.z : 0
    return {
      text: `30d ${pctOf(r.latest_hit_rate_30d)} against its ${pctOf(r.mean_hit_rate)} mean`,
      tone: z > 0 ? 'up' : z < 0 ? 'down' : 'flat',
    }
  }
  return null
}

export function firedRows(items: readonly AnalyzeAlert[]): FiredRow[] {
  return rankAlerts(items).map((item, i) => {
    const shape: AlertShape = item
    const to = alertHref(shape)
    const sym = item.symbol?.trim()
    const lens = item.lens?.trim()
    const since = sinceReading(item)
    const detail = alertSummary(shape)
    const kind = KIND_TEXT[item.kind] ?? item.kind
    return {
      id: `${item.trade_date}:${item.kind}:${sym ?? ''}:${lens ?? ''}:${i}`,
      lamp: alertLamp(item.severity),
      scope: sym || lens || item.kind,
      scopeIsSymbol: Boolean(sym),
      when: item.trade_date,
      what: detail ? `${kind} · ${detail}` : kind,
      since: since?.text ?? null,
      sinceTone: since?.tone ?? 'flat',
      to,
      dest: destLabel(to),
      severity: item.severity,
    }
  })
}

export interface FiredStanding {
  /** The one line under the section title. */
  text: string
  tone: 'ok' | 'warn' | 'gray'
}

/**
 * The design's header is `N today`. Today is usually zero here, and a zero
 * printed as "0 today" reads as an all-clear — which is the one thing an alert
 * surface may never say by accident. So the line names the newest day the
 * store has and how long it has been quiet since.
 */
export function firedStanding(
  items: readonly AnalyzeAlert[],
  today: string,
  windowDays: number,
): FiredStanding {
  if (items.length === 0) {
    return {
      text: `nothing in the last ${windowDays} days — this is the store answering, not a filter`,
      tone: 'gray',
    }
  }
  const newest = items.reduce((a, b) => (a.trade_date > b.trade_date ? a : b)).trade_date
  const onNewest = items.filter((i) => i.trade_date === newest).length
  // `info` is a note; anything the ranker puts above it wants a look.
  const loud = items.some((i) => severityRank(i.severity) <= 1)
  const quiet =
    newest === today
      ? 'today'
      : `${onNewest === 1 ? 'it is' : 'they are'} the newest — nothing has fired since`
  return {
    text: `${items.length} in the last ${windowDays} days · ${onNewest} on ${newest}, ${quiet}`,
    tone: loud ? 'warn' : 'ok',
  }
}
