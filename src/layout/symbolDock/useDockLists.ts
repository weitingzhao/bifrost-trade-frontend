/**
 * The six lists, each read from the store that already owns it — the dock
 * adds no endpoint and no second copy of any list (design: "the app reads each
 * from its own store").
 *
 * | List      | Store                                   | Third column                |
 * |-----------|-----------------------------------------|-----------------------------|
 * | Source    | the ranked list last published (`symbolTrail`) | its composite score  |
 * | Watch     | `/watchlist` (Research › Watchlist)     | 1y IV rank, from one scan   |
 * | Port      | the status bar's live book              | unrealized P&L, summed      |
 * | Obj       | candidates of the scoped objective      | the candidate's status      |
 * | Recent    | names loaded (`recentSymbols`)          | how long ago                |
 * | Alerts    | `/research/alerts`, fired today         | when it fired, ET           |
 *
 * Measured on DEV 2026-09-25 before any of it was drawn: the scan answers a
 * 1y IV rank for 1 of 19 watchlist names (IV30 history is months, not a
 * year), `/research/alerts` holds 0 rows in 90 days and has never named a
 * symbol, and the daily-loop objective proposed 8 candidates on its latest
 * day. So an empty cell and an empty list both say why; neither is a zero.
 */
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchScan } from '@/api/research/scan'
import { fetchObjectives } from '@/api/research/harness'
import { useBookLive } from '@/hooks/useBookLive'
import { useCandidates } from '@/hooks/useCandidates'
import { useFiredAlerts } from '@/hooks/useFiredAlerts'
import { useHoldingSymbols } from '@/hooks/useHoldingSymbols'
import { useWatchlist } from '@/hooks/useWatchlist'
import { candidateObjectiveId, useObjectiveScope } from '@/lib/objectiveScope'
import { useRecentSymbols } from '@/lib/recentSymbols'
import { useSymbolTrailList } from '@/lib/symbolTrail'
import { etDate, type BookLiveRow } from '@/utils/bookLive'
import type { ListKey } from './dockState'
import { agoLabel, fmtShares, fmtSignedUsd, type DockContractIn, type DockListIn, type DockRowIn } from './dockModel'

function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

function etTime(iso: string | null): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  return new Date(t).toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })
}

function reasonText(reason: unknown, kind: string): string {
  if (typeof reason === 'string' && reason) return reason
  return kind.replace(/_/g, ' ')
}

/** Portfolio, by underlying: the stock and every option leg on it, both accounts. */
function portRows(rows: readonly BookLiveRow[], held: ReadonlySet<string>, tagOf: (id: string) => string): DockRowIn[] {
  const bySym = new Map<string, BookLiveRow[]>()
  for (const r of rows) bySym.set(r.symbol, [...(bySym.get(r.symbol) ?? []), r])
  // The same contract held in both accounts is two rows; only then does a
  // row need its account to tell them apart.
  const contractOf = (key: string) => key.split('|').slice(1).join('|')
  const holders = new Map<string, number>()
  for (const r of rows) if (r.kind === 'opt') holders.set(contractOf(r.key), (holders.get(contractOf(r.key)) ?? 0) + 1)
  const out: DockRowIn[] = []
  for (const [sym, legs] of [...bySym].sort(([a], [b]) => a.localeCompare(b))) {
    const shares = legs.filter((l) => l.kind === 'stk').reduce((s, l) => s + l.qty, 0)
    const opts = legs.filter((l) => l.kind === 'opt')
    const priced = legs.filter((l) => l.pnl != null)
    const pnl = priced.length ? priced.reduce((s, l) => s + (l.pnl ?? 0), 0) : null
    const unpriced = legs.length - priced.length
    const contracts: DockContractIn[] = opts.map((o) => {
      // `account|SYM|OPT|YYYYMMDD|strike|right` — the book row's key is the
      // account and the broker's contract key.
      const seg = o.key.split('|')
      const base = o.mark != null && o.dayPts != null ? o.mark - o.dayPts : null
      return {
        id: o.key,
        expiry: seg[3] ?? '',
        label: `${Number(seg[4]) || seg[4] || '?'} ${seg[5] ?? ''} · ${o.qty < 0 ? 'short' : 'long'} ×${Math.abs(o.qty)}${
          (holders.get(contractOf(o.key)) ?? 0) > 1 ? ` · ${tagOf(o.accountId)}` : ''
        }`,
        mark: o.mark,
        chgPct: base != null && base > 0 && o.dayPts != null ? (o.dayPts / base) * 100 : null,
        third: fmtSignedUsd(o.pnl),
        thirdTone: 'unrl',
      }
    })
    const note = [shares ? `${fmtShares(shares)} sh` : '', opts.length ? `${opts.length} leg${opts.length === 1 ? '' : 's'}` : '']
      .filter(Boolean)
      .join(' · ')
    out.push({
      symbol: sym,
      third: fmtSignedUsd(pnl),
      thirdTone: 'unrl',
      thirdTitle: unpriced
        ? `${unpriced} of ${legs.length} positions have no price — the sum is short of them`
        : 'Unrealized P&L, every position on this underlying, both accounts',
      note,
      held: held.has(sym),
      contracts,
    })
  }
  return out
}

