import { useCallback, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchFundamentalDistributionSymbols,
  fetchFundamentalFilter,
  fetchSepaCriteriaStats,
  fetchTechnicalDistributionSymbols,
  fetchTechnicalFilter,
} from '@/api/research/dataReadiness'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { DistVariant } from '@/types/stockScreener'

export function useStockScreenerCriteria() {
  const query = useQuery({
    queryKey: QUERY_KEYS.research.stockScreener.criteriaStats,
    queryFn: async () => {
      const res = await fetchSepaCriteriaStats()
      if (!res.ok) throw new Error(res.error ?? 'Failed to load criteria stats')
      return res
    },
    staleTime: 60_000,
  })

  const qc = useQueryClient()
  const refetch = useCallback(() => {
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.research.stockScreener.criteriaStats })
  }, [qc])

  return { ...query, refetch }
}

export function useDistributionBucketLoader(
  variant: DistVariant,
  onSymbolsLoaded: (symbols: string[]) => void,
) {
  const [activeBucket, setActiveBucket] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedCount, setLoadedCount] = useState<number | null>(null)
  const cacheRef = useRef<Map<number, string[]>>(new Map())

  const loadBucket = useCallback(async (n: number, isActivating: boolean) => {
    if (!isActivating) return
    const cached = cacheRef.current.get(n)
    if (cached) {
      onSymbolsLoaded(cached)
      setLoadedCount(cached.length)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    setLoadedCount(null)
    try {
      const res = variant === 'fund'
        ? await fetchFundamentalDistributionSymbols(n)
        : await fetchTechnicalDistributionSymbols(n)
      if (!res.ok) throw new Error(res.error ?? 'Failed')
      const syms = (res.symbols ?? []).map((s) => s.symbol)
      cacheRef.current.set(n, syms)
      onSymbolsLoaded(syms)
      setLoadedCount(syms.length)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }, [variant, onSymbolsLoaded])

  const handleBucketClick = useCallback((n: number, count: number) => {
    if (count === 0) return
    const isActivating = activeBucket !== n
    setActiveBucket(isActivating ? n : null)
    void loadBucket(n, isActivating)
  }, [activeBucket, loadBucket])

  const clearActive = useCallback(() => {
    setActiveBucket(null)
    setLoadedCount(null)
    setError(null)
  }, [])

  return {
    activeBucket,
    loading,
    error,
    loadedCount,
    handleBucketClick,
    clearActive,
    setActiveBucket,
  }
}

export function useConditionPassLoader(
  variant: DistVariant,
  onSymbolsLoaded: (symbols: string[]) => void,
) {
  const [activeConditionId, setActiveConditionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedCount, setLoadedCount] = useState<number | null>(null)
  const cacheRef = useRef<Map<string, string[]>>(new Map())

  const loadCondition = useCallback(async (id: string, isActivating: boolean) => {
    if (!isActivating) return
    const cached = cacheRef.current.get(id)
    if (cached) {
      onSymbolsLoaded(cached)
      setLoadedCount(cached.length)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    setLoadedCount(null)
    try {
      const res = variant === 'fund'
        ? await fetchFundamentalFilter({ include: [id], limit: 2000 })
        : await fetchTechnicalFilter({ include: [id], limit: 2000 })
      if (!res.ok) throw new Error(res.error ?? 'Failed')
      const syms = (res.symbols ?? []).map((s) => s.symbol)
      cacheRef.current.set(id, syms)
      onSymbolsLoaded(syms)
      setLoadedCount(syms.length)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }, [variant, onSymbolsLoaded])

  const handleConditionClick = useCallback((id: string, passCount: number) => {
    if (passCount <= 0) return
    const isActivating = activeConditionId !== id
    setActiveConditionId(isActivating ? id : null)
    void loadCondition(id, isActivating)
  }, [activeConditionId, loadCondition])

  const clearActive = useCallback(() => {
    setActiveConditionId(null)
    setLoadedCount(null)
    setError(null)
  }, [])

  return {
    activeConditionId,
    loading,
    error,
    loadedCount,
    handleConditionClick,
    clearActive,
  }
}
