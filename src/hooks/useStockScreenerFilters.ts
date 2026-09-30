import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  fetchFundamentalFilter,
  fetchMomentumFilter,
  fetchTechnicalFilter,
  fetchTierFilter,
} from '@/api/research/dataReadiness'
import { TIER_CATALOG, type TierKey } from '@/constants/stockScreenerCatalog'
import type { FilterPreview, TierFilterState } from '@/types/stockScreener'
import { intersectSymbolLists } from '@/utils/stockScreener'
import { readPageView, usePageViewKey, writePageView } from '@/lib/pageView'

function emptyTierFilters(): Record<TierKey, TierFilterState> {
  return {
    momentum: { indicators: new Set(), minScore: 0, match: 'all' },
    structure: { indicators: new Set(), minScore: 0, match: 'all' },
    sentiment: { indicators: new Set(), minScore: 0, match: 'all' },
  }
}

/** A tier filter's page can name more than 2000 names (structure "any of two" is ~3,100 on DEV). */
const TIER_PAGE = 5000

/**
 * The criteria as plain data: what the page keeps as its view (Rev .79, the
 * design's `on`) and what Clear all's Undo puts back (Rev .75).
 */
export interface ScreenerCriteria {
  cond: string[]
  tech: string[]
  tiers: Partial<Record<TierKey, { indicators: string[]; minScore: number; match?: 'all' | 'any' }>>
}

function tiersFrom(c: ScreenerCriteria['tiers'] | undefined): Record<TierKey, TierFilterState> {
  const out = emptyTierFilters()
  for (const [k, v] of Object.entries(c ?? {})) {
    if (!v || !(k in out)) continue
    // A view saved before 2026-09-30 can hold the old signal ids no mart carries: drop them.
    const valid = new Set(TIER_CATALOG[k as TierKey].map((x) => x.id))
    out[k as TierKey] = {
      indicators: new Set(v.indicators.filter((id) => valid.has(id))),
      minScore: v.minScore,
      match: v.match === 'any' ? 'any' : 'all',
    }
  }
  return out
}