export interface DockLists {
  lists: Record<ListKey, DockListIn>
  /** The ET session day the lists were read against. */
  todayEt: string
}

export function useDockLists(watchShown: boolean): DockLists {
  const now = useMinuteClock()
  const todayEt = etDate(new Date(now).toISOString()) ?? ''
  const holdings = useHoldingSymbols().symbols
  const held = useMemo(() => new Set(holdings), [holdings])

  const trail = useSymbolTrailList()
  const watch = useWatchlist()
  const book = useBookLive(false)
  const { objective, isAll } = useObjectiveScope()
  const { data: objectivesData } = useQuery({
    queryKey: ['research', 'objectives', 'lens'],
    queryFn: () => fetchObjectives({ limit: 50 }),
    staleTime: 5 * 60_000,
  })
  const candidates = useCandidates({ status: 'all' })
  const recent = useRecentSymbols()
  const alerts = useFiredAlerts()

  const watchSyms = useMemo(() => {
    const seen = new Set<string>()
    for (const i of watch.data?.items ?? []) {
      const s = i.symbol.trim().toUpperCase()
      if (s) seen.add(s)
    }
    return [...seen]
  }, [watch.data])
  // One scan call for the whole watchlist, only while Watch is on screen.
  const ivScan = useQuery({
    queryKey: ['shell', 'dock', 'iv-rank', [...watchSyms].sort().join(',')],
    queryFn: () => fetchScan({ symbols: watchSyms, limit: watchSyms.length }),
    enabled: watchShown && watchSyms.length > 0,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  return useMemo(() => {
    const source: DockListIn = {
      key: 'source',
      title: 'Source',
      tag: 'Source',
      sub: trail ? `${trail.label}${trail.note ? ` · ${trail.note}` : ''} · the list you came from` : 'the list you came from',
      head: 'Score',
      rows: (trail?.items ?? []).map((i) => {
        const chip = i.chips?.find((c) => c.k === 'composite') ?? i.chips?.[0]
        return { symbol: i.symbol.toUpperCase(), third: chip?.v ?? '—', thirdTitle: chip ? `${chip.k} ${chip.v}` : undefined, held: held.has(i.symbol.toUpperCase()) }
      }),
      empty: 'No source list. Open a ranked list (Stock ratings, Vol ratings) and its names land here.',
      loading: false,
    }

    const ivOf = new Map((ivScan.data?.rows ?? []).map((r) => [r.symbol.toUpperCase(), r.iv_rank_1y]))
    const asOf = ivScan.data?.as_of
    const byUnderlying = new Map<string, DockContractIn[]>()
    for (const i of watch.data?.items ?? []) {
      if ((i.sec_type ?? '').toUpperCase() !== 'OPT') continue
      const sym = i.symbol.trim().toUpperCase()
      byUnderlying.set(sym, [
        ...(byUnderlying.get(sym) ?? []),
        {
          id: i.contract_key,
          expiry: String(i.expiry ?? ''),
          label: i.display_label ?? `${i.strike ?? '?'} ${i.option_right ?? ''}`,
          mark: null,
          chgPct: null,
          third: '',
        },
      ])
    }
    const watchList: DockListIn = {
      key: 'watch',
      title: 'Watchlist',
      tag: 'Watch',
      sub: 'Research › Watchlist · manage it there',
      head: 'IV rk',
      rows: watchSyms.map((sym) => {
        const iv = ivOf.get(sym)
        return {
          symbol: sym,
          third: iv == null ? '—' : String(Math.round(iv)),
          thirdTitle:
            iv == null
              ? ivScan.data
                ? `The scan (as of ${asOf ?? '?'}) has no 1y IV rank for ${sym}`
                : 'IV rank loads with the scan'
              : `1y IV rank ${iv.toFixed(1)} · scan as of ${asOf ?? '?'}`,
          held: held.has(sym),
          contracts: byUnderlying.get(sym),
        }
      }),
      empty: watch.isError ? 'The watchlist did not answer.' : 'The watchlist is empty. Add names on Research › Watchlist.',
      loading: watch.isLoading,
    }

    const port: DockListIn = {
      key: 'port',
      title: 'Portfolio',
      tag: 'Port',
      sub: 'held · by underlying · both accounts',
      head: 'Unrl',
      rows: portRows(book.rows, held, book.tagOf),
      empty: 'Nothing held in either account.',
      loading: book.isLoading,
    }

    const objTitle = isAll
      ? 'every objective'
      : (objectivesData?.items.find((o) => o.id === objective)?.title ?? objective)
    const mine = (candidates.data?.items ?? []).filter((c) => isAll || candidateObjectiveId(c) === objective)
    const latest = mine.reduce((d, c) => (c.trade_date > d ? c.trade_date : d), '')
    const seenObj = new Set<string>()
    const objRows: DockRowIn[] = []
    for (const c of mine) {
      const sym = c.symbol.toUpperCase()
      if (c.trade_date !== latest || seenObj.has(sym)) continue
      seenObj.add(sym)
      objRows.push({
        symbol: sym,
        third: c.status,
        thirdTone: c.status === 'open' ? 'waiting' : 'mute',
        thirdTitle: c.status === 'open' ? 'Open — waiting on a call' : `Candidate ${c.status}`,
        held: held.has(sym),
      })
    }
    const obj: DockListIn = {
      key: 'obj',
      title: 'Objective',
      tag: 'Obj',
      sub: `${objTitle} · candidates${latest ? ` of ${latest}` : ''}`,
      head: 'State',
      rows: objRows,
      empty: candidates.isError
        ? 'The candidate pool did not answer.'
        : isAll
          ? 'No candidates in the pool.'
          : `${objTitle} has proposed no candidates.`,
      loading: candidates.isLoading,
    }

    const recentList: DockListIn = {
      key: 'recent',
      title: 'Recent',
      tag: 'Recent',
      sub: 'last loaded, newest first',
      head: 'When',
      rows: recent.map((r) => ({
        symbol: r.symbol,
        third: agoLabel(r.at, now),
        thirdTone: 'mute',
        thirdTitle: new Date(r.at).toLocaleString('en-US'),
        held: held.has(r.symbol),
      })),
      empty: 'Nothing loaded yet. Every name you open lands here.',
      loading: false,
    }

    const today = (alerts.data?.items ?? []).filter((a) => a.trade_date === todayEt)
    const named = today.filter((a) => a.symbol)
    const seenAlert = new Set<string>()
    const alertRows: DockRowIn[] = []
    for (const a of named) {
      const sym = (a.symbol ?? '').toUpperCase()
      if (seenAlert.has(sym)) continue
      seenAlert.add(sym)
      alertRows.push({
        symbol: sym,
        third: etTime(a.computed_at),
        thirdTone: 'mute',
        note: reasonText(a.reason, String(a.kind)),
        held: held.has(sym),
      })
    }
    const alertList: DockListIn = {
      key: 'alerts',
      title: 'Alerts fired',
      tag: 'Alerts',
      sub: 'today · armed in Market › Alerts',
      head: 'At',
      rows: alertRows,
      empty: alerts.isError
        ? 'The alerts store did not answer.'
        : today.length === 0
          ? 'Nothing has fired today.'
          : `${today.length} fired today, none on a name — these alerts are per lens.`,
      loading: alerts.isLoading,
    }

    return { lists: { source, watch: watchList, port, obj, recent: recentList, alerts: alertList }, todayEt }
  }, [trail, held, ivScan.data, watch.data, watch.isError, watch.isLoading, watchSyms, book.rows, book.tagOf, book.isLoading, isAll, objectivesData, objective, candidates.data, candidates.isError, candidates.isLoading, recent, now, alerts.data, alerts.isError, alerts.isLoading, todayEt])
}
