/**
 * The Instance page's tables (design Rev .103, `Instance.dc.html`): every
 * fill booked to the instance, the ledger by leg, and the legs on a timeline.
 * Pure — the page fetches through `useInstanceRecord`, this lays it out.
 */
import type { Execution } from '@/types/positions'
import { d3, tradeDay, type ExecGroup, type RecordLeg } from '@/utils/tradeRecord/tradeRecordModel'
import type { TrackJoint } from '@/components/symbolChart/symbolPriceModel'

const dayOn = (e: Execution) => tradeDay(e) ?? ''

/** A fill's statement: Flex is the record; a journal close is a book event; TWS carries today until Flex lands. */
export function sourceLabel(src: string | null | undefined, day: string, today: string): string {
  const s = (src ?? '').toLowerCase()
  if (s.startsWith('flex')) return 'Flex'
  if (s.startsWith('journal')) return 'Book event'
  if (s.startsWith('tws')) return day >= today ? 'TWS · today' : 'TWS'
  return src || '—'
}

/** Legs in the order they were opened — the first fill decides. */
export function byOpening(legs: readonly RecordLeg[]): RecordLeg[] {
  const t0 = (l: RecordLeg) => Math.min(...l.group.trades.map((t) => t.time ?? Infinity))
  return [...legs].sort((a, b) => t0(a) - t0(b))
}

export interface FillRow {
  key: string
  date: string
  id: string
  label: string
  /** The contract as IB spells it — the cell's hover. */
  occ: string
  side: 'BOT' | 'SLD'
  qty: number
  price: number
  comm: number
  /** Signed cash to the account, fees in: IB's own `net_cash` where it gave one. */
  cash: number
  source: string
}

export function fillRows(
  executions: readonly Execution[],
  labelOf: (contractKey: string) => string,
  today: string,
): { rows: FillRow[]; comm: number; cash: number } {
  const rows = [...executions]
    .sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
    .map((e, i) => {
      const buy = String(e.side ?? '').toUpperCase().startsWith('B')
      const qty = Math.abs(Number(e.quantity) || 0)
      const price = Number(e.price) || 0
      const comm = Number(e.commission) || 0
      const net = (e as { net_cash?: number | null }).net_cash
      const cash = net != null && Number.isFinite(net) ? Number(net) : (buy ? -1 : 1) * qty * price * 100 - comm
      const ck = (e.contract_key ?? '').trim()
      const day = dayOn(e)
      return {
        key: `${e.account_executions_id ?? i}`,
        date: day,
        id: e.account_executions_id != null ? `#${e.account_executions_id}` : '—',
        label: labelOf(ck),
        occ: ck.split('|')[0] ?? ck,
        side: buy ? ('BOT' as const) : ('SLD' as const),
        qty,
        price,
        comm,
        cash,
        source: sourceLabel((e as { source?: string }).source, day, today),
      }
    })
  return {
    rows,
    comm: rows.reduce((a, r) => a + r.comm, 0),
    cash: rows.reduce((a, r) => a + r.cash, 0),
  }
}

export interface LedgerRow {
  key: string
  label: string
  opened: string
  /** `open`, or the day and how it ended. */
  closed: string
  qty: string
  entry: number | null
  /** The closing average, or the open remainder's mark. */
  exit: number | null
  gross: number | null
  comm: number
  net: number | null
  realised: boolean
}

/**
 * The ledger by leg. A flat leg is realised at its own fills; an open one is
 * unrealized at its mark (cash so far plus the open remainder), so the whole
 * row reads orange; a rolled leg is realised at its buy-back.
 */
