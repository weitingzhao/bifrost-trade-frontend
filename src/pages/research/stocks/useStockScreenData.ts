/**
 * What Stock screen reads: three model stores, the SEPA evaluation table, and
 * the server sets for the conditions a row cannot answer on its own.
 *
 * - **SEPA** is the wide read (3,745 names, all 19 conditions and both tier
 *   scores) — one call, re-cut here exactly as the mart cuts it.
 * - **Radar** is the latest session only. `/research/momentum/radar` resolves
 *   "latest" only for one symbol; across the universe it returns every
 *   session it holds, so the session comes from `momentum-grades` (trade-api
 *   0.1.8) and each grade is read at that date. A grade page that comes back
 *   full is re-read by path, so a capped page never passes for a whole grade.
 * - **Premium** is the scan at the server's neutral preset, in two pages:
 *   the route caps at 500 and the option universe is 691.
 * - **Server sets** are fetched only for chips that are on (structure and
 *   momentum-tier signals, sentiment); their counts come from `tier-stats`.
 */
import { useMemo } from 'react'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchSepaScreenerWide } from '@/api/research/sepaScreenerWide'
import { fetchMomentumRadar, type MomentumScore } from '@/api/researchEngine'
import { fetchScan } from '@/api/research/scan'
import { fetchOpportunities } from '@/api/strategy'
import {
  fetchMomentumFilter,
  fetchMomentumGrades,
  fetchTierFilter,
  fetchTierStats,
} from '@/api/research/dataReadiness'
import { useNarrativeWindow } from '@/hooks/useNarrative'
import { usePortfolioSymbols } from '@/hooks/usePortfolioSymbols'
import { NARRATIVE_WINDOW_DAYS, namesByCondition } from '@/lib/research/narrativeItems'
import { ruleIndex, toVolRow, type VolRow } from '@/lib/research/volRatingsModel'
import { joinNames, type NameRow } from './stockScreenModel'
import { STAGE_OF, pineChipId } from './stockScreenStages'
import type { PineWithin } from './stockScreenModel'
import { fetchPineSignals } from '@/api/research/pine'
import { usePineLibrary } from '@/hooks/usePineLibrary'

const STALE = 10 * 60_000
const RADAR_PAGE = 500
const SCAN_PAGE = 500
const SET_PAGE = 5000
const RADAR_GRADES = ['A+', 'A', 'B', 'C', 'D'] as const
const RADAR_PATHS = ['EXT', 'PB', 'FAIL', 'HALT'] as const

async function radarLatest(): Promise<{ date: string | null; rows: MomentumScore[] }> {
  const g = await fetchMomentumGrades()
  const date = g.trade_date ?? null
  if (!g.ok || !date) throw new Error(g.error ?? 'momentum-grades answered without a session')
  const pages = await Promise.all(
    RADAR_GRADES.map(async (grade) => {
      const one = await fetchMomentumRadar({ trade_date: date, grade, limit: RADAR_PAGE })
      const rows = (one.rows ?? []) as MomentumScore[]
      if (rows.length < RADAR_PAGE) return rows
      const byPath = await Promise.all(
        RADAR_PATHS.map((path) => fetchMomentumRadar({ trade_date: date, grade, path, limit: RADAR_PAGE })),
      )
      const out = byPath.flatMap((p) => (p.rows ?? []) as MomentumScore[])
      if (byPath.some((p) => (p.rows ?? []).length >= RADAR_PAGE)) {
        throw new Error(`Radar grade ${grade} on ${date} fills a ${RADAR_PAGE}-row page even by path`)
      }
      return out
    }),
  )
  return { date, rows: pages.flat() }
}

async function scanAll(): Promise<{ rows: VolRow[]; universe: number; asOf: string | null }> {
  const first = await fetchScan({ preset: 'neutral', sortBy: 'composite_score', sortDir: 'desc', limit: SCAN_PAGE })
  const universe = first.universe_size ?? first.rows.length
  let raw = first.rows
  for (let off = SCAN_PAGE; off < universe; off += SCAN_PAGE) {
    const next = await fetchScan({
      preset: 'neutral',
      sortBy: 'composite_score',
      sortDir: 'desc',
      limit: SCAN_PAGE,
      offset: off,
    })
    if (!next.rows.length) break
    raw = raw.concat(next.rows)
  }
  const rows = raw.map(toVolRow).filter((r): r is VolRow => r != null)
  return { rows, universe, asOf: first.as_of ?? null }
}

/** One server set, whole: a truncated answer is an error, never a smaller set. */
type SetStage = 'structure' | 'sentiment' | 'momtier'

async function chipSet(stage: SetStage, id: string): Promise<string[]> {
  const res =
    stage === 'momtier'
      ? await fetchMomentumFilter({ include: [id], match: 'any', limit: SET_PAGE })
      : await fetchTierFilter({ tier: stage, include: [id], match: 'any', limit: SET_PAGE })
  if (!res.ok) throw new Error(res.error ?? `${id}: the filter did not answer`)
  if (res.truncated) throw new Error(`${id}: ${res.count} names exceed one ${SET_PAGE}-name page`)
  return (res.symbols ?? []).map((s) => s.symbol.toUpperCase())
}

