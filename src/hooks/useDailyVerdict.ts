/**
 * The Daily Brief verdict as the page renders it — the server's verdict with
 * the research context carried into every hub link. research-loop-automation
 * C3 removed the client-side fallback rules: the brief has one source.
 */
import { useMemo } from 'react'
import type { DailyBriefSynth } from '@/api/researchEngine'
import { contextJoiner, mapDailyVerdict, type DailyVerdict, type VerdictSegment } from '@/lib/dailyBrief'

export type { DailyVerdict, VerdictSegment }

export function useDailyVerdict(
  synth: DailyBriefSynth | undefined,
  symbol: string,
  dateInput?: string | null,
): { verdict: DailyVerdict | null; withContext: (path: string) => string } {
  return useMemo(() => {
    const withContext = contextJoiner(symbol, dateInput)
    return { verdict: synth ? mapDailyVerdict(synth, withContext) : null, withContext }
  }, [synth, symbol, dateInput])
}