export function ledgerRows(
  legs: readonly RecordLeg[],
  groups: readonly ExecGroup[],
  joints: readonly TrackJoint[],
): { rows: LedgerRow[]; realised: number; unrealized: number | null; comm: number } {
  let realised = 0
  let unrealized: number | null = 0
  let comm = 0
  const rows = byOpening(legs).map((l) => {
    const g = groups.find((x) => x.key === l.key)
    const c = g?.comm ?? 0
    comm += c
    const days = l.group.trades.map(dayOn).filter(Boolean).sort()
    const rolled = !l.open && joints.some((j) => j.fromStrike === l.strike && j.date === days[days.length - 1])
    const net = l.open ? l.pnl : (g?.net ?? null)
    if (l.open) unrealized = unrealized == null || net == null ? null : unrealized + net
    else realised += net ?? 0
    return {
      key: l.key,
      label: l.label,
      opened: d3(days[0] ?? null),
      // A close at zero is an expiry worthless, not a trade back.
      closed: l.open
        ? 'open'
        : `${d3(days[days.length - 1] ?? null)} · ${rolled ? 'rolled' : l.exit === 0 ? 'expired' : l.side === 'Short' ? 'bought back' : 'sold'}`,
      qty: `${l.side === 'Short' ? '−' : '+'}${l.open ? Math.abs(l.openQty) : l.qty}`,
      entry: l.entry,
      exit: l.exit,
      gross: net == null ? null : net + c,
      comm: c,
      net,
      realised: !l.open,
    }
  })
  return { rows, realised, unrealized: legs.some((l) => l.open) ? unrealized : null, comm }
}

export interface TimelineSeg {
  left: number
  width: number
  kind: 'held' | 'toExpiry'
}
export interface TimelineMark {
  at: number
  glyph: '●' | '■' | '↻'
  title: string
}
export interface TimelineRow {
  key: string
  label: string
  side: string
  segs: TimelineSeg[]
  marks: TimelineMark[]
}

/**
 * The legs, open to close, on one axis from the first fill to the latest of
 * today and the last open expiry. A roll ends its old leg with ↻ and notes the
 * seam's net on the new one; an open leg runs dashed on to its expiry.
 */
export function timelineRows(
  legs: readonly RecordLeg[],
  joints: readonly TrackJoint[],
  today: string,
): { rows: TimelineRow[]; from: string; to: string; todayAt: number | null } {
  legs = byOpening(legs)
  const firsts = legs.map((l) => l.group.trades.map(dayOn).filter(Boolean).sort())
  const from = firsts.map((d) => d[0]).filter(Boolean).sort()[0] ?? today
  const ends = [today, ...legs.filter((l) => l.open && l.expiry).map((l) => l.expiry!)]
  const allClosed = legs.length > 0 && legs.every((l) => !l.open)
  const lastFill = firsts.map((d) => d[d.length - 1]).filter(Boolean).sort().pop() ?? today
  const to = allClosed ? lastFill : ends.sort().pop()!
  const t0 = Date.parse(`${from}T00:00:00Z`)
  const t1 = Math.max(Date.parse(`${to}T00:00:00Z`), t0 + 86_400_000)
  const P = (d: string) => Math.max(0, Math.min(100, ((Date.parse(`${d}T00:00:00Z`) - t0) / (t1 - t0)) * 100))
  const rows = legs.map((l, i) => {
    const days = firsts[i]
    const a = days[0] ?? from
    const b = l.open ? (allClosed ? to : today) : (days[days.length - 1] ?? a)
    const into = !l.open ? joints.find((j) => j.fromStrike === l.strike && j.date === b) : undefined
    const came = joints.find((j) => j.toStrike === l.strike && j.date === a)
    const segs: TimelineSeg[] = [{ left: P(a), width: Math.max(0.6, P(b) - P(a)), kind: 'held' }]
    if (l.open && l.expiry && l.expiry > today) segs.push({ left: P(today), width: P(l.expiry) - P(today), kind: 'toExpiry' })
    const marks: TimelineMark[] = [{ at: P(a), glyph: '●', title: `${l.side === 'Short' ? 'Sold' : 'Bought'} ${d3(a)}` }]
    if (into) marks.push({ at: P(b), glyph: '↻', title: `Rolled ${d3(b)}` })
    else if (!l.open) marks.push({ at: P(b), glyph: '■', title: `${l.side === 'Short' ? 'Bought back' : 'Sold'} ${d3(b)}` })
    const q = l.open ? Math.abs(l.openQty) : l.qty
    let side = `${l.side} ${q} @ ${l.entry != null ? `$${l.entry.toFixed(2)}` : '—'}`
    if (came) side += ` · ↻ ${came.net >= 0 ? '+' : '−'}$${Math.abs(Math.round(came.net)).toLocaleString('en-US')} net ${came.net >= 0 ? 'credit' : 'debit'}`
    else if (into) side += ` · rolled ${d3(b)}`
    return { key: l.key, label: l.label, side, segs, marks }
  })
  const todayAt = !allClosed && today > from && today < to ? P(today) : null
  return { rows, from, to, todayAt }
}
