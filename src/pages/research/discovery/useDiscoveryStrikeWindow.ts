import { useEffect, useMemo, useRef } from 'react'
import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import { normalizeOptionRight } from '@/utils/optionDiscovery/optionContractMetrics'
import {
  computeStrikesFromPreset,
  type StdDevOption,
  type StrikeCountOption,
} from '@/utils/optionDiscovery/strikePresets'
import type { StrikeOiPair } from '@/components/optionDiscovery/StrikeLadderPanel'

type Params = {
  strikes: number[]
  stockDayLastPrice: number | null
  strikeCountOption: StrikeCountOption
  stdDevOption: StdDevOption
  customStdDev: string
  multiSelectStrikes: number[]
  snapshotRows: OptionSnapshotRow[]
}

export function useDiscoveryStrikeWindow({
  strikes,
  stockDayLastPrice,
  strikeCountOption,
  stdDevOption,
  customStdDev,
  multiSelectStrikes,
  snapshotRows,
}: Params) {
  const otmCallWrapRef = useRef<HTMLDivElement>(null)

  const stdDevValue = useMemo(() => {
    if (stdDevOption === 'custom') {
      const v = parseFloat(customStdDev)
      return Number.isFinite(v) && v > 0 ? v : 2
    }
    return Number(stdDevOption)
  }, [stdDevOption, customStdDev])

  const computedStrikes = useMemo(
    () => computeStrikesFromPreset(strikes, stockDayLastPrice, strikeCountOption, stdDevValue),
    [strikes, stockDayLastPrice, strikeCountOption, stdDevValue],
  )

  const effectiveStrikes = useMemo(() => {
    if (multiSelectStrikes.length > 0) return multiSelectStrikes
    return computedStrikes
  }, [multiSelectStrikes, computedStrikes])

  const strikeOiByStrike = useMemo(() => {
    const m = new Map<number, StrikeOiPair>()
    for (const r of snapshotRows) {
      if (!Number.isFinite(r.strike)) continue
      const k = r.strike
      if (!m.has(k)) m.set(k, { c: null, p: null })
      const e = m.get(k)!
      const nr = normalizeOptionRight(r.right)
      const oi = r.open_interest != null && Number.isFinite(r.open_interest) ? r.open_interest : null
      if (nr === 'C') e.c = oi
      if (nr === 'P') e.p = oi
    }
    return m
  }, [snapshotRows])

  const ladderOiMax = useMemo(() => {
    let max = 1
    for (const k of computedStrikes) {
      const o = strikeOiByStrike.get(k)
      if (!o) continue
      if (o.c != null) max = Math.max(max, o.c)
      if (o.p != null) max = Math.max(max, o.p)
    }
    return max
  }, [computedStrikes, strikeOiByStrike])

  const strikesWatchKey = useMemo(
    () => effectiveStrikes.map(x => String(x)).join(','),
    [effectiveStrikes],
  )

  useEffect(() => {
    const el = otmCallWrapRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [computedStrikes])

  return {
    stdDevValue,
    computedStrikes,
    effectiveStrikes,
    strikeOiByStrike,
    ladderOiMax,
    strikeLadderShowOi: snapshotRows.length > 0,
    strikesWatchKey,
    otmCallWrapRef,
  }
}
