/**
 * The desk's three lanes, built from what the book already knows.
 *
 * Design DECISIONS 2026-09-18: `Desk = 今日行动队列(to act) + 运行态摘要`, the
 * lineage stays on Rules. So every item here is a thing to act on, fed by
 * Research handoffs, the short-leg book, plans, IB's open orders and the fills
 * that came back — and every one of them ends in a plan, a fill, or a
 * dismissal.
 *
 * Nothing in this file writes. The one write control on the page is the hedge
 * menu, which is the daemon's own channel and lives in `HedgeMenu.tsx`.
 *
 * Two rules the lanes are built on:
 *
 * - **An empty lane is a reading.** "Nothing is out for a fill" is a fact about
 *   the desk, and printing it is the point; a lane that renders nothing at all
 *   reads as broken.
 * - **A leg with no spot is not a safe leg.** It is counted and named, never
 *   folded into the safe ones — the same rule Positions and the status bar use.
 */
import { cushionBand, shortLegCushion } from '@/utils/positionsOptionRisk'
import { daysBetween } from '@/lib/isoDate'
import { fmtPctFromFraction } from '@/lib/format'
import type { ShortLeg } from '@/api/shortLegs'
import type { OrderIntentDraft } from '@/api/research/orderIntents'
import type { OpenOrder } from '@/types/market'
import type { Execution } from '@/types/positions'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'

export type DeskTone = 'danger' | 'warning' | 'info' | 'success' | 'neutral'

export interface DeskTag {
  label: string
  tone: DeskTone
}

/** One thing to act on. `to` is where the act happens; nothing acts here. */
export interface DeskAction {
  label: string
  to?: string
  /** A button the page wires itself — copy, dismiss, prefill. */
  kind?: 'copyIntent' | 'createOpportunity'
  /** Which draft the wired action is about. */
  ref?: string
}

export interface DeskItem {
  key: string
  /** The ticker, or the source's own word when a row is not about one name. */
  symbol: string
  title: string
  /** Right-aligned: when it happened, or how long is left. */
  when: string
  sub: string
  tone: DeskTone
  tags: DeskTag[]
  actions: DeskAction[]
}

export interface DeskLane {
  key: 'decide' | 'execute' | 'settle'
  step: string
  title: string
  from: string
  items: DeskItem[]
  /** Printed in place of items — what it means that there are none. */
  emptyRead: string
}

/** Near enough that assignment is this week's problem, not next month's. */
export const EXPIRING_SOON_DAYS = 10

/** Yesterday and today: what a desk would call "just settled". */
const SETTLE_WINDOW_DAYS = 3

function isoFromCompact(expiry: string): string | null {
  if (!/^\d{8}$/.test(expiry)) return null
  return `${expiry.slice(0, 4)}-${expiry.slice(4, 6)}-${expiry.slice(6, 8)}`
}

function dteOf(expiry: string | null | undefined, today: string): number | null {
  if (!expiry) return null
  const iso = isoFromCompact(expiry)
  if (iso == null) return null
  return daysBetween(today, iso)
}

/** "MU · 2 more" — a name, or a name and how many others. */
function namesOf(symbols: readonly string[]): string {
  const uniq = [...new Set(symbols)]
  if (uniq.length === 0) return '—'
  if (uniq.length === 1) return uniq[0]
  return `${uniq[0]} · ${uniq.length - 1} more`
}

/**
 * 1 · Decide — what was handed to you.
 *
 * Two feeds, deliberately kept apart: Research proposes (advisory, D10 BLOCKED
 * by its own envelope) and the book presses (a short leg that has run out of
 * cushion). One is an idea, the other is a position.
 */
