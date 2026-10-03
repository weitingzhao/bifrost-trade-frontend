/**
 * Trade review reviews an **instance**, not a contract (design Rev .104,
 * Owner 2026-09-29): every leg the instance traded is one P&L line, a roll is
 * a seam in it, and an instance still open is reviewable as an interim read.
 *
 * Built from the same fills the contract-level review reads, sliced per
 * instance the Ledger's way (`sliceExecutionForInstanceOptView`, so a fill
 * split across instances counts its share), and grouped per contract with
 * the Ledger's own `buildOptExecutionGroups`. Each instance is also a
 * `ReviewContract` — its primary leg supplies the contract fields — so the
 * page's panels read it unchanged.
 *
 * Measured on DEV 2026-09-29: 89 instances (78 single-leg, 10 two-leg, 1
 * four-leg); 15 option fills belong to no instance and stay reviewable as
 * contracts. Stock fills are never attributed to an instance (0 of 168), so a
 * covered call's share leg cannot enter the line from fills — named, not
 * guessed.
 *
 * Open or closed (core 0.41.0, TD-43): when the instance list's `state` is
 * given (`states`), an instance reads it — the one rule Rules, Risk and the
 * research MCP read too. The legs' own reading below is that same rule (core
 * copied it from here) and stays for contracts no instance owns and for a
 * page that has no instance list yet.
 */
