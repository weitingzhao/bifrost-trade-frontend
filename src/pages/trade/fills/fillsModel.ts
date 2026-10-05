/**
 * The work side of the ledger: what came back, and which fills have no home.
 *
 * The Ledger is the record — every fill, reconciled, for as long as the
 * book has existed. This is the desk's window on the same fills: the last few
 * sessions, what each one is linked to, and the ones nothing claims. One
 * source, two questions.
 *
 * Nothing here sends an order. Orders are worked in TWS and this page reads
 * them (D10).
 */
import type { FillRow } from '@/utils/fillRows'
import { collectPeerTradePicks } from '@/utils/ledger/ledgerOptHelpers'
import type { Execution } from '@/types/positions'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'


export interface FillsSummary {
  rows: number
  linked: number
  orphan: number
  /** Rows per source, in the source's own word. */
  bySource: { source: string; n: number }[]
  /** The newest trade date in the whole book, which is not always in the window. */
  newestTradeDate: string | null
}

export const FILLS_UNRECORDED = {
  plan:
    'No fill is linked to a plan: `strategy_plan` stores the target, the stop and the limit, but no plan on this book has reached a fill, so the column has nothing to point at.',
  order:
    'An order that filled is gone from IB’s open list the moment it fills, and nothing on this side keeps the ones that did. Today’s fills are below; today’s working orders are above; the two do not join.',
} as const

/**
 * The Imports lane — how each path fills arrive by is doing today.
 *
 * The design's three rows, on the readings this side actually has: the
 * executions-freshness endpoint knows the newest fill per source and account,
 * the Flex plugin stamps its own coverage run, and corporate actions report no
 * freshness at all — which the row says, because grey means unknown, not down.
 */
export interface ImportRow {
  key: string
  title: string
  sub: string
  when: string
  lamp: 'green' | 'yellow' | 'gray'
}

export function importRows(args: {
  /** Per source × account, from /executions/freshness. */
  freshness: readonly { source: string; account_id: string; days_since_latest: number | null }[]
  /** The Flex plugin's own flex-trades coverage stamp (ISO), or null unread. */
  flexRunTs: string | null
  /** Fills in today's trade date, by source — from the rows already built. */
  todayBySource: ReadonlyMap<string, number>
  todayUtc: string
}): ImportRow[] {
  const newestDays = (source: string): number | null => {
    const days = args.freshness
      .filter((f) => f.source === source)
      .map((f) => f.days_since_latest)
      .filter((d): d is number => d != null)
    return days.length === 0 ? null : Math.min(...days)
  }

  const twsToday = args.todayBySource.get('tws_client') ?? 0
  const twsDays = newestDays('tws_client')
  const flexToday = args.todayBySource.get('flex_trades') ?? 0
  const flexDays = newestDays('flex_trades')
  const flexRanToday = args.flexRunTs != null && args.flexRunTs.slice(0, 10) === args.todayUtc

  return [
    {
      key: 'tws',
      title: twsToday > 0 ? `TWS · ${twsToday} execution${twsToday === 1 ? '' : 's'} today` : 'TWS · nothing today',
      sub:
        twsDays == null
          ? 'no TWS fill on record'
          : `newest ${Math.round(twsDays)}d ago — TWS rows only arrive when the terminal fetch is run`,
      when: twsToday > 0 ? 'today' : '—',
      // Idle is not degraded: Flex is the statement of record and TWS the
      // intraday supplement, so a quiet TWS is the normal state of this book.
      lamp: twsToday > 0 ? 'green' : 'gray',
    },
    {
      key: 'flex',
      title: flexToday > 0 ? `Flex · ${flexToday} row${flexToday === 1 ? '' : 's'} today` : 'Flex · no row today',
      sub:
        args.flexRunTs == null
          ? 'the plugin reported no coverage run'
          : flexRanToday
            ? `pull ran today${flexDays == null ? '' : ` · newest fill ${flexDays < 1 ? 'under a day' : `${Math.round(flexDays)}d`} old`}`
            : `last pull ${args.flexRunTs.slice(0, 10)} — the daily import has not run today`,
      when: args.flexRunTs == null ? '—' : `${args.flexRunTs.slice(11, 16)}Z`,
      lamp: args.flexRunTs == null ? 'gray' : flexRanToday ? 'green' : 'yellow',
    },
    {
      key: 'corp',
      title: 'Corporate actions',
      sub: 'no freshness is reported for this feed — grey means unknown, not down',
      when: '—',
      lamp: 'gray',
    },
  ]
}

// ── Where does this fill belong? ─────────────────────────────────────────────

/**
 * A candidate home for an orphan fill, strongest reason first.
 *
 * Two reasons exist on this side, and they are kept distinct on the card
 * because they argue differently: an instance that already holds fills on the
 * *same contract* is almost certainly the home; an instance whose opportunity
 * merely *covers the symbol* is a legal home among several. The account must
 * match either way — a fill cannot belong to another account's instance.
 */
