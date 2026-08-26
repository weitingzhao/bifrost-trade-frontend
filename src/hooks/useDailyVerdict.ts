import { useMemo } from 'react'
import type {
  EventRadarRow,
  ForecastSession,
  GexIntraday,
  MomentumScore,
  SepaScoreRow,
  TerrainData,
} from '@/api/researchEngine'
import type { IvPercentileRow } from '@/types/ivRadar'
import { freshnessLamp, ivBucket, type LampColor } from '@/lib/researchFreshness'

export interface VerdictSegment {
  label: string
  text: string
  lamp: LampColor
  to?: string
  meta?: string | null
}

export interface DailyVerdict {
  narrative: VerdictSegment
  risk: VerdictSegment
  opportunity: VerdictSegment
  actionHint: { label: string; to: string }
  sourcesUsed: string[]
}

export interface DailyVerdictInput {
  symbol: string
  selectedDate: string
  events: EventRadarRow[]
  eventsError: boolean
  sepaCandidates: SepaScoreRow[]
  sepaError: boolean
  sepaTradeDate?: string | null
  momRows: MomentumScore[]
  momError: boolean
  momTradeDate?: string | null
  ivRow: IvPercentileRow | null
  ivError: boolean
  terrain: TerrainData | undefined
  terrainError: boolean
  gexLatest: GexIntraday | null
  gexError: boolean
  forecastLatest: ForecastSession | null
  forecastError: boolean
}

function spotVsClose(spot: number, close: number): string {
  const pct = ((close - spot) / Math.max(spot, 1)) * 100
  const dir = pct >= 0 ? 'above' : 'below'
  return `spot ${spot.toFixed(2)} ${dir} E[close] ${close.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`
}