export function useStockScreenerFilters() {
  const viewKey = usePageViewKey()
  const [saved] = useState(() => readPageView(viewKey).criteria as ScreenerCriteria | undefined)
  const [condFilter, setCondFilter] = useState<Set<string>>(() => new Set(saved?.cond))
  const [techCondFilter, setTechCondFilter] = useState<Set<string>>(() => new Set(saved?.tech))
  const [tierFilters, setTierFilters] = useState<Record<TierKey, TierFilterState>>(() => tiersFrom(saved?.tiers))

  const criteria = useMemo<ScreenerCriteria>(
    () => ({
      cond: [...condFilter],
      tech: [...techCondFilter],
      tiers: Object.fromEntries(
        Object.entries(tierFilters).map(([k, v]) => [
          k,
          { indicators: [...v.indicators], minScore: v.minScore, match: v.match },
        ]),
      ),
    }),
    [condFilter, techCondFilter, tierFilters],
  )
  useEffect(() => {
    writePageView(viewKey, 'criteria', criteria)
  }, [viewKey, criteria])
  const [filterPreview, setFilterPreview] = useState<FilterPreview | null>(null)
  const [filterError, setFilterError] = useState<string | null>(null)

  const toggleCondFilter = useCallback((id: string) => {
    setCondFilter((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setFilterPreview(null)
    setFilterError(null)
  }, [])

  const toggleTechCondFilter = useCallback((id: string) => {
    setTechCondFilter((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setFilterPreview(null)
    setFilterError(null)
  }, [])

  /** `match` switches how the tier's picks combine; left out, it stays as it was. */
  const toggleTierIndicator = useCallback((tier: TierKey, id: string, match?: 'all' | 'any') => {
    setTierFilters((prev) => {
      const cur = prev[tier]
      const next = new Set(cur.indicators)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...prev, [tier]: { ...cur, indicators: next, match: match ?? cur.match } }
    })
    setFilterPreview(null)
    setFilterError(null)
  }, [])

  const setTierMinScore = useCallback((tier: TierKey, score: number) => {
    setTierFilters((prev) => ({ ...prev, [tier]: { ...prev[tier], minScore: score } }))
    setFilterPreview(null)
    setFilterError(null)
  }, [])

  const clearCondFilter = useCallback(() => {
    setCondFilter(new Set())
    setFilterPreview(null)
  }, [])

  const clearTechCondFilter = useCallback(() => {
    setTechCondFilter(new Set())
    setFilterPreview(null)
  }, [])

  const clearTierFilter = useCallback((tier: TierKey) => {
    setTierFilters((prev) => ({ ...prev, [tier]: { indicators: new Set(), minScore: 0, match: 'all' } }))
    setFilterPreview(null)
  }, [])

  const clearAllTierFilters = useCallback(() => {
    setTierFilters(emptyTierFilters())
    setFilterPreview(null)
  }, [])

  const clearExtGroupFilter = useCallback((groupKey: string, catalog: readonly { id: string; group: string }[]) => {
    setCondFilter((prev) => {
      const next = new Set(prev)
      catalog.filter((c) => c.group === groupKey).forEach((c) => next.delete(c.id))
      return next
    })
    setFilterPreview(null)
  }, [])

  const clearSepaGroupFilter = useCallback((group: 'eps' | 'rev', catalog: readonly { id: string; group: string }[]) => {
    setCondFilter((prev) => {
      const next = new Set(prev)
      catalog.filter((c) => c.group === group).forEach((c) => next.delete(c.id))
      return next
    })
    setFilterPreview(null)
  }, [])

  const clearAllFilters = useCallback(() => {
    clearCondFilter()
    clearTechCondFilter()
    clearAllTierFilters()
    setFilterPreview(null)
    setFilterError(null)
  }, [clearCondFilter, clearTechCondFilter, clearAllTierFilters])

  /** Puts a set of criteria back — Clear all's Undo. */
  const restoreCriteria = useCallback((c: ScreenerCriteria) => {
    setCondFilter(new Set(c.cond))
    setTechCondFilter(new Set(c.tech))
    setTierFilters(tiersFrom(c.tiers))
    setFilterPreview(null)
    setFilterError(null)
  }, [])

  const tierActiveCount = useMemo(() => {
    let count = 0
    for (const k of ['momentum', 'structure', 'sentiment'] as TierKey[]) {
      const f = tierFilters[k]
      if (f.indicators.size > 0 || f.minScore > 0) count++
    }
    return count
  }, [tierFilters])

  const anyFilterActive = condFilter.size > 0 || techCondFilter.size > 0 || tierActiveCount > 0

  const previewMutation = useMutation({
    mutationFn: async () => {
      const fundActive = condFilter.size > 0
      const techActive = techCondFilter.size > 0
      const momentumActive = tierFilters.momentum.indicators.size > 0 || tierFilters.momentum.minScore > 0
      const structureActive = tierFilters.structure.indicators.size > 0 || tierFilters.structure.minScore > 0
      const sentimentActive = tierFilters.sentiment.indicators.size > 0 || tierFilters.sentiment.minScore > 0

      const results: { label: string; syms: string[] }[] = []

      if (fundActive) {
        const res = await fetchFundamentalFilter({ include: Array.from(condFilter), limit: 2000 })
        if (!res.ok) throw new Error(res.error ?? 'Fundamental filter failed')
        results.push({ label: `${condFilter.size}F`, syms: (res.symbols ?? []).map((s) => s.symbol) })
      }
      if (techActive) {
        const res = await fetchTechnicalFilter({ include: Array.from(techCondFilter), limit: 2000 })
        if (!res.ok) throw new Error(res.error ?? 'Technical filter failed')
        results.push({ label: `${techCondFilter.size}T`, syms: (res.symbols ?? []).map((s) => s.symbol) })
      }
      if (momentumActive) {
        const f = tierFilters.momentum
        const res = await fetchMomentumFilter({
          include: f.indicators.size > 0 ? Array.from(f.indicators) : undefined,
          min_score: f.minScore > 0 ? f.minScore : undefined,
          match: f.match,
          limit: TIER_PAGE,
        })
        if (!res.ok) throw new Error(res.error ?? 'Momentum filter failed')
        if (res.truncated) throw new Error(`Momentum keeps ${res.count} names, more than one page — narrow it`)
        results.push({ label: `M(≥${f.minScore})`, syms: (res.symbols ?? []).map((s) => s.symbol) })
      }
      if (structureActive) {
        const f = tierFilters.structure
        const res = await fetchTierFilter({
          tier: 'structure',
          include: f.indicators.size > 0 ? Array.from(f.indicators) : undefined,
          min_score: f.minScore > 0 ? f.minScore : undefined,
          match: f.match,
          limit: TIER_PAGE,
        })
        if (!res.ok) throw new Error(res.error ?? 'Structure filter failed')
        if (res.truncated) throw new Error(`Structure keeps ${res.count} names, more than one page — narrow it`)
        results.push({ label: `S(≥${f.minScore})`, syms: (res.symbols ?? []).map((s) => s.symbol) })
      }
      if (sentimentActive) {
        const f = tierFilters.sentiment
        const res = await fetchTierFilter({
          tier: 'sentiment',
          include: f.indicators.size > 0 ? Array.from(f.indicators) : undefined,
          min_score: f.minScore > 0 ? f.minScore : undefined,
          match: f.match,
          limit: TIER_PAGE,
        })
        if (!res.ok) throw new Error(res.error ?? 'Sentiment filter failed')
        if (res.truncated) throw new Error(`Sentiment keeps ${res.count} names, more than one page — narrow it`)
        results.push({ label: `Se(≥${f.minScore})`, syms: (res.symbols ?? []).map((s) => s.symbol) })
      }

      const intersection = intersectSymbolLists(results.map((r) => r.syms))
      return { symbols: intersection, parts: results.map((r) => r.label).join(' ∩ ') }
    },
    onSuccess: (data) => {
      setFilterPreview(data)
      setFilterError(null)
    },
    onError: (e) => {
      setFilterError(e instanceof Error ? e.message : 'Filter failed')
      setFilterPreview(null)
    },
  })

  const previewFilter = useCallback(() => {
    if (!anyFilterActive) return
    previewMutation.mutate()
  }, [anyFilterActive, previewMutation])

  /**
   * The same preview, awaited.
   *
   * The funnel runs the preview and applies its result in one press, which
   * needs the symbols back rather than a state change to watch for — syncing
   * two pieces of state through an effect is how a cascading render starts.
   */
  const runFilter = useCallback(async (): Promise<string[] | null> => {
    if (!anyFilterActive) return null
    const data = await previewMutation.mutateAsync()
    return data.symbols
  }, [anyFilterActive, previewMutation])

  const clearFilterPreview = useCallback(() => {
    setFilterPreview(null)
  }, [])

  return {
    condFilter,
    techCondFilter,
    tierFilters,
    filterPreview,
    filterError,
    filterLoading: previewMutation.isPending,
    anyFilterActive,
    tierActiveCount,
    toggleCondFilter,
    toggleTechCondFilter,
    toggleTierIndicator,
    setTierMinScore,
    clearCondFilter,
    clearTechCondFilter,
    clearTierFilter,
    clearAllTierFilters,
    clearExtGroupFilter,
    clearSepaGroupFilter,
    clearAllFilters,
    criteria,
    restoreCriteria,
    previewFilter,
    runFilter,
    clearFilterPreview,
  }
}