export function decideItems(
  intents: readonly OrderIntentDraft[],
  legs: readonly ShortLeg[],
  tightPct: number,
  today: string,
): DeskItem[] {
  const items: DeskItem[] = []

  for (const d of intents) {
    const p = d.payload ?? {}
    const legSymbols = (Array.isArray(p.legs) ? p.legs : [])
      .map((l) => (l && typeof l === 'object' ? String((l as { symbol?: unknown }).symbol ?? '') : ''))
      .filter(Boolean)
    const scopeName = (d.scope ?? '').replace(/^hypothesis:/, '').split('-')[0]?.toUpperCase() ?? ''
    const symbol = legSymbols[0] || scopeName || 'IDEA'
    const rationale = String(p.rationale ?? '').trim()
    items.push({
      key: `intent:${d.id}`,
      symbol,
      title: String(p.strategy_template ?? 'Order intent'),
      when: d.created_at ? d.created_at.slice(0, 10) : '—',
      // The rationale is the whole argument and it is long; the card carries
      // its first sentence and the rest is one click away on the hypothesis.
      sub: rationale === '' ? 'No rationale recorded with this intent.' : firstSentence(rationale),
      tone: 'info',
      tags: [
        { label: 'advisory', tone: 'info' },
        // The envelope says so itself, and it is the reason this is a proposal
        // and not an order.
        { label: 'D10 blocked', tone: 'warning' },
      ],
      actions: [
        { label: 'Create opportunity', kind: 'createOpportunity', ref: d.id },
        { label: 'Copy JSON', kind: 'copyIntent', ref: d.id },
        { label: 'Decisions →', to: '/research/loop/decisions' },
      ],
    })
  }

  // Unpriced is its own answer, and it is the same rule the status bar uses:
  // a leg with no strike, no right or no spot is unknown, never safe.
  const unpriced = legs.filter(
    (l) => l.strike == null || l.right == null || l.spot == null || shortLegCushion(l.right, l.strike, l.spot) == null,
  )
  for (const leg of legs) {
    if (leg.strike == null || leg.right == null || leg.spot == null) continue
    const cushion = shortLegCushion(leg.right, leg.strike, leg.spot)
    if (cushion == null) continue
    const band = cushionBand(cushion, tightPct)
    if (band === 'comfortable') continue
    const dte = dteOf(leg.expiry, today)
    items.push({
      key: `leg:${leg.contract_key ?? `${leg.symbol}${leg.strike}${leg.right}`}`,
      symbol: leg.symbol,
      title: `Short ${leg.right === 'P' ? 'put' : 'call'} ${leg.strike ?? '—'} · ${Math.abs(leg.qty)}`,
      when: dte == null ? 'no expiry' : `${dte}d`,
      sub:
        band === 'breached'
          ? `In the money by ${fmtPctFromFraction(-cushion)} — assignment is the default outcome unless it is rolled or closed.`
          : `Cushion ${fmtPctFromFraction(cushion)}, inside the ${fmtPctFromFraction(tightPct)} line this book warns at.`,
      tone: band === 'breached' ? 'danger' : 'warning',
      tags: [{ label: band === 'breached' ? 'in the money' : 'tight', tone: band === 'breached' ? 'danger' : 'warning' }],
      actions: [
        { label: 'Positions →', to: `/portfolio/positions?symbol=${encodeURIComponent(leg.symbol)}` },
        { label: 'Backing →', to: '/portfolio/backing' },
      ],
    })
  }

  if (unpriced.length > 0) {
    items.push({
      key: 'legs:unpriced',
      symbol: namesOf(unpriced.map((l) => l.symbol)),
      title: `${unpriced.length} short ${unpriced.length === 1 ? 'leg' : 'legs'} carry no spot`,
      when: 'now',
      sub: 'Their cushion cannot be taken, so they are neither safe nor tight — unknown. The underlying quote is what is missing, not the position.',
      tone: 'neutral',
      tags: [{ label: 'unpriced', tone: 'neutral' }],
      actions: [{ label: 'Live →', to: '/market/live' }],
    })
  }

  return items
}

/**
 * 2 · Execute — what is out for a fill.
 *
 * A plan that says `intended` and an order IB is working are different facts,
 * and the gap between them is the desk's own work: the desk copies, TWS places
 * (D10). An intent with no working order is therefore a lane item, not an
 * error.
 */
