import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchTickerOverview,
  fetchSymbolFundamentalConditions,
  fetchSymbolTechnicalConditions,
  fetchSymbolFundRawData,
} from '@/api/research'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { StockInspectorFundamentalSeed } from '@/types/research'
import { SEPA_FUND_ORDER, SEPA_TECH_ORDER } from '@/components/stockInspector/stockInspectorCatalog'

export interface DisplayCondition {
  id: string
  label: string
  pass: boolean
  actual: number | string | null
  threshold: number | string | null
  reason: string | null
  source: 'api' | 'seed' | 'placeholder'
}

export function useStockInspector(
  symbol: string,
  fundamentalSeed?: StockInspectorFundamentalSeed,
) {
  const sym = symbol.trim().toUpperCase()

  const overview = useQuery({
    queryKey: QUERY_KEYS.research.tickerOverview(sym),
    queryFn: () => fetchTickerOverview(sym),
    staleTime: 600_000,
    retry: 0,
    enabled: !!sym,
  })

  const fund = useQuery({
    queryKey: QUERY_KEYS.research.fundConditions(sym),
    queryFn: () => fetchSymbolFundamentalConditions(sym),
    staleTime: 300_000,
    retry: 0,
    enabled: !!sym,
  })

  const tech = useQuery({
    queryKey: QUERY_KEYS.research.techConditions(sym),
    queryFn: () => fetchSymbolTechnicalConditions(sym),
    staleTime: 300_000,
    retry: 0,
    enabled: !!sym,
  })

  const raw = useQuery({
    queryKey: QUERY_KEYS.research.fundRaw(sym),
    queryFn: () => fetchSymbolFundRawData(sym),
    staleTime: 300_000,
    retry: 0,
    enabled: !!sym,
  })

  const displayFundConditions = useMemo((): DisplayCondition[] => {
    const apiById = new Map(
      (fund.data?.conditions ?? []).map((c) => [c.id, c]),
    )
    const seedSet = new Set(fundamentalSeed?.passedConditions ?? [])
    return SEPA_FUND_ORDER.map(({ id, label }) => {
      const api = apiById.get(id)
      if (api) {
        return {
          id,
          label,
          pass: api.pass,
          actual: api.actual,
          threshold: api.threshold,
          reason: api.reason,
          source: 'api' as const,
        }
      }
      if (fundamentalSeed) {
        return {
          id,
          label,
          pass: seedSet.has(id),
          actual: null,
          threshold: null,
          reason: null,
          source: 'seed' as const,
        }
      }
      return {
        id,
        label,
        pass: false,
        actual: null,
        threshold: null,
        reason: null,
        source: 'placeholder' as const,
      }
    })
  }, [fund.data, fundamentalSeed])

  const displayTechConditions = useMemo((): DisplayCondition[] => {
    const apiById = new Map(
      (tech.data?.conditions ?? []).map((c) => [c.id, c]),
    )
    return SEPA_TECH_ORDER.map(({ id, label }) => {
      const api = apiById.get(id)
      if (api) {
        return {
          id,
          label,
          pass: api.pass,
          actual: api.actual,
          threshold: api.threshold,
          reason: api.reason,
          source: 'api' as const,
        }
      }
      return {
        id,
        label,
        pass: false,
        actual: null,
        threshold: null,
        reason: null,
        source: 'placeholder' as const,
      }
    })
  }, [tech.data])

  const fundPassCount = fund.data?.pass_count ?? fundamentalSeed?.passCount ?? null
  const techPassCount = tech.data?.pass_count ?? null
  const fundOverallPass = fund.data?.fundamental_pass ?? (fundPassCount === 8 ? true : null)
  const techOverallPass = tech.data?.technical_pass ?? (techPassCount === 11 ? true : null)
  const hasFundData = fund.data?.found === true || fundamentalSeed != null
  const hasTechData = tech.data?.found === true || (tech.data?.conditions?.length ?? 0) > 0

  const extFundConditions = useMemo(
    () => (fund.data?.conditions ?? []).filter((c) => c.group && c.group !== 'sepa_core'),
    [fund.data?.conditions],
  )

  return {
    sym,
    overview,
    fund,
    tech,
    raw,
    displayFundConditions,
    displayTechConditions,
    fundPassCount,
    techPassCount,
    fundOverallPass,
    techOverallPass,
    hasFundData,
    hasTechData,
    extFundConditions,
  }
}
