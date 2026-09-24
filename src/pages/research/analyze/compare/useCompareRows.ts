/**
 * Everything Compare reads, assembled into one row per rule.
 *
 * Six sources, none re-derived: the rulebook (Trade › Rules), the plugin's
 * listed expiries and end-of-day chain, the session's close for spot, the
 * strategy service's record by structure, and the book's room to the backing
 * gate from the same exposure hook Risk › Sizing cites.
 */
import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchStructure, fetchStructures } from '@/api/strategy'
import { fetchChainExpirations, fetchOptionSnapshots } from '@/api/marketData/optionGreeks'
import { fetchStockDailyCloses } from '@/api/marketData/dailyBars'
import { useWinRate } from '@/hooks/useStrategies'
import { useRiskExposure } from '@/hooks/useRiskExposure'
import {
  capsFor,
  chainFromSnapshots,
  economics,
  pickExpiry,
  placeStructure,
  recordFrom,
  structuresFor,
  type Caps,
  type ChainContract,
  type Economics,
  type Placement,
  type StructureRecord,
  type View,
} from './compareModel'

/** The series each row draws in, in rulebook order — identity tokens, never literals. */
export const SERIES = [
  { stroke: 'stroke-entity-option', bg: 'bg-entity-option' },
  { stroke: 'stroke-entity-strategy', bg: 'bg-entity-strategy' },
  { stroke: 'stroke-entity-instance', bg: 'bg-entity-instance' },
  { stroke: 'stroke-warning', bg: 'bg-warning' },
  { stroke: 'stroke-foreground', bg: 'bg-foreground' },
] as const

export interface CompareRow {
  id: number
  name: string
  type: string
  series: (typeof SERIES)[number]
  expiry: string | null
  /** Null while the chain for its expiry is still answering. */
  placement: Placement | null
  econ: Economics | null
  record: StructureRecord | null
  caps: Caps | null
  /** The thinnest option leg's open interest and session volume — a liquidity proxy, not a spread. */
  thinnest: { oi: number | null; volume: number | null } | null
}