export function useDailyVerdict(input: DailyVerdictInput): DailyVerdict {
  return useMemo(() => {
    const {
      symbol,
      selectedDate,
      events,
      eventsError,
      sepaCandidates,
      sepaError,
      sepaTradeDate,
      momRows,
      momError,
      momTradeDate,
      ivRow,
      ivError,
      terrain,
      terrainError,
      gexLatest,
      gexError,
      forecastLatest,
      forecastError,
    } = input

    const sourcesUsed: string[] = []
    if (terrain) sourcesUsed.push('Terrain')
    if (forecastLatest) sourcesUsed.push('Forecast')
    if (events.length > 0) sourcesUsed.push('Events')
    if (gexLatest) sourcesUsed.push('GEX')
    if (ivRow) sourcesUsed.push('IV')
    if (sepaCandidates.length > 0) sourcesUsed.push('SEPA')
    if (momRows.length > 0) sourcesUsed.push('Momentum')

    const terrainLamp = freshnessLamp(terrain?.trade_date, selectedDate, terrainError, terrain != null)
    const forecastLamp = freshnessLamp(
      forecastLatest?.trade_date,
      selectedDate,
      forecastError,
      forecastLatest != null,
    )
    const eventsLamp = freshnessLamp(
      events[0]?.collected_at ?? events[0]?.computed_at,
      selectedDate,
      eventsError,
      events.length > 0,
    )
    const gexLamp = freshnessLamp(
      gexLatest?.trade_date ?? gexLatest?.asof_ts,
      selectedDate,
      gexError,
      gexLatest != null,
    )
    const ivLamp = freshnessLamp(ivRow?.trade_date, selectedDate, ivError, ivRow != null)
    const sepaLamp = freshnessLamp(
      sepaTradeDate ?? sepaCandidates[0]?.trade_date,
      selectedDate,
      sepaError,
      sepaCandidates.length > 0,
    )
    const momLamp = freshnessLamp(
      momTradeDate || momRows[0]?.trade_date,
      selectedDate,
      momError,
      momRows.length > 0,
    )

    let narrativeText: string
    let narrativeLamp: LampColor
    let narrativeTo = '/research/analysis-model'

    if (terrain) {
      narrativeText = `${symbol} ${terrain.regime} — ${spotVsClose(terrain.spot, terrain.expected_close)}`
      narrativeLamp = terrainLamp
    } else if (forecastLatest) {
      narrativeText = `${symbol} ${forecastLatest.regime} — E[close] ${forecastLatest.expected_close.toFixed(2)}`
      narrativeLamp = forecastLamp
      narrativeTo = '/research/forecast-sessions'
    } else {
      narrativeText = `No terrain narrative for ${symbol}`
      narrativeLamp = terrainError ? 'red' : 'gray'
    }

    let riskText: string
    let riskLamp: LampColor
    let riskTo = '/research/event-radar'

    const highEvent = events.find((e) => (e.importance ?? 0) >= 3)
    if (highEvent) {
      riskText = highEvent.subject || highEvent.event_summary || highEvent.theme || 'High-importance event'
      riskLamp = eventsLamp
    } else if (gexLatest && gexLatest.spot > 0) {
      const distPut =
        ((gexLatest.spot - gexLatest.major_put_wall) / gexLatest.spot) * 100
      if (distPut < 0.5) {
        riskText = `Near put wall ${gexLatest.major_put_wall.toFixed(0)} (${distPut.toFixed(2)}% from spot)`
        riskLamp = gexLamp
        riskTo = '/research/gex-intraday'
      } else if (ivRow?.iv_rank_1y != null && Number.isFinite(ivRow.iv_rank_1y)) {
        const bucket = ivBucket(ivRow.iv_rank_1y)
        if (bucket === 'High' || bucket === 'Low') {
          riskText = `IV rank ${ivRow.iv_rank_1y.toFixed(0)} — ${bucket} vol regime`
          riskLamp = ivLamp
          riskTo = '/research/iv-radar'
        } else {
          riskText = 'No elevated event or GEX tail risk flagged'
          riskLamp = 'green'
        }
      } else {
        riskText = 'No elevated event or GEX tail risk flagged'
        riskLamp = 'green'
      }
    } else if (ivRow?.iv_rank_1y != null && Number.isFinite(ivRow.iv_rank_1y)) {
      const bucket = ivBucket(ivRow.iv_rank_1y)
      riskText = `IV rank ${ivRow.iv_rank_1y.toFixed(0)} — ${bucket}`
      riskLamp = ivLamp
      riskTo = '/research/iv-radar'
    } else {
      riskText = 'No risk signals loaded'
      riskLamp = eventsError || gexError || ivError ? 'red' : 'gray'
    }

    let opportunityText: string
    let opportunityLamp: LampColor
    let opportunityTo = '/research/sepa-daily-core'

    const setupFirst = sepaCandidates.find((r) => r.path === 'SETUP')
    const pivotFirst = sepaCandidates.find((r) => r.path === 'PIVOT')
    const sepaPick = setupFirst ?? pivotFirst ?? sepaCandidates[0]

    if (sepaPick) {
      opportunityText = `SEPA ${sepaPick.symbol} ${sepaPick.path} · grade ${sepaPick.grade}`
      opportunityLamp = sepaLamp
    } else {
      const aPlus = momRows.find((r) => r.grade === 'A+')
      if (aPlus) {
        opportunityText = `Momentum ${aPlus.symbol} A+ · score ${aPlus.score.toFixed(0)}`
        opportunityLamp = momLamp
        opportunityTo = '/research/momentum-radar'
      } else {
        opportunityText = 'No SEPA / Momentum opportunity today'
        opportunityLamp = sepaError || momError ? 'red' : 'gray'
      }
    }

    const actionHint = { label: 'Open narrative', to: narrativeTo }
    if (riskLamp === 'red' || riskLamp === 'yellow') {
      actionHint.label = 'Review risk'
      actionHint.to = riskTo
    } else if (opportunityLamp === 'green' && sepaPick) {
      actionHint.label = 'View opportunity'
      actionHint.to = opportunityTo
    }

    return {
      narrative: {
        label: 'Main narrative',
        text: narrativeText,
        lamp: narrativeLamp,
        to: narrativeTo,
      },
      risk: {
        label: 'Key risk',
        text: riskText,
        lamp: riskLamp,
        to: riskTo,
      },
      opportunity: {
        label: 'Opportunity',
        text: opportunityText,
        lamp: opportunityLamp,
        to: opportunityTo,
      },
      actionHint,
      sourcesUsed,
    }
  }, [input])
}