/** `pineWithin` null: a reader with no Pine stage (Method › Models) — the signals are not read. */
export function useStockScreenData(on: Record<string, boolean>, pineWithin: PineWithin | null = null) {
  const wide = useQuery({
    queryKey: ['research-engine', 'stock-screen', 'wide'],
    queryFn: () => fetchSepaScreenerWide(SET_PAGE),
    staleTime: STALE,
  })
  const radar = useQuery({ queryKey: ['research-engine', 'stock-screen', 'radar-latest'], queryFn: radarLatest, staleTime: STALE })
  const scan = useQuery({ queryKey: ['research-engine', 'stock-screen', 'scan-all'], queryFn: scanAll, staleTime: STALE })
  const opps = useQuery({
    queryKey: ['strategy', 'opportunities', 'active'],
    queryFn: () => fetchOpportunities(true),
    staleTime: STALE,
  })
  const narr = useNarrativeWindow(NARRATIVE_WINDOW_DAYS, { limit: 2000 })
  const structStats = useQuery({
    queryKey: QUERY_KEYS.tradeResearch.tierStats('structure'),
    queryFn: () => fetchTierStats('structure'),
    staleTime: STALE,
  })
  const sentStats = useQuery({
    queryKey: QUERY_KEYS.tradeResearch.tierStats('sentiment'),
    queryFn: () => fetchTierStats('sentiment'),
    staleTime: STALE,
  })
  const momStats = useQuery({
    queryKey: QUERY_KEYS.tradeResearch.tierStats('momentum'),
    queryFn: () => fetchTierStats('momentum'),
    staleTime: STALE,
  })
  const portfolio = usePortfolioSymbols()

  const wanted = useMemo(() => {
    const out: { stage: SetStage; id: string }[] = []
    for (const stage of ['structure', 'sentiment', 'momtier'] as const) {
      for (const c of STAGE_OF[stage].chips) if (on[c.id]) out.push({ stage, id: c.id })
    }
    return out
  }, [on])
  const setQs = useQueries({
    queries: wanted.map((w) => ({
      queryKey: QUERY_KEYS.tradeResearch.screenSet(w.stage, w.id),
      queryFn: () => chipSet(w.stage, w.id),
      staleTime: STALE,
    })),
  })
  const setsKey = setQs.map((q) => q.dataUpdatedAt).join(',')
  // One read answers every Pine chip: who fired what within the stage's
  // window. Read whether or not a chip is on, so each chip carries its count
  // (≈2,400 rows at 10 sessions on DEV 2026-10-06, 47 ms).
  const pineOn = Object.keys(on).some((k) => on[k] && k.startsWith('pine:'))
  const pine = useQuery({
    queryKey: QUERY_KEYS.researchEngine.pineSignalsWithin(pineWithin ?? 0),
    queryFn: () => fetchPineSignals({ withinSessions: pineWithin ?? 1 }),
    enabled: pineWithin != null,
    staleTime: STALE,
  })
  const pineLib = usePineLibrary()
  const pineSets = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const r of pine.data?.rows ?? []) {
      const id = pineChipId(r.script, r.side)
      if (!m.has(id)) m.set(id, new Set())
      m.get(id)!.add(r.symbol.toUpperCase())
    }
    return m
  }, [pine.data])

  const sets = useMemo(() => {
    const m = new Map<string, ReadonlySet<string>>()
    wanted.forEach((w, i) => {
      const d = setQs[i]?.data
      if (d) m.set(w.id, new Set(d))
    })
    if (narr.data) for (const [id, s] of namesByCondition(narr.data.tags)) m.set(id, s)
    if (pine.data) {
      // A chip whose script fired on nobody is an empty set, not a missing one.
      for (const p of pineLib.scripts)
        for (const side of ['buy', 'sell'] as const) {
          const id = pineChipId(p.id, side)
          m.set(id, pineSets.get(id) ?? new Set())
        }
    }
    return m
    // setQs is a new array each render; its answers are keyed by setsKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, setsKey, narr.data, pine.data, pineSets, pineLib.scripts])

  const rows: NameRow[] = useMemo(
    () => joinNames(wide.data?.rows ?? [], radar.data?.rows ?? [], scan.data?.rows ?? []),
    [wide.data, radar.data, scan.data],
  )

  /** Chip counts for server-set chips, over the tier mart's own universe. */
  const setCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of structStats.data?.conditions ?? []) m.set(c.id, c.pass)
    for (const c of momStats.data?.conditions ?? []) m.set(c.id, c.pass)
    for (const c of sentStats.data?.conditions ?? []) m.set(c.id, c.pass)
    if (narr.data) for (const [id, s] of namesByCondition(narr.data.tags)) m.set(id, s.size)
    for (const [id, s] of pineSets) m.set(id, s.size)
    return m
  }, [structStats.data, momStats.data, sentStats.data, narr.data, pineSets])

  const rules = useMemo(() => ruleIndex(opps.data?.items ?? []), [opps.data])

  const setsPending = setQs.some((q) => q.isLoading) || (pineOn && pine.isLoading)
  const setError = (setQs.find((q) => q.error)?.error ?? (pineOn ? pine.error : null)) as
    | Error
    | undefined

  return {
    rows,
    sets,
    setCounts,
    setsPending,
    setError: setError?.message ?? null,
    rules,
    portfolio,
    wide,
    radar,
    scan,
    radarDate: radar.data?.date ?? null,
    sepaDate: wide.data?.evalDate ?? null,
    scanDate: scan.data?.asOf ?? null,
    scanUniverse: scan.data?.universe ?? null,
    structUniverse: structStats.data?.universe_count ?? null,
    isLoading: wide.isLoading || radar.isLoading || scan.isLoading,
    error: (wide.error ?? radar.error ?? scan.error) as Error | null,
    refetch: () => {
      void wide.refetch()
      void radar.refetch()
      void scan.refetch()
    },
  }
}

export type StockScreenData = ReturnType<typeof useStockScreenData>