function daysBack(today: string, n: number): string {
  const d = new Date(`${today}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

/**
 * The session's close — spot for an end-of-day chain, from the same session.
 * Its own hook because the page reads it too (the suggested levels), and one
 * query key means one request.
 */
export function useSessionClose(sym: string, today: string) {
  const q = useQuery({
    queryKey: ['market', 'daily-closes', sym, today],
    queryFn: () => fetchStockDailyCloses(sym, daysBack(today, 14), today),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
  const last = q.data && q.data.length > 0 ? q.data[q.data.length - 1] : null
  return { spot: last?.close ?? null, date: last?.date ?? null, isLoading: q.isLoading, error: q.error }
}

export function useCompareRows(sym: string, view: View, today: string) {
  const structuresQ = useQuery({
    queryKey: ['strategy', 'structures', 'active'],
    queryFn: () => fetchStructures(true),
    staleTime: 5 * 60_000,
  })
  const matching = useMemo(() => structuresFor(structuresQ.data?.items ?? [], view.stance), [structuresQ.data, view.stance])

  // A covered call's out-of-the-money rule lives in its metadata, which only
  // the single-structure read carries.
  const needsDetail = matching.filter((s) => (s.structure_type ?? '').startsWith('covered_call'))
  const detailQs = useQueries({
    queries: needsDetail.map((s) => ({
      queryKey: ['strategy', 'structure', s.strategy_structure_id],
      queryFn: () => fetchStructure(s.strategy_structure_id),
      staleTime: 5 * 60_000,
    })),
  })
  const detailStamp = detailQs.map((q) => q.dataUpdatedAt).join(',')
  const detailed = useMemo(() => {
    const byId = new Map(detailQs.map((q) => q.data).filter(Boolean).map((d) => [d!.strategy_structure_id, d!]))
    return matching.map((s) => byId.get(s.strategy_structure_id) ?? s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matching, detailStamp])

  const expQ = useQuery({
    queryKey: ['market', 'chain-expirations', sym, today],
    queryFn: () => fetchChainExpirations(sym, today),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
  const close = useSessionClose(sym, today)
  const spot = close.spot

  const expiryOf = useMemo(() => {
    const m = new Map<number, string | null>()
    for (const s of detailed) {
      m.set(s.strategy_structure_id, pickExpiry(expQ.data ?? [], today, view.horizon, s.dim_time === 'monthly'))
    }
    return m
  }, [detailed, expQ.data, today, view.horizon])
  const expiries = useMemo(
    () => [...new Set([...expiryOf.values()].filter((e): e is string => e != null))].sort(),
    [expiryOf],
  )

  const chainQs = useQueries({
    queries: expiries.map((e) => ({
      queryKey: ['market', 'option-snapshots', sym, e],
      queryFn: () => fetchOptionSnapshots(sym, e),
      enabled: Boolean(sym),
      staleTime: 10 * 60_000,
    })),
  })
  const chainStamp = chainQs.map((q) => q.dataUpdatedAt).join(',')
  const expiryKey = expiries.join(',')
  const chains = useMemo(() => {
    const m = new Map<string, { chain: ChainContract[]; asOf: string | null }>()
    chainQs.forEach((q, i) => {
      if (q.data) m.set(expiries[i], { chain: chainFromSnapshots(q.data.rows), asOf: q.data.rows[0]?.snapshot_ts ?? null })
    })
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainStamp, expiryKey])

  const winRate = useWinRate()
  const records = useMemo(
    () => new Map((winRate.data?.structures ?? []).map((r) => [r.structure_name, recordFrom(r)])),
    [winRate.data],
  )

  const exposure = useRiskExposure('all')
  const spendable = exposure.judgment?.spendable ?? null

  const rows = useMemo<CompareRow[]>(
    () =>
      detailed.map((s, i) => {
        const expiry = expiryOf.get(s.strategy_structure_id) ?? null
        const chain = expiry ? chains.get(expiry)?.chain : undefined
        const placement: Placement | null =
          expiry == null
            ? { ok: false, type: s.structure_type ?? '', reason: `no listed ${s.dim_time === 'monthly' ? 'monthly ' : ''}expiry ${view.horizon} days out` }
            : chain == null || spot == null
              ? null
              : placeStructure(s, view, chain, spot, expiry)
        const econ = placement?.ok && spot != null ? economics(placement, spot) : null
        const record = records.get(s.name) ?? null
        const legs = placement?.ok ? placement.legs.filter((l) => l.contract) : []
        const thinnest =
          legs.length === 0
            ? null
            : legs.reduce(
                (t, l) => ((l.contract!.oi ?? Infinity) < (t.oi ?? Infinity) ? { oi: l.contract!.oi, volume: l.contract!.volume } : t),
                { oi: legs[0].contract!.oi, volume: legs[0].contract!.volume },
              )
        return {
          id: s.strategy_structure_id,
          name: s.name,
          type: s.structure_type ?? '',
          series: SERIES[i % SERIES.length],
          expiry,
          placement,
          econ,
          record,
          caps: econ ? capsFor(econ, spendable, record) : null,
          thinnest,
        }
      }),
    [detailed, expiryOf, chains, spot, view, records, spendable],
  )

  const chainAsOf = [...chains.values()].map((c) => c.asOf).find(Boolean) ?? null

  return {
    rows,
    spot,
    spotDate: close.date,
    chainAsOf,
    judgment: exposure.judgment ?? null,
    loading: structuresQ.isLoading || expQ.isLoading || close.isLoading || chainQs.some((q) => q.isLoading),
    roomLoading: exposure.statusLoading,
    recordsLoaded: winRate.isSuccess,
    errors: {
      structures: structuresQ.error,
      expirations: expQ.error,
      closes: close.error,
      chain: chainQs.find((q) => q.error)?.error ?? null,
    },
    ruleCount: structuresQ.data?.items?.filter((s) => s.is_active).length ?? 0,
  }
}
