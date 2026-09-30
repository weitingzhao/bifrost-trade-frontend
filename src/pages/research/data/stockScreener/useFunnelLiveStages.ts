/**
 * The funnel's stages that read a mart directly, and the cuts that make a run
 * apply what the funnel shows (2026-09-30).
 *
 * - **Momentum** is the radar's grade on its **latest session**
 *   (`momentum-grades`). The radar route resolves "latest" only for one
 *   symbol; across the universe it returns every session it holds, so the
 *   chips used to count names that held a grade on any day in months.
 * - **Structure** is `dw_stock.mart_sepa_tier_structure`'s own signals, any
 *   selected (`tier-stats` for the chips, `tier-filter?match=any` for the
 *   stage). Its filter answered a hard-coded 0 until api 0.1.8.
 * - **At least N of** the trend / growth stage is now applied by Run, not only
 *   drawn: names passing N..max from the per-count distribution routes.
 */
import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchFundamentalDistributionSymbols,
  fetchMomentumGrades,
  fetchTechnicalDistributionSymbols,
  fetchTierFilter,
  fetchTierStats,
} from '@/api/research/dataReadiness'
import { usePageViewSet } from '@/lib/pageView'
import type { TierFilterState } from '@/types/stockScreener'
import { intersectSymbolLists } from '@/utils/stockScreener'
import { GRADE_CHIPS } from './screenerFunnel'

const GRADE_OF = new Map(GRADE_CHIPS)

/** How many conditions each `min` stage has. */
const MIN_STAGE_MAX: Record<string, number> = { trend: 11, growth: 8 }

type ChipCount = { id: string; pass: number; capped: boolean }

/** Names passing at least `min` of a stage's conditions: the union of the exact-count sets `min`..max. */
async function atLeastNames(stage: 'trend' | 'growth', min: number): Promise<string[]> {
  const max = MIN_STAGE_MAX[stage]
  const fetchOne = stage === 'trend' ? fetchTechnicalDistributionSymbols : fetchFundamentalDistributionSymbols
  const parts = await Promise.all(Array.from({ length: max - min + 1 }, (_, i) => fetchOne(min + i)))
  const out = new Set<string>()
  for (const p of parts) {
    if (!p.ok) throw new Error(p.error ?? `${stage} distribution failed`)
    for (const s of p.symbols ?? []) out.add(s.symbol.toUpperCase())
  }
  return [...out]
}

export function useFunnelLiveStages({ structure, universe }: { structure: TierFilterState; universe: number | null }) {
  const [grades, setGrades] = usePageViewSet<string>('grades')

  const gradesQ = useQuery({
    queryKey: ['screener', 'momentum-grades', 'latest'],
    queryFn: () => fetchMomentumGrades(),
    staleTime: 5 * 60_000,
  })
  const structQ = useQuery({
    queryKey: ['screener', 'tier-stats', 'structure'],
    queryFn: () => fetchTierStats('structure'),
    staleTime: 5 * 60_000,
  })
  const structPicked = useMemo(() => [...structure.indicators].sort(), [structure.indicators])
  const structKey = structPicked.join(',')
  const structCountQ = useQuery({
    queryKey: ['screener', 'structure-any', structKey],
    queryFn: () => fetchTierFilter({ tier: 'structure', include: structKey.split(','), match: 'any', limit: 1 }),
    enabled: structKey !== '',
    staleTime: 5 * 60_000,
  })

  const gradeCounts = useMemo(() => (gradesQ.data?.ok ? (gradesQ.data.counts ?? {}) : null), [gradesQ.data])
  const chipCounts = useMemo(
    () => ({
      momentum: gradeCounts
        ? GRADE_CHIPS.map(([id, g]): ChipCount => ({ id, pass: gradeCounts[g] ?? 0, capped: false }))
        : null,
      structure: structQ.data?.ok
        ? (structQ.data.conditions ?? []).map((c): ChipCount => ({ id: c.id, pass: c.pass, capped: false }))
        : null,
    }),
    [gradeCounts, structQ.data],
  )
  // Nothing picked passes the whole universe through, as a stage with no pick does.
  const stageCounts = useMemo(
    () => ({
      momentum:
        grades.size === 0
          ? universe
          : gradeCounts
            ? [...grades].reduce((n, id) => n + (gradeCounts[GRADE_OF.get(id) ?? ''] ?? 0), 0)
            : null,
      structure: structKey === '' ? universe : structCountQ.data?.ok ? (structCountQ.data.count ?? 0) : null,
    }),
    [grades, gradeCounts, structKey, structCountQ.data, universe],
  )

  const toggleGrade = useCallback(
    (id: string) =>
      setGrades((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
    [setGrades],
  )

  /**
   * The run's last cuts: `base` (the server-side criteria, or null when none
   * were picked) ∩ each `min` stage ∩ the picked grades. Null when nothing at
   * all narrows the universe.
   */
  const cut = useCallback(
    async (base: string[] | null, mins: Record<string, number>): Promise<string[] | null> => {
      const sets: string[][] = base ? [base.map((s) => s.toUpperCase())] : []
      const jobs: Promise<string[]>[] = []
      for (const stage of ['trend', 'growth'] as const) {
        const min = mins[stage] ?? 0
        if (min > 0) jobs.push(atLeastNames(stage, min))
      }
      if (grades.size > 0) {
        const picked = [...grades].map((id) => GRADE_OF.get(id)).filter((g): g is string => g != null)
        jobs.push(
          fetchMomentumGrades(picked).then((r) => {
            if (!r.ok) throw new Error(r.error ?? 'Momentum grades failed')
            if (r.truncated) throw new Error(`Momentum keeps ${r.count} names, more than one page — narrow it`)
            return (r.symbols ?? []).map((s) => s.toUpperCase())
          }),
        )
      }
      sets.push(...(await Promise.all(jobs)))
      return sets.length === 0 ? null : intersectSymbolLists(sets)
    },
    [grades],
  )

  return {
    grades,
    setGrades,
    toggleGrade,
    chipCounts,
    stageCounts,
    cut,
    /** The radar session the grades read, for the stage's as-of. */
    momentumAsOf: gradesQ.data?.trade_date ?? null,
    structureAsOf: structQ.data?.eval_date ?? null,
  }
}
