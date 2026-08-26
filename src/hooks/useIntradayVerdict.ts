import { useMemo } from 'react'
import type { TerrainIntraday } from '@/api/researchEngine'
import {
  invalidateLine,
  liveScenario,
  SCENARIO_LABELS,
  type ScenarioKind,
} from '@/lib/intradayPlaybook'

export interface IntradayVerdict {
  headline: string
  biasTag: string
  mechanism: string
  invalidate: string
  liveKind: ScenarioKind | null
  liveProbability: number | null
}

export function useIntradayVerdict(latest: TerrainIntraday | null): IntradayVerdict {
  return useMemo(() => {
    if (!latest) {
      return {
        headline: 'No intraday terrain',
        biasTag: '—',
        mechanism: '—',
        invalidate: '—',
        liveKind: null,
        liveProbability: null,
      }
    }

    const liveKind = liveScenario(latest)
    const liveLabel = SCENARIO_LABELS[liveKind]
    const liveProb =
      liveKind === 'rangy'
        ? latest.prob_rangy
        : liveKind === 'bull'
          ? latest.prob_bull
          : liveKind === 'bear'
            ? latest.prob_bear
            : latest.prob_squeeze

    const headline = `LIVE ${liveLabel} ${(liveProb * 100).toFixed(0)}% · spot ${latest.spot.toFixed(2)}`

    return {
      headline,
      biasTag: latest.regime,
      mechanism: liveLabel,
      invalidate: invalidateLine(liveKind, latest),
      liveKind,
      liveProbability: liveProb,
    }
  }, [latest])
}
