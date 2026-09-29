/**
 * The instance face's figures (design Rev .101, `_Part InstanceRecord`), from
 * the instance's own fills.
 *
 * The prototype models its legs from an instance's cost; here every leg is a
 * contract the fills actually traded, its entry the fills' own average, its
 * exit the closing fills' average — or, while it is open, a mark whose source
 * and date are carried with it (a live quote, else the contract's last daily
 * close). Pure: the hook fetches, this derives, the component draws.
 */
import type { Execution } from '@/types/positions'
import { buildOptExecutionGroups, isBuySide, type OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { payoffOptionsAtPrice, payoffStockAtPrice, type RiskPosition } from '@/utils/riskProfile'

export interface LegMark {
  price: number
  /**
   * `live` quote; the vendor's `snap`shot of the contract (its day close at the
   * capture time — intraday until the evening capture); or the contract's own
   * `eod` daily bar.
   */
  source: 'live' | 'snap' | 'eod'
  /** The bar date for an EOD mark; the capture timestamp for a snapshot. */
  asOf?: string
}

export interface RecordLeg {
  key: string
  /** The underlying root — a multi-name instance is drawn name by name. */
  root: string
  label: string
  expiry: string | null
  strike: number
  right: 'C' | 'P'
  side: 'Short' | 'Long'
  /** Contracts at their largest — what was held. */
  qty: number
  /** Contracts still open (signed: + long, − short). */
  openQty: number
  entry: number | null
  /** Exit average when flat; the mark while open; null when neither is known. */
  exit: number | null
  exitKind: 'exit' | 'mark' | 'none'
  mark?: LegMark
  /** Cash so far plus the open remainder at its mark; null when it cannot be marked. */
  pnl: number | null
  open: boolean
  group: OptExecutionGroup
}

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** `2026-11-20` → `20NOV26`. */
export function d3(iso: string | null | undefined): string {
  const s = (iso ?? '').replace(/-/g, '')
  if (!/^\d{8}$/.test(s)) return iso ?? '—'
  return `${s.slice(6, 8)}${MON[Number(s.slice(4, 6)) - 1]}${s.slice(2, 4)}`
}

function isoOfExpiry(raw: string | null | undefined): string | null {
  const s = (raw ?? '').replace(/-/g, '')
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null
}

export function rootOf(e: Pick<Execution, 'symbol'>): string {
  return (e.symbol ?? '').trim().split(/\s+/)[0]?.toUpperCase() ?? ''
}

/** A fill's trade day (`YYYY-MM-DD`), from its statement date or its time. */
export function tradeDay(e: Execution): string | null {
  if (e.trade_date) return String(e.trade_date).slice(0, 10)
  return e.time != null ? new Date(e.time * 1000).toISOString().slice(0, 10) : null
}

/** One leg per contract the fills traded. */
export function legsOf(executions: readonly Execution[], marks: Record<string, LegMark>): RecordLeg[] {
  return buildOptExecutionGroups([...executions]).map((g) => {
    const byTime = [...g.trades].sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
    const short = byTime.length > 0 && !isBuySide(byTime[0].side)
    const right = ((g.option_right || 'C')[0].toUpperCase() === 'P' ? 'P' : 'C') as 'C' | 'P'
    const open = g.status === 'unrealized'
    const entry = short ? g.sell_avg_price : g.buy_avg_price
    const closeAvg = short ? g.buy_avg_price : g.sell_avg_price
    const mark = open ? marks[g.contract_key] : undefined
    const exit = open ? (mark?.price ?? null) : closeAvg
    const cash = g.sell_premium - g.buy_cost
    const pnl = open ? (mark ? cash + g.net_qty * mark.price * 100 : null) : g.realized_pnl
    const root = rootOf({ symbol: g.symbol })
    const expiry = isoOfExpiry(g.expiry)
    return {
      key: g.contract_key,
      root,
      label: `${root} ${d3(expiry)} ${g.strike}${right}`,
      expiry,
      strike: g.strike,
      right,
      side: short ? 'Short' : 'Long',
      qty: Math.max(g.buy_volume, g.sell_volume),
      openQty: g.net_qty,
      entry,
      exit,
      exitKind: open ? (mark ? 'mark' : 'none') : 'exit',
      mark,
      pnl,
      open,
      group: g,
    }
  })
}

export interface Life {
  from: string | null
  /** Closed: the last fill's day. Open: the latest open leg's expiry. */
  to: string | null
  closed: boolean
  totalDays: number | null
  /** Days elapsed (closed = total). */
  elapsed: number | null
  expired: boolean
}

const dayMs = 86_400_000
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`)

export function lifeOf(executions: readonly Execution[], legs: readonly RecordLeg[], today: string): Life {
  const days = executions.map(tradeDay).filter((d): d is string => d != null).sort()
  const from = days[0] ?? null
  const closed = legs.length > 0 && legs.every((l) => !l.open)
  const openExp = legs.filter((l) => l.open && l.expiry).map((l) => l.expiry!).sort()
  const to = closed ? (days[days.length - 1] ?? null) : (openExp[openExp.length - 1] ?? null)
  const totalDays = from && to ? Math.max(1, Math.round((toMs(to) - toMs(from)) / dayMs)) : null
  const elapsed = from ? (closed ? totalDays : Math.max(0, Math.round((toMs(today) - toMs(from)) / dayMs))) : null
  return { from, to, closed, totalDays, elapsed, expired: !closed && to != null && to < today }
}

export interface PayoffPoint {
  price: number
  options: number
  stock: number
  total: number
}

export interface Payoff {
  root: string
  points: PayoffPoint[]
  breakevens: number[]
  maxGain: PayoffPoint
  maxLoss: PayoffPoint
  /** Falling at the right edge with no shares to cover — an uncovered short call. */
  lossUnbounded: boolean
  credit: number
}

/**
 * The position as held, at expiration, over 0 … 2× the widest of strikes and
 * spot — the design's "as held". While anything is open that is the open legs
 * at their open size (a leg already flat, or the part of one already closed,
 * no longer carries risk); once everything is flat it is every leg at its
 * largest size, so a closed instance still reads as the bet it was.
 */
export function heldLegs(legs: readonly RecordLeg[]): { leg: RecordLeg; qty: number }[] {
  const priced = legs.filter((l) => l.entry != null)
  const open = priced.filter((l) => l.open)
  return open.length
    ? open.map((l) => ({ leg: l, qty: Math.abs(l.openQty) }))
    : priced.map((l) => ({ leg: l, qty: l.qty }))
}

export function payoffOf(
  legs: readonly RecordLeg[],
  shares: { qty: number; avgCost: number | null } | null,
  spot: number | null,
  steps = 80,
): Payoff | null {
  const held = heldLegs(legs)
  if (held.length === 0) return null
  const own = held.map((h) => h.leg)
  const positions: RiskPosition[] = held.map(({ leg: l, qty }) => ({
    strike: l.strike,
    right: l.right,
    qty: l.side === 'Short' ? -qty : qty,
    avg_cost: l.entry!,
  }))
  const top = Math.max(...own.map((l) => l.strike), spot ?? 0)
  const hi = top * 2
  const points: PayoffPoint[] = []
  for (let k = 0; k <= steps; k++) {
    const price = (hi * k) / steps
    const options = payoffOptionsAtPrice(positions, price)
    const stock = shares ? payoffStockAtPrice(shares.qty, shares.avgCost, price) : 0
    points.push({ price, options, stock, total: options + stock })
  }
  const breakevens: number[] = []
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1]
    const b = points[k]
    if ((a.total < 0 && b.total >= 0) || (a.total >= 0 && b.total < 0)) {
      breakevens.push(a.price + ((b.price - a.price) * -a.total) / (b.total - a.total || 1))
    }
  }
  const maxGain = points.reduce((m, p) => (p.total > m.total ? p : m), points[0])
  const maxLoss = points.reduce((m, p) => (p.total < m.total ? p : m), points[0])
  const n = points.length
  const lossUnbounded = !shares?.qty && points[n - 1].total < points[n - 2].total - 1
  const credit = held.reduce((a, { leg: l, qty }) => a + (l.side === 'Short' ? 1 : -1) * l.entry! * qty * 100, 0)
  return { root: own[0].root, points, breakevens, maxGain, maxLoss, lossUnbounded, credit }
}

export interface ExecSide {
  name: 'Buy' | 'Sell'
  qty: number
  avg: number | null
  total: number
  fills: { date: string; id: number | null; qty: number; price: number; comm: number }[]
}

export interface ExecGroup {
  key: string
  label: string
  netQty: number
  open: boolean
  gross: number
  comm: number
  net: number
  sides: [ExecSide, ExecSide]
}

/** The Performance book, contract by contract: buys beside sells, then the net. */
export function execGroupsOf(legs: readonly RecordLeg[]): ExecGroup[] {
  return legs.map((l) => {
    const side = (buy: boolean): ExecSide => {
      const xs = l.group.trades.filter((t) => isBuySide(t.side) === buy)
      const qty = xs.reduce((a, t) => a + Math.abs(Number(t.quantity ?? t.qty) || 0), 0)
      const total = xs.reduce((a, t) => a + Math.abs(Number(t.quantity ?? t.qty) || 0) * (Number(t.price) || 0) * 100, 0)
      return {
        name: buy ? 'Buy' : 'Sell',
        qty,
        avg: qty ? total / qty / 100 : null,
        total,
        fills: xs
          .map((t) => ({
            date: tradeDay(t) ?? '',
            id: t.account_executions_id ?? null,
            qty: Math.abs(Number(t.quantity ?? t.qty) || 0),
            price: Number(t.price) || 0,
            comm: Number(t.commission) || 0,
          }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      }
    }
    const b = side(true)
    const s = side(false)
    const comm = l.group.trades.reduce((a, t) => a + (Number(t.commission) || 0), 0)
    const gross = s.total - b.total
    return { key: l.key, label: l.label, netQty: l.openQty, open: l.open, gross, comm, net: gross - comm, sides: [b, s] }
  })
}

/**
 * TWS client rows for the instance's contracts. TWS raw rows carry no
 * instance attribution (0 on PROD 2026-09-28), so they are matched by the
 * contract keys the instance's own fills traded — and TWS keeps only recent
 * days, so an older instance matching nothing is the expected answer.
 */
export function twsRowsFor(rows: readonly Execution[], keys: ReadonlySet<string>): Execution[] {
  return rows
    .filter((r) => keys.has((r.contract_key ?? '').trim()))
    .sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
}

export interface PositionRow {
  key: string
  label: string
  kind: 'opt' | 'stk'
  /** Signed: + long, − short (contracts, or shares). */
  qty: number
  mark: number | null
  /** Signed market value — a short leg is a liability. */
  value: number | null
  /** Share-equivalent delta of the holding. */
  delta: number | null
  /** Per day, signed for the holder. */
  theta: number | null
  /** A short strike's distance from spot, as a fraction; negative = through it. */
  cushion: number | null
}

export interface PositionView {
  spot: number | null
  dte: number | null
  /** Sums over the rows that carry the Greek; `priced` says how many did. */
  delta: number | null
  theta: number | null
  unrealized: number | null
  priced: number
  optionRows: number
  greeksAsOf: string | null
  rows: PositionRow[]
}

export interface LegGreek {
  delta: number | null
  theta: number | null
  asOf: string | null
}

/**
 * What is held right now (design Rev .102, the face's Position block): the
 * open legs at their open size and marks, with the vendor's Greeks scaled to
 * the holding — the same per-share rows Positions reads. A leg the vendor did
 * not price keeps its row and drops out of the sums, and `priced` says so.
 */
export function positionOf(
  legs: readonly RecordLeg[],
  greekOf: (leg: RecordLeg) => LegGreek | null,
  spot: number | null,
  today: string,
  shares: { qty: number; avgCost: number | null } | null,
): PositionView | null {
  const open = legs.filter((l) => l.open && l.openQty !== 0)
  if (open.length === 0) return null
  let dSum = 0
  let tSum = 0
  let priced = 0
  let asOf: string | null = null
  const rows: PositionRow[] = open.map((l) => {
    const g = greekOf(l)
    const mark = l.mark?.price ?? null
    const delta = g?.delta != null ? g.delta * l.openQty * 100 : null
    const theta = g?.theta != null ? g.theta * l.openQty * 100 : null
    if (delta != null && theta != null) {
      priced++
      dSum += delta
      tSum += theta
      if (g?.asOf && (asOf == null || g.asOf < asOf)) asOf = g.asOf
    }
    const cushion =
      l.openQty < 0 && spot != null && spot > 0 ? (l.right === 'C' ? (l.strike - spot) / spot : (spot - l.strike) / spot) : null
    return {
      key: l.key,
      label: l.label,
      kind: 'opt',
      qty: l.openQty,
      mark,
      value: mark != null ? l.openQty * mark * 100 : null,
      delta,
      theta,
      cushion,
    }
  })
  const optionRows = rows.length
  if (shares && shares.qty > 0) {
    const root = open[0].root
    rows.push({
      key: `${root}|STK`,
      label: `${root} shares`,
      kind: 'stk',
      qty: shares.qty,
      mark: spot,
      value: spot != null ? spot * shares.qty : null,
      delta: shares.qty,
      theta: 0,
      cushion: null,
    })
    dSum += shares.qty
  }
  const expiries = open.map((l) => l.expiry).filter((e): e is string => e != null).sort()
  const last = expiries[expiries.length - 1]
  const pnls = open.map((l) => l.pnl)
  return {
    spot,
    dte: last ? Math.round((toMs(last) - toMs(today)) / dayMs) : null,
    delta: priced > 0 || shares ? dSum : null,
    theta: priced > 0 ? tSum : null,
    unrealized: pnls.every((p) => p != null) ? pnls.reduce((a, p) => a + (p as number), 0) : null,
    priced,
    optionRows,
    greeksAsOf: asOf,
    rows,
  }
}