export function executeItems(
  plans: readonly StrategyPlan[],
  orders: readonly OpenOrder[],
  outsideRules: (plan: StrategyPlan) => string | null,
): DeskItem[] {
  const items: DeskItem[] = []

  for (const o of orders) {
    const filled = Number(o.filled ?? 0)
    const total = Number(o.total_quantity ?? 0)
    items.push({
      key: `order:${o.order_id ?? o.perm_id ?? o.contract_key ?? o.symbol}`,
      symbol: o.symbol ?? '—',
      title: `${(o.action ?? '').toUpperCase()} ${total || '—'} · working in TWS`,
      when: o.order_id == null ? 'ib' : `ord ${o.order_id}`,
      sub: `${filled} of ${total || '—'} filled${o.limit_price == null ? '' : ` · limit ${o.limit_price}`}. Cancel and amend in TWS — this side reads the broker.`,
      tone: 'info',
      tags: [{ label: o.status ?? 'working', tone: 'info' }],
      actions: [
        { label: 'Live →', to: '/market/live' },
        { label: 'Fills →', to: '/trade/fills' },
      ],
    })
  }

  for (const p of plans) {
    if ((p.effective_status ?? p.status) !== 'intended') continue
    const outside = outsideRules(p)
    items.push({
      key: `plan:${p.strategy_plan_id}`,
      symbol: p.symbol,
      title: `${p.structure_label || 'Plan'} ×${p.qty ?? '—'} · intended, not in TWS`,
      when: p.intended_at ? p.intended_at.slice(0, 10) : '—',
      sub:
        outside ??
        'Copy it, place it in TWS, come back. The fill claims the plan when it lands — nothing here sends an order.',
      tone: outside == null ? 'warning' : 'warning',
      tags: [
        { label: 'not sent', tone: 'warning' },
        ...(outside == null ? [] : [{ label: 'outside rules', tone: 'warning' as const }]),
      ],
      actions: [{ label: 'Open plan', to: `/trade/plans?plan=${p.strategy_plan_id}` }],
    })
  }

  return items
}

/**
 * 3 · Settle — what came back.
 *
 * Fills are grouped rather than listed one by one: the desk's question is "is
 * anything unclaimed", and 201 orphan rows answered as 201 cards would bury
 * the two that arrived this morning. Orders & Fills is where they are read one
 * at a time.
 */
export function settleItems(fills: readonly Execution[], today: string): DeskItem[] {
  const recent = fills.filter((e) => {
    const d = tradeDateOf(e)
    if (d == null) return false
    const age = daysBetween(d, today)
    return age != null && age >= 0 && age <= SETTLE_WINDOW_DAYS
  })

  const items: DeskItem[] = []
  const linked = recent.filter((e) => e.strategy_instance_id != null)
  const orphan = recent.filter((e) => e.strategy_instance_id == null)

  if (linked.length > 0) {
    items.push({
      key: 'fills:linked',
      symbol: namesOf(linked.map((e) => rootOf(e))),
      title: `${linked.length} ${linked.length === 1 ? 'fill' : 'fills'} claimed by an instance`,
      when: newestOf(recent) ?? '—',
      sub: 'Each one is attached to the instance its contract and window belong to. Nothing to do — they are in the book.',
      tone: 'success',
      tags: [{ label: 'linked', tone: 'success' }],
      actions: [{ label: 'Fills →', to: '/trade/fills' }],
    })
  }

  if (orphan.length > 0) {
    items.push({
      key: 'fills:orphan',
      symbol: namesOf(orphan.map((e) => rootOf(e))),
      title: `${orphan.length} ${orphan.length === 1 ? 'fill' : 'fills'} nothing claims`,
      when: newestOf(orphan) ?? '—',
      sub: 'No instance carries them, so they price the book but no strategy is credited with them. Link them on the Ledger or leave them as hand trades.',
      tone: 'warning',
      tags: [{ label: 'orphan', tone: 'warning' }],
      actions: [
        { label: 'Fills →', to: '/trade/fills' },
        { label: 'Ledger →', to: '/portfolio/ledger' },
      ],
    })
  }

  return items
}

