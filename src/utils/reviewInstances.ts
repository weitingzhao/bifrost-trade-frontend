/**
 * Single trade reviews an **instance**, not a contract (design Rev .104,
 * Owner 2026-09-29): every leg the instance traded is one P&L line, a roll is
 * a seam in it, and an instance still open is reviewable as an interim read.
 *
 * Built from the same fills the contract-level review reads, sliced per
 * instance the Ledger's way (`sliceExecutionForInstanceOptView`, so a fill
 * split across instances counts its share), and grouped per contract with
 * the Ledger's own `buildOptExecutionGroups`. Each instance is also a
 * `ReviewTrade` — its primary leg supplies the contract fields — so the
 * page's panels read it unchanged.
 *
 * Measured on DEV 2026-09-29: 89 instances (78 single-leg, 10 two-leg, 1
 * four-leg); 15 option fills belong to no instance and stay reviewable as
 * contracts. Stock fills are never attributed to an instance (0 of 168), so a
 * covered call's share leg cannot enter the line from fills — named, not
 * guessed.
 */
import { buildOptExecutionGroups, isBuySide, type OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { sliceExecutionForInstanceOptView } from '@/utils/ledger/ledgerOptHelpers'
import { shortOptContractKey } from '@/utils/ledger/optionsModeBridge'
import { daysBetween } from '@/lib/isoDate'
import { daysTo, extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import type { Execution } from '@/types/positions'
import {
  dateSpan,
  isoExpiry,
  orderedTrades,
  toFill,
  type ReviewFill,
  type ReviewTrade,
} from '@/utils/reviewTrades'

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

export interface ReviewInstance extends ReviewTrade {
  instanceId: number | null
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
): ReviewInstance | null {
  const groups = buildOptExecutionGroups([...executions])
  if (groups.length === 0) return null
  const legs = groups.map(legOf).sort((a, b) => (a.openedOn ?? '').localeCompare(b.openedOn ?? ''))
  const p = primaryOf(legs)
  const openLegs = legs.filter((l) => l.open)
  // Every open leg past its expiry: over, but the broker never booked the
  // expiry — read as expired at the last one, worthless (no closing fill).
  const expired = openLegs.length > 0 && openLegs.every((l) => l.expiry !== '' && l.expiry < today)
  const open = openLegs.length > 0 && !expired
  const fills = legs.flatMap((l) => l.fills).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const openedOn = legs[0].openedOn
  const closedOn = open
    ? null
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
    instanceId,
    openedOn,
    closedOn,
    daysHeld: openedOn ? daysBetween(openedOn, end) : null,
    dteAtEntry: openedOn && p.expiry ? daysTo(p.expiry.replace(/-/g, ''), openedOn) : null,
    contracts: p.qty,
    // Closed: every fill's cash is the Ledger's realised figure. Open: cash so
    // far — the page replaces it with the path's mark to date (provisional).
    realised: cash,
    win: !open && cash > 0,
    exitKind: open ? 'open' : expired ? 'expired' : 'closed',
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
export function buildReviewInstances(executions: readonly Execution[], today: string): ReviewInstance[] {
  const opt = executions.filter((e) => (e.sec_type ?? 'OPT').toUpperCase() === 'OPT')
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
    const inst = instanceOf(id, mine, today)
    if (inst) out.push(inst)
  }
  // Contracts no instance owns: reviewable on their own, closed ones only.
  for (const g of buildOptExecutionGroups(unbooked)) {
    if (g.status !== 'realized') continue
    const inst = instanceOf(null, g.trades, today)
    if (inst) out.push(inst)
  }
  return out.sort(
    (a, b) =>
      Number(b.open) - Number(a.open) ||
      (b.closedOn ?? b.openedOn ?? '').localeCompare(a.closedOn ?? a.openedOn ?? '') ||
      (b.instanceId ?? 0) - (a.instanceId ?? 0),
  )
}
