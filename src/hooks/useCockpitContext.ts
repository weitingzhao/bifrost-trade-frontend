/**
 * Session context for Cockpit Context tab (Wave RS-E1.3).
 * Two-way bound to ResearchContextBar via shared useResearchContext (URL + sessionStorage).
 */
import { useMemo } from 'react'
import { useResearchContext } from '@/hooks/useResearchContext'
import { useVrpLatest } from '@/hooks/useVrpData'
import { useCockpitPins } from '@/hooks/useCockpitPins'
import { useHypothesis } from '@/hooks/useHypotheses'
import type { LampColor } from '@/lib/researchFreshness'
import { datePrefix, todayIso } from '@/lib/researchFreshness'

function tradingDaysAgo(isoDate: string | null | undefined): number | null {
  const td = datePrefix(isoDate)
  if (!td) return null
  const target = new Date(`${td}T12:00:00`)
  const now = new Date(`${todayIso()}T12:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const diffMs = now.getTime() - target.getTime()
  return Math.max(0, Math.round(diffMs / (24 * 60 * 60 * 1000)))
}

function vrpFreshnessLamp(tradeDate: string | null | undefined, hasError: boolean): LampColor {
  if (hasError) return 'red'
  const days = tradingDaysAgo(tradeDate)
  if (days == null) return 'gray'
  if (days <= 2) return 'green'
  if (days <= 5) return 'yellow'
  return 'red'
}

export function useCockpitContext() {
  const research = useResearchContext()
  const pins = useCockpitPins()
  const vrpQ = useVrpLatest(research.symbol)
  const hypQ = useHypothesis(pins.focusedHypothesisId ?? undefined, Boolean(pins.focusedHypothesisId))

  const ivRank = vrpQ.data?.vrp_pct_252d ?? null
  const regimeTag = useMemo(() => {
    if (ivRank == null || !Number.isFinite(ivRank)) return null
    if (ivRank >= 80) return 'Elevated VRP'
    if (ivRank >= 50) return 'Neutral VRP'
    if (ivRank >= 20) return 'Compressed VRP'
    return 'Deep negative VRP'
  }, [ivRank])

  const freshnessLamp = vrpFreshnessLamp(vrpQ.data?.trade_date, vrpQ.isError)

  return {
    symbol: research.symbol,
    dateInput: research.dateInput,
    selectedDate: research.selectedDate,
    apiDate: research.apiDate,
    setSymbol: research.setSymbol,
    setDate: research.setDate,
    hasSymbol: Boolean(research.symbol),
    ivRank,
    regimeTag,
    vrpTradeDate: vrpQ.data?.trade_date ?? null,
    vrpLoading: vrpQ.isLoading,
    vrpError: vrpQ.isError,
    freshnessLamp,
    focusedHypothesisId: pins.focusedHypothesisId,
    focusedHypothesis: hypQ.data ?? null,
    focusedHypothesisLoading: hypQ.isLoading,
  }
}