export interface BelongCandidate {
  tradeId: number
  opportunityId: number | null
  label: string
  why: string
  tag: 'same contract' | 'covers the symbol'
}

export function belongCandidates(args: {
  row: Pick<FillRow, 'execId' | 'contractKey' | 'symbol' | 'accountId'>
  executions: readonly Execution[]
  trades: readonly {
    trade_id: number
    strategy_opportunity_id: number
    account_id: string
    label?: string | null
    strategy_opportunity_name?: string | null
  }[]
  opportunities: readonly { strategy_opportunity_id: number; name: string; symbols?: string[] | null }[]
}): BelongCandidate[] {
  const { row } = args
  const out: BelongCandidate[] = []
  const seen = new Set<number>()

  // Same contract first: another fill on this exact contract already claimed.
  const peers = collectPeerTradePicks(
    args.executions.filter((e) => (e.contract_key ?? '') !== '' && e.contract_key === row.contractKey),
    row.execId ?? -1,
  )
  for (const peer of peers) {
    if (seen.has(peer.trade_id)) continue
    seen.add(peer.trade_id)
    out.push({
      tradeId: peer.trade_id,
      opportunityId: peer.strategy_opportunity_id,
      label: peer.label,
      why: 'already holds fills on this exact contract',
      tag: 'same contract',
    })
  }

  // Then instances whose opportunity covers the symbol, in this account.
  const symbol = row.symbol.trim().toUpperCase()
  for (const inst of args.trades) {
    if (seen.has(inst.trade_id)) continue
    if (row.accountId && (inst.account_id ?? '').trim() !== row.accountId) continue
    const opp = args.opportunities.find((o) => o.strategy_opportunity_id === inst.strategy_opportunity_id)
    if (!opp?.symbols?.some((sym) => sym.trim().toUpperCase() === symbol)) continue
    seen.add(inst.trade_id)
    out.push({
      tradeId: inst.trade_id,
      opportunityId: inst.strategy_opportunity_id,
      label: `${opp.name} · ${inst.label?.trim() || `#${inst.trade_id}`}`,
      why: `${opp.name} covers ${symbol}`,
      tag: 'covers the symbol',
    })
  }

  return out
}


/** Fills on or after this many days back, by the trade date the source stamped. */
export function scopeFills(rows: readonly FillRow[], days: number | null, todayIso: string): FillRow[] {
  if (days == null) return [...rows]
  const t = Date.parse(`${todayIso}T00:00:00Z`)
  if (!Number.isFinite(t)) return [...rows]
  const floor = new Date(t - days * 86_400_000).toISOString().slice(0, 10)
  return rows.filter((r) => (r.tradeDate ?? '') >= floor)
}

export function summarize(scoped: readonly FillRow[], all: readonly FillRow[]): FillsSummary {
  const bySource = new Map<string, number>()
  let linked = 0
  for (const r of scoped) {
    bySource.set(r.source, (bySource.get(r.source) ?? 0) + 1)
    if (r.state === 'linked') linked += 1
  }
  let newest: string | null = null
  for (const r of all) {
    if (r.tradeDate && (newest == null || r.tradeDate > newest)) newest = r.tradeDate
  }
  return {
    rows: scoped.length,
    linked,
    orphan: scoped.length - linked,
    bySource: [...bySource.entries()]
      .map(([source, n]) => ({ source, n }))
      .sort((a, b) => b.n - a.n),
    newestTradeDate: newest,
  }
}

export interface PlanRow {
  id: number
  symbol: string
  structure: string | null
  status: string
  /** What the plan says to take: the target and the stop, in the store's own words. */
  target: string | null
  stop: string | null
  limit: number | null
  accountId: string
  /** True once the plan has a fill behind it — none does yet on this book. */
  filled: boolean
}

/** The plans waiting, newest intent first. A cancelled plan stays: it is still a thing that was written. */
export function buildPlanRows(plans: readonly StrategyPlan[]): PlanRow[] {
  return plans
    .map((p) => ({
      id: p.strategy_plan_id,
      symbol: (p.symbol ?? '').trim().toUpperCase(),
      structure: p.structure_label ?? null,
      status: (p.effective_status ?? p.status ?? 'unknown').trim(),
      target: p.target_kind ? `${p.target_kind} ${p.target_value ?? ''}`.trim() : null,
      stop: p.stop_kind ? `${p.stop_kind} ${p.stop_value ?? ''}`.trim() : null,
      limit: p.limit_price == null ? null : Number(p.limit_price),
      accountId: (p.account_id ?? '').trim(),
      filled: p.filled_at != null,
    }))
    .sort((a, b) => b.id - a.id)
}