/** Expiring soon, from the short-leg book — the OPEX row the design draws. */
export function expiringItem(legs: readonly ShortLeg[], today: string): DeskItem | null {
  const soon = legs.filter((l) => {
    const d = dteOf(l.expiry, today)
    return d != null && d >= 0 && d <= EXPIRING_SOON_DAYS
  })
  if (soon.length === 0) return null
  const nearest = Math.min(...soon.map((l) => dteOf(l.expiry, today) ?? Infinity))
  return {
    key: 'legs:expiring',
    symbol: namesOf(soon.map((l) => l.symbol)),
    title: `${soon.length} short ${soon.length === 1 ? 'leg' : 'legs'} expiring`,
    when: `${nearest}d`,
    sub: 'Each one either expires worthless, is rolled, or becomes stock. Deciding is cheaper before the last session than during it.',
    tone: nearest <= 2 ? 'danger' : 'warning',
    tags: [{ label: 'expiring', tone: nearest <= 2 ? 'danger' : 'warning' }],
    actions: [
      { label: 'Expiration →', to: '/trade/expiration' },
      { label: 'Backing →', to: '/portfolio/backing' },
    ],
  }
}

export function buildLanes(args: {
  intents: readonly OrderIntentDraft[]
  legs: readonly ShortLeg[]
  tightPct: number
  plans: readonly StrategyPlan[]
  orders: readonly OpenOrder[]
  fills: readonly Execution[]
  outsideRules: (plan: StrategyPlan) => string | null
  today: string
}): DeskLane[] {
  const expiring = expiringItem(args.legs, args.today)
  return [
    {
      key: 'decide',
      step: '1 · Decide',
      title: 'Handed to you',
      from: 'Research · Positions',
      items: decideItems(args.intents, args.legs, args.tightPct, args.today),
      emptyRead:
        'Research has proposed nothing and no short leg is inside its cushion line. Nothing is waiting on a decision.',
    },
    {
      key: 'execute',
      step: '2 · Execute',
      title: 'Out for a fill',
      from: 'Plans · IB open orders',
      items: executeItems(args.plans, args.orders, args.outsideRules),
      emptyRead:
        'No plan is intended and IB is working nothing. Nothing is out for a fill — which is a reading, not an empty page.',
    },
    {
      key: 'settle',
      step: '3 · Settle',
      title: 'Filled · linked · expiring',
      from: 'Flex · TWS imports',
      items: [...settleItems(args.fills, args.today), ...(expiring ? [expiring] : [])],
      emptyRead: `Nothing has settled in ${SETTLE_WINDOW_DAYS} days and nothing expires within ${EXPIRING_SOON_DAYS}.`,
    },
  ]
}

/** What the strip's fourth cell counts: everything that is genuinely on you. */
export function needsYou(lanes: readonly DeskLane[]): { n: number; note: string } {
  const decide = lanes.find((l) => l.key === 'decide')?.items ?? []
  const execute = lanes.find((l) => l.key === 'execute')?.items ?? []
  const settle = lanes.find((l) => l.key === 'settle')?.items ?? []
  // A settled fill that is already claimed is not on you, and neither is a
  // leg that is merely unpriced — counting those would make the number a
  // lane total rather than a call to act.
  const toAct = [
    ...decide.filter((i) => i.tone !== 'neutral'),
    ...execute,
    ...settle.filter((i) => i.tone !== 'success'),
  ]
  const parts = [
    decide.filter((i) => i.tone !== 'neutral').length ? `${decide.filter((i) => i.tone !== 'neutral').length} to decide` : null,
    execute.length ? `${execute.length} out for a fill` : null,
    settle.filter((i) => i.tone !== 'success').length
      ? `${settle.filter((i) => i.tone !== 'success').length} to settle`
      : null,
  ].filter(Boolean)
  return { n: toAct.length, note: parts.length === 0 ? 'nothing is waiting on you' : parts.join(' · ') }
}

function firstSentence(text: string): string {
  const cut = text.search(/[.。]\s/)
  const head = cut === -1 ? text : text.slice(0, cut + 1)
  return head.length > 240 ? `${head.slice(0, 237)}…` : head
}


function tradeDateOf(e: Execution): string | null {
  const d = e.trade_date ?? null
  if (d && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10)
  const t = e.time ?? null
  if (t && /^\d{4}-\d{2}-\d{2}/.test(String(t))) return String(t).slice(0, 10)
  return null
}

function newestOf(rows: readonly Execution[]): string | null {
  const dates = rows.map(tradeDateOf).filter((d): d is string => d != null).sort()
  return dates.length === 0 ? null : dates[dates.length - 1]
}

function rootOf(e: Execution): string {
  return (e.symbol ?? '').split(' ')[0] || '—'
}