import { buildOptExecutionGroups, isBuySide, type OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { sliceExecutionForInstanceOptView } from '@/utils/ledger/ledgerOptHelpers'
import { shortOptContractKey } from '@/utils/ledger/optionsModeBridge'
import { daysBetween } from '@/lib/isoDate'
import { daysTo, extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import type { Execution } from '@/types/positions'
import type { StrategyInstance } from '@/types/strategy'
import {
  dateSpan,
  type ExitKind,
  isoExpiry,
  orderedTrades,
  toFill,
  type ReviewFill,
  type ReviewContract,
} from '@/utils/reviewContracts'

export interface ReviewLeg {
  contractKey: string
  label: string
  expiry: string
  strike: number
  right: string
  short: boolean
  /** Contracts at their largest. */
  qty: number
  /** Contracts still open, signed (+ long, − short). */
  openQty: number
  /** Average opening price, per share; null when the fills carry none. */
  entry: number | null
  /** Average closing price, per share; null while the leg is open. */
  exit: number | null
  fills: ReviewFill[]
  openedOn: string | null
  flatOn: string | null
  /** Premium in (short) or paid (long) on opening, fees in. */
  premiumIn: number
  /** Paid to close (short) or received (long) on closing, fees in. */
  premiumOut: number
  /** Cash over every fill — the realised figure once flat. */
  cash: number
  open: boolean
}

export interface ReviewInstance extends ReviewContract {
  tradeId: number | null
  open: boolean
  legs: ReviewLeg[]
  /** Legs opened once an earlier leg was flat — each one a roll seam. */
  rolls: number
  /** Open legs all past expiry with no closing fill — read as expired worthless. */
  expiredUnbooked: boolean
}

function legOf(g: OptExecutionGroup): ReviewLeg {
  const ordered = orderedTrades(g)
  const short = ordered.length > 0 && !isBuySide(ordered[0].side)
  const { first, last } = dateSpan(ordered)
  const open = g.status !== 'realized'
  const fills = ordered.map(toFill)
  return {
    contractKey: g.contract_key,
    label: shortOptContractKey(g.contract_key),
    expiry: isoExpiry(g.expiry),
    strike: g.strike,
    right: (g.option_right || '').toUpperCase().slice(0, 1),
    short,
    qty: Math.max(g.buy_volume, g.sell_volume),
    openQty: g.net_qty,
    entry: short ? g.sell_avg_price : g.buy_avg_price,
    exit: open ? null : short ? g.buy_avg_price : g.sell_avg_price,
    fills,
    openedOn: first,
    flatOn: open ? null : last,
    premiumIn: short ? g.sell_premium : g.buy_cost,
    premiumOut: short ? g.buy_cost : g.sell_premium,
    cash: fills.reduce((a, f) => a + f.cash, 0),
    open,
  }
}

/**
 * What tells one ending from another, beyond the trade's own fills (Rev .112).
 *
 * `assignments` holds the broker's own stock deliveries — a stock `BookTrade`
 * keyed `ROOT|date|price` — so an option booked out on the day its underlying
 * was delivered at the strike reads as assigned, from the broker's record
 * rather than from a close compared with the strike. `planExitBy` is the date
 * the trade's plan said to be out by.
 */
export interface ExitContext {
  assignments?: ReadonlySet<string>
  planExitBy?: string | null
}

/** The instance list's own answer for one instance (GET /strategies/instances, core 0.41.0). */
export interface ServerInstanceState {
  state: NonNullable<StrategyInstance['state']>
  closedOn: string | null
}

/** `state` / `closed_on` by instance id, from the instance list's records. */
export function serverStatesOf(instances: readonly StrategyInstance[] | undefined): Map<number, ServerInstanceState> {
  const out = new Map<number, ServerInstanceState>()
  for (const i of instances ?? []) {
    if (i.state) out.set(i.strategy_instance_id, { state: i.state, closedOn: i.closed_on ?? null })
  }
  return out
}

/** Days either side of the planned exit that still count as on plan — the early_exit / held_past_plan rule. */
export const PLAN_EXIT_SLACK_DAYS = 3

export function assignmentKey(root: string, date: string | null | undefined, price: number): string {
  return `${root.trim().toUpperCase()}|${(date ?? '').slice(0, 10)}|${Number(price)}`
}

/** Stock deliveries the broker booked: the other half of every assignment. */
export function assignmentsIn(executions: readonly Execution[]): Set<string> {
  const out = new Set<string>()
  for (const e of executions) {
    if ((e.sec_type ?? '').toUpperCase() !== 'STK' || (e.transaction_type ?? '').trim() !== 'BookTrade') continue
    out.add(assignmentKey(e.symbol ?? '', e.trade_date, Number(e.price)))
  }
  return out
}

/**
 * How a finished trade ended, one reading per trade (design Rev .112): ran to
 * expiry → expired, or assigned when the broker delivered the underlying at a
 * short leg's strike; otherwise stop (lost more than the credit taken in),
 * early / late against a written plan (±3 days), else closed.
 */
export function exitKindOf(
  legs: readonly ReviewLeg[],
  opts: { open: boolean; expiredUnbooked: boolean; closedOn: string | null; cash: number; netIn: number; root: string },
  ctx: ExitContext = {},
): ExitKind {
  if (opts.open) return 'open'
  // The legs that ended the trade: the ones flat on its last day, or every leg
  // an unbooked expiry left open.
  const last = opts.expiredUnbooked ? legs.filter((l) => l.open) : legs.filter((l) => l.flatOn === opts.closedOn)
  const byBroker = last.length > 0 && last.every((l) => l.open || l.fills[l.fills.length - 1]?.booked)
  if (byBroker) {
    const delivered = legs.some(
      (l) => l.short && l.fills.some((f) => f.booked && ctx.assignments?.has(assignmentKey(opts.root, f.date, l.strike))),
    )
    return delivered ? 'assigned' : 'expired'
  }
  if (opts.netIn > 0 && opts.cash <= -opts.netIn) return 'stop'
  const off = ctx.planExitBy && opts.closedOn ? daysBetween(ctx.planExitBy, opts.closedOn) : null
  if (off != null && off < -PLAN_EXIT_SLACK_DAYS) return 'early'
  if (off != null && off > PLAN_EXIT_SLACK_DAYS) return 'late'
  return 'closed'
}

/** The leg the instance is named by: the open short leg, else the last short leg opened, else the last leg. */
function primaryOf(legs: readonly ReviewLeg[]): ReviewLeg {
  const byOpen = [...legs].sort((a, b) => (a.openedOn ?? '').localeCompare(b.openedOn ?? ''))
  return (
    byOpen.filter((l) => l.short && l.open).pop() ??
    byOpen.filter((l) => l.short).pop() ??
    byOpen[byOpen.length - 1]
  )
}

export function instanceOf(
  instanceId: number | null,
  executions: readonly Execution[],
  today: string,
  ctx: ExitContext & { server?: ServerInstanceState | null } = {},
): ReviewInstance | null {
  const groups = buildOptExecutionGroups([...executions])
  if (groups.length === 0) return null
  const legs = groups.map(legOf).sort((a, b) => (a.openedOn ?? '').localeCompare(b.openedOn ?? ''))
  const p = primaryOf(legs)
  const openLegs = legs.filter((l) => l.open)
  // The server's state when the instance list gave one (`no_fills` cannot
  // describe an instance with fills, so it is not taken). Otherwise the legs:
  // every open leg past its expiry is over, but the broker never booked the
  // expiry — read as expired at the last one, worthless (no closing fill).
  const server = ctx.server && ctx.server.state !== 'no_fills' ? ctx.server : null
  const expired = server
    ? server.state === 'expired'
    : openLegs.length > 0 && openLegs.every((l) => l.expiry !== '' && l.expiry < today)
  const open = server ? server.state === 'open' : openLegs.length > 0 && !expired
  const fills = legs.flatMap((l) => l.fills).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const openedOn = legs[0].openedOn
  const closedOn = open
    ? null
    : server?.closedOn
      ? server.closedOn
      : expired
        ? openLegs.map((l) => l.expiry).sort().pop() || null
        : legs.map((l) => l.flatOn ?? '').sort().pop() || null
  const end = closedOn ?? today
  const cash = legs.reduce((a, l) => a + l.cash, 0)
  // Net, across legs: credit taken on opening (short legs in, long legs paid)
  // and what closing the flat legs cost (short legs paid, long legs received).
  // A spread bought for a debit reads as a debit, not as two premiums added up.
  const netIn = legs.reduce((a, l) => a + (l.short ? l.premiumIn : -l.premiumIn), 0)
  const netOut = legs.filter((l) => !l.open).reduce((a, l) => a + (l.short ? l.premiumOut : -l.premiumOut), 0)
  const credit = netIn > 0
  const play = executions.find((e) => e.strategy_opportunity_name)?.strategy_opportunity_name ?? null
  const root = extractUnderlyingRootSymbol(p.contractKey.split('|')[0] ?? p.contractKey) || p.label.split(' ')[0]
  return {
    contractKey: instanceId != null ? `inst:${instanceId}` : p.contractKey,
    label: legs.length > 1 ? `${p.label} +${legs.length - 1}` : p.label,
    symbol: p.contractKey.split('|')[0] ?? p.label,
    underlying: root,
    accountId: executions[0]?.account_id ?? '',
    expiry: p.expiry,
    strike: p.strike,
    right: p.right,
    fills,
    play,
    tradeId: instanceId,
    openedOn,
    closedOn,
    daysHeld: openedOn ? daysBetween(openedOn, end) : null,
    dteAtEntry: openedOn && p.expiry ? daysTo(p.expiry.replace(/-/g, ''), openedOn) : null,
    contracts: p.qty,
    // Closed: every fill's cash is the Ledger's realised figure. Open: cash so
    // far — the page replaces it with the path's mark to date (provisional).
    realised: cash,
    win: !open && cash > 0,
    exitKind: exitKindOf(legs, { open, expiredUnbooked: expired, closedOn, cash, netIn, root }, ctx),
    planExitBy: ctx.planExitBy ?? null,
    shortPremium: credit,
    entryPremium: Math.abs(netIn),
    exitPremium: Math.abs(netOut),
    creditKept: credit && !open ? 1 - netOut / netIn : null,
    expiredUnbooked: expired,
    open,
    legs,
    // A roll is a leg opened once an earlier one was already flat; legs held
    // side by side are a spread, not a seam.
    rolls: legs.filter((l, i) => i > 0 && legs.slice(0, i).some((p) => p.flatOn != null && l.openedOn != null && p.flatOn <= l.openedOn)).length,
  }
}

/**
 * Every instance the fills book, plus the closed contracts booked to none —
 * open instances first (the design pins them), then newest close first.
 */
export function buildReviewInstances(
  executions: readonly Execution[],
  today: string,
  /** The date each trade's plan said to be out by, keyed by trade id (Rev .112 early / late). */
  planExitBy?: ReadonlyMap<number, string | null>,
  /** The instance list's `state` / `closed_on` by trade id (core 0.41.0); see `serverStatesOf`. */
  states?: ReadonlyMap<number, ServerInstanceState>,
): ReviewInstance[] {
  const opt = executions.filter((e) => (e.sec_type ?? 'OPT').toUpperCase() === 'OPT')
  const assignments = assignmentsIn(executions)
  const ids = new Set<number>()
  const unbooked: Execution[] = []
  for (const e of opt) {
    const allocs = e.instance_allocations ?? []
    if (allocs.length > 0) allocs.forEach((a) => ids.add(Number(a.strategy_instance_id)))
    else if (e.strategy_instance_id != null) ids.add(Number(e.strategy_instance_id))
    else unbooked.push(e)
  }
  const out: ReviewInstance[] = []
  for (const id of ids) {
    const mine = opt.map((e) => sliceExecutionForInstanceOptView(e, id)).filter((e): e is Execution => e != null)
    const inst = instanceOf(id, mine, today, {
      assignments,
      planExitBy: planExitBy?.get(id) ?? null,
      server: states?.get(id) ?? null,
    })
    if (inst) out.push(inst)
  }
  // Contracts no instance owns: reviewable on their own, closed ones only.
  for (const g of buildOptExecutionGroups(unbooked)) {
    if (g.status !== 'realized') continue
    const inst = instanceOf(null, g.trades, today, { assignments })
    if (inst) out.push(inst)
  }
  return out.sort(
    (a, b) =>
      Number(b.open) - Number(a.open) ||
      (b.closedOn ?? b.openedOn ?? '').localeCompare(a.closedOn ?? a.openedOn ?? '') ||
      (b.tradeId ?? 0) - (a.tradeId ?? 0),
  )
}
