/* eslint-disable react-hooks/set-state-in-effect -- sync expiration/strike selection when symbol or filter changes */
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchOptionExpirations } from '@/api/research/optionDiscovery'
import { QUERY_KEYS } from '@/constants/queryKeys'
import {
  type ExpirationKind,
  classifyExpiration,
  isOptionExpirationPastNyClose,
} from '@/utils/optionDiscovery/expirationMeta'

export function useDiscoveryExpirations(
  selectedSymbol: string,
  selectedExpiration: string,
  setSelectedExpiration: Dispatch<SetStateAction<string>>,
) {
  const sym = selectedSymbol.trim()
  const [expirationFilterKind, setExpirationFilterKind] = useState<ExpirationKind>('all')
  const [multiSelectStrikes, setMultiSelectStrikes] = useState<number[]>([])
  const qc = useQueryClient()

  const listQuery = useQuery({
    queryKey: [...QUERY_KEYS.research.discovery.expirations, sym, 'list'],
    queryFn: async () => {
      const res = await fetchOptionExpirations(sym, 'massive')
      return res
    },
    enabled: sym.length > 0,
    staleTime: 30_000,
  })

  const exp = selectedExpiration.trim()
  const strikesQuery = useQuery({
    queryKey: [...QUERY_KEYS.research.discovery.expirations, sym, 'strikes', exp],
    queryFn: async () => fetchOptionExpirations(sym, 'massive', { expiration: exp }),
    enabled: sym.length > 0 && exp.length > 0,
    staleTime: 30_000,
  })

  const expirations = sym.length > 0 ? (listQuery.data?.expirations ?? []) : []
  const stockDayLastPrice =
    strikesQuery.data?.last_price ?? listQuery.data?.last_price ?? null
  const strikes = strikesQuery.data?.strikes ?? []
  const expirationsLoading = listQuery.isLoading || listQuery.isFetching
  const strikesLoading = strikesQuery.isLoading || strikesQuery.isFetching
  const expirationsError =
    sym.length > 0
      ? (listQuery.data?.error ?? (listQuery.isError ? 'Failed to load expirations' : null))
      : null

  const visibleExpirations = useMemo(() => {
    const byKind =
      expirationFilterKind === 'all'
        ? expirations
        : expirations.filter(e => classifyExpiration(e) === expirationFilterKind)
    return byKind.filter(e => !isOptionExpirationPastNyClose(e))
  }, [expirations, expirationFilterKind])

  const invalidateForSymbol = useCallback(() => {
    void qc.invalidateQueries({ queryKey: [...QUERY_KEYS.research.discovery.expirations, sym] })
  }, [qc, sym])

  useEffect(() => {
    setMultiSelectStrikes([])
    if (!sym) {
      setSelectedExpiration('')
      return
    }
    void qc.invalidateQueries({ queryKey: [...QUERY_KEYS.research.discovery.expirations, sym] })
  }, [sym, setSelectedExpiration, qc])

  useEffect(() => {
    setMultiSelectStrikes([])
  }, [exp])

  useEffect(() => {
    if (visibleExpirations.length === 0) {
      setSelectedExpiration('')
      return
    }
    setSelectedExpiration(prev =>
      visibleExpirations.includes(prev) ? prev : visibleExpirations[0],
    )
  }, [visibleExpirations, setSelectedExpiration])

  return {
    expirations,
    strikes,
    stockDayLastPrice,
    expirationsLoading,
    strikesLoading,
    expirationsError,
    expirationFilterKind,
    setExpirationFilterKind,
    visibleExpirations,
    multiSelectStrikes,
    setMultiSelectStrikes,
    invalidateForSymbol,
    refetchExpirations: () => void listQuery.refetch(),
  }
}
