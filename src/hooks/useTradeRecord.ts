/**
 * Everything the instance face reads (design Rev .101, `_Part InstanceRecord`),
 * built on the instance detail the Positions sheet already loads — structure,
 * performance, the Performance-book fills — plus the four things the face adds:
 *
 * - **marks for open legs**: a live quote while the gateway has one, else the
 *   vendor's snapshot of the contract — the same rows Positions reads, with
 *   the capture time — else the contract's last `option_daily` close with its
 *   date (after the close the quote cache is empty, and the IB snapshot carries
 *   no option price at all — both measured on DEV and PROD 2026-09-28);
 * - **the position now** (Rev .102): the open legs with the vendor's Greeks
 *   scaled to the holding;
 * - **spot**: the underlying's quote now, or its close on the day an instance
 *   closed;
 * - **covering shares**: an open covered call is drawn with the account's
 *   current shares at their current average cost (Owner 2026-09-28) — stock
 *   legs are never attributed to an instance, so a closed one has none;
 * - **TWS client rows**, matched by contract key (they carry no attribution).
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTradeDetailData } from '@/hooks/useTradeDetailData'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useQuotes } from '@/hooks/useQuotes'
import { useOptionGreeks, type GreekLeg } from '@/hooks/useOptionGreeks'
import { buildOptionTicker } from '@/utils/optionTicker'
import { todayIso } from '@/lib/researchFreshness'
import { fetchExecutionsRange } from '@/api/trading'
import { fetchOptionDailyBars, fetchStockDailyCloses, occToOptionTicker } from '@/api/marketData/dailyBars'
import type { Trade } from '@/types/positions'
import {
  execGroupsOf,
  legsOf,
  lifeOf,
  heldLegs,
  payoffOf,
  positionOf,
  type RecordLeg,
  twsRowsFor,
  type LegMark,
} from '@/utils/tradeRecord/tradeRecordModel'

const shiftIso = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

export function useTradeRecord(trade: Trade | null, opts?: { tws?: boolean; withShares?: boolean }) {
  const { data: status } = useMonitorStatus()
  const accounts = status?.portfolio?.accounts ?? undefined
  const detail = useTradeDetailData(trade, accounts, trade != null)
  const execs = useMemo(() => detail?.executionsFinal ?? [], [detail?.executionsFinal])
  const today = todayIso()

  const bare = useMemo(() => legsOf(execs, {}), [execs])
  const openKeys = useMemo(() => bare.filter((l) => l.open).map((l) => l.key), [bare])
  const roots = useMemo(() => [...new Set(bare.map((l) => l.root).filter(Boolean))], [bare])
  const closed = bare.length > 0 && openKeys.length === 0

  const quotesQ = useQuotes(roots, openKeys)
  const quotes = useMemo(() => quotesQ.data?.quotes ?? [], [quotesQ.data])

  const live: Record<string, LegMark> = useMemo(() => {
    const out: Record<string, LegMark> = {}
    for (const q of quotes) {
      const ck = (q.contract_key ?? '').trim()
      const px = q.mid ?? q.last ?? null
      if (openKeys.includes(ck) && px != null && px > 0) out[ck] = { price: px, source: 'live' }
    }
    return out
  }, [quotes, openKeys])

  // The vendor's per-contract rows for the open legs — Positions' own read.
  const greekLegs: GreekLeg[] = useMemo(
    () =>
      bare
        .filter((l) => l.open && l.expiry)
        .map((l) => ({ underlying: l.root, expiry: l.expiry!, strike: l.strike, right: l.right, qty: l.openQty })),
    [bare],
  )
  const greeks = useOptionGreeks(greekLegs)
  const tickerOf = (l: Pick<RecordLeg, 'root' | 'expiry' | 'strike' | 'right'>) =>
    buildOptionTicker({ underlying: l.root, expiry: l.expiry ?? '', strike: l.strike, right: l.right })
  const snap: Record<string, LegMark> = useMemo(() => {
    const out: Record<string, LegMark> = {}
    for (const l of bare) {
      if (!l.open) continue
      const t = tickerOf(l)
      const c = t ? greeks.closeByTicker.get(t) : undefined
      if (c && c.close > 0) out[l.key] = { price: c.close, source: 'snap', asOf: c.asOf ?? undefined }
    }
    return out
    // tickerOf is a pure function of its argument.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bare, greeks.closeByTicker])

  const needEod = useMemo(
    () => (greeks.isLoading ? [] : openKeys.filter((k) => !live[k] && !snap[k])),
    [openKeys, live, snap, greeks.isLoading],
  )
  const eodQ = useQuery({
    queryKey: ['trade-record', 'eod-marks', needEod, today],
    queryFn: async () => {
      const out: Record<string, LegMark> = {}
      await Promise.all(
        needEod.map(async (k) => {
          const ticker = occToOptionTicker(k)
          if (!ticker) return
          const bars = await fetchOptionDailyBars(ticker, shiftIso(today, -21), today)
          const last = [...bars].reverse().find((b) => b.close != null && b.close > 0)
          if (last) out[k] = { price: last.close!, source: 'eod', asOf: last.date }
        }),
      )
      return out
    },
    enabled: needEod.length > 0,
    staleTime: 15 * 60_000,
  })

  const marks = useMemo(() => ({ ...(eodQ.data ?? {}), ...snap, ...live }), [eodQ.data, snap, live])
  const legs = useMemo(() => legsOf(execs, marks), [execs, marks])
  const life = useMemo(() => lifeOf(execs, legs, today), [execs, legs, today])

  // Spot: now for an open instance; the close on its last day for a closed one.
  const spotNow = useMemo(() => {
    const out: Record<string, number> = {}
    for (const q of quotes) {
      if ((q.sec_type ?? '').toUpperCase() === 'STK' && q.symbol && (q.last ?? q.mid)) out[q.symbol.toUpperCase()] = (q.last ?? q.mid)!
    }
    return out
  }, [quotes])
  const closeQ = useQuery({
    queryKey: ['trade-record', 'spot-at-close', roots, life.to],
    queryFn: async () => {
      const out: Record<string, { price: number; date: string }> = {}
      await Promise.all(
        roots.map(async (r) => {
          const bars = await fetchStockDailyCloses(r, shiftIso(life.to!, -10), life.to!)
          const last = [...bars].reverse().find((b) => b.close != null && b.date <= life.to!)
          if (last) out[r] = { price: last.close!, date: last.date }
        }),
      )
      return out
    },
    enabled: closed && life.to != null && roots.length > 0,
    staleTime: 60 * 60_000,
  })

  // Spot for an open instance when the gateway has no quote (after the close):
  // the underlying's last daily close, dated.
  const spotLast = useQuery({
    queryKey: ['trade-record', 'spot-last', roots, today],
    queryFn: async () => {
      const out: Record<string, number> = {}
      await Promise.all(
        roots.map(async (r) => {
          const bars = await fetchStockDailyCloses(r, shiftIso(today, -10), today)
          const last = [...bars].reverse().find((b) => b.close != null)
          if (last) out[r] = last.close!
        }),
      )
      return out
    },
    enabled: !closed && roots.length > 0 && !quotesQ.isLoading && roots.some((r) => spotNow[r] == null),
    staleTime: 30 * 60_000,
  })

  // Covering shares: the account's current stock position, for an open
  // instance with a short call on that name.
  const acct = trade?.account_id ?? null
  const sharesFor = (root: string) => {
    if (closed || opts?.withShares === false) return null
    const shortCalls = legs.filter((l) => l.open && l.root === root && l.right === 'C' && l.openQty < 0)
    if (shortCalls.length === 0) return null
    const pos = (accounts ?? [])
      .filter((a) => !acct || (a.account_id ?? '').trim() === acct)
      .flatMap((a) => a.positions ?? [])
      .find((p) => (p.contract_key ?? '').includes('|STK|') && (p.symbol ?? '').toUpperCase() === root)
    const held = Number(pos?.position ?? 0)
    if (!pos || held <= 0) return null
    const need = shortCalls.reduce((a, l) => a + Math.abs(l.openQty) * 100, 0)
    return { qty: Math.min(held, need), avgCost: pos.avgCost ?? null, held }
  }

  // A payoff is one underlying's; draw the names the held legs trade — a leg
  // already flat inside an open instance carries no risk and draws nothing.
  const heldRoots = useMemo(() => [...new Set(heldLegs(legs).map((h) => h.leg.root))], [legs])
  const payoffs = useMemo(
    () =>
      heldRoots
        .map((r) => {
          const spot = closed ? (closeQ.data?.[r]?.price ?? null) : (spotNow[r] ?? spotLast.data?.[r] ?? null)
          const sh = sharesFor(r)
          const p = payoffOf(legs.filter((l) => l.root === r), sh ? { qty: sh.qty, avgCost: sh.avgCost } : null, spot)
          const spotPending = spot == null && (closed ? closeQ.isLoading : quotesQ.isLoading || spotLast.isLoading)
          const lastClose = !closed && spotNow[r] == null && spotLast.data?.[r] != null
          return p
            ? { ...p, spot, spotPending, spotDate: closed ? (closeQ.data?.[r]?.date ?? null) : null, lastClose, shares: sh }
            : null
        })
        .filter((p): p is NonNullable<typeof p> => p != null),
    // sharesFor reads legs, accounts, closed, opts — all listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [heldRoots, legs, closed, closeQ.data, closeQ.isLoading, quotesQ.isLoading, spotNow, spotLast.data, spotLast.isLoading, accounts, acct, opts?.withShares],
  )

  const position = useMemo(() => {
    if (closed) return null
    const r0 = heldRoots[0]
    const spot = r0 ? (spotNow[r0] ?? spotLast.data?.[r0] ?? null) : null
    const sh = r0 ? sharesFor(r0) : null
    return positionOf(
      legs,
      (l) => {
        const t = tickerOf(l)
        const row = t ? greeks.perShareByTicker.get(t) : undefined
        return row ? { delta: row.delta ?? null, theta: row.theta ?? null, asOf: row.snapshot_ts ?? null } : null
      },
      spot,
      today,
      sh ? { qty: sh.qty, avgCost: sh.avgCost } : null,
    )
    // sharesFor and tickerOf read only what is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed, heldRoots, spotNow, spotLast.data, legs, greeks.perShareByTicker, today, accounts, acct, opts?.withShares])

  const canCover = !closed && roots.some((r) => legs.some((l) => l.open && l.root === r && l.right === 'C' && l.openQty < 0))

  const twsQ = useQuery({
    queryKey: ['trade-record', 'tws', acct, life.from],
    queryFn: () =>
      fetchExecutionsRange({
        source_scope: 'tws_raw',
        account_id: acct ?? undefined,
        from_ts: life.from ? Date.parse(`${life.from}T00:00:00Z`) / 1000 - 86_400 : undefined,
        limit: 2000,
      }),
    enabled: Boolean(opts?.tws) && life.from != null,
    staleTime: 60_000,
  })
  const keys = useMemo(() => new Set(bare.map((l) => l.key)), [bare])
  const tws = useMemo(() => twsRowsFor(twsQ.data?.items ?? [], keys), [twsQ.data, keys])

  return {
    detail,
    loading: detail == null || detail.execLoading,
    legs,
    life,
    payoffs,
    canCover,
    execGroups: execGroupsOf(legs),
    tws,
    twsLoading: twsQ.isLoading,
    marksPending: greeks.isLoading || (eodQ.isLoading && needEod.length > 0),
    position,
    positionPending: greeks.isLoading,
  }
}
