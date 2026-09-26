/**
 * Everything the Symbol page reads about one name, once.
 *
 * The identity line, the face lamps, the six cards and the record rail are four
 * views of the same batch, and they used to reach for it separately — the
 * Overview body called `useDossier` while the header called it again for the
 * tab dots. One hook, one `specOf`, one set of face views: a lamp on a tab and
 * the card it opens cannot disagree.
 *
 * `drove` comes from the **list**, not from a computation here. The design's
 * sub-line reads "volatility drove the rating" or "trend drove the screen"
 * depending on which ranked table you arrived from, and that is the honest
 * source: the list that put the name in front of you is the thing that decided
 * what was interesting about it. Typed straight into the box, nothing drove it.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ExpectedEarnings } from '@/api/research/narrative'
import { fetchSepaDaily } from '@/api/researchEngine'
import { useDossier } from '@/hooks/useDossier'
import { useEarningsDates } from '@/hooks/useNarrative'
import { useAtmIvTerm } from '@/hooks/useVolSurfaceData'
import { todayIso } from '@/lib/researchFreshness'
import { eventMove } from '@/utils/earningsEstimate'
import { daysTo } from '@/utils/optionTicker'
import { useLensRegistry } from '@/hooks/useLensRegistry'
import { usePortfolioSymbols } from '@/hooks/usePortfolioSymbols'
import { useSymbolTrail } from '@/lib/symbolTrail'
import {
  DOSSIER_FACES,
  RATING_FACE_IDS,
  faceView,
  type DossierFaceId,
  type DossierFaceView,
} from '@/lib/dossier'
import { symbolRecord, type SymbolRecord } from '@/lib/symbolRecord'
import { finiteOrNull } from '@/utils/finite'
import { GROWTH_CHECKS, TREND_CHECKS, faceExtras, type SepaCounts } from './faceExtras'

export interface SymbolFaces {
  views: DossierFaceView[]
  record: SymbolRecord
  /** The face the list that ranked this name was ranking on, when there was one. */
  drove: DossierFaceId | null
  /** Decisive rating lenses over rating lenses read — the design's `3 of 8`. */
  decisive: { n: number; of: number }
  held: boolean
  watched: boolean
  /** The next print, estimated by Research; null without one (or before it answers). */
  earnings: ExpectedEarnings | null
  loading: boolean
  failed: string[]
}

export function useSymbolFaces(symbol: string): SymbolFaces {
  const registry = useLensRegistry()
  const { exhibits, loading, failed } = useDossier(symbol)
  const portfolio = usePortfolioSymbols()
  const trail = useSymbolTrail(symbol)
  const earnQ = useEarningsDates(symbol)
  // The print's priced move, read off the ATM term around it (a late print has no date to split at).
  const termQ = useAtmIvTerm(symbol)

  /* The one reading the exhibits cannot give: the trend template as a count of
     checks passed rather than a percentage of them. */
  const sepa = useQuery({
    queryKey: ['research', 'sepa', 'model-daily', 'symbol', symbol],
    queryFn: () => fetchSepaDaily({ symbol, limit: 1 }),
    enabled: symbol.trim() !== '',
    staleTime: 5 * 60_000,
  })

  return useMemo(() => {
    const specOf = (canonical: string) =>
      registry.data?.lenses.find((l) => l.id === canonical)
    const held = portfolio.isHolding(symbol)
    const watched = portfolio.isWatchlist(symbol)
    const row = (sepa.data?.rows ?? [])[0]
    const counts: SepaCounts | null = row
      ? {
          techPass: finiteOrNull(row.tech_pass_count),
          techOf: TREND_CHECKS,
          fundPass: finiteOrNull(row.fund_pass_count),
          fundOf: GROWTH_CHECKS,
        }
      : null
    const next = earnQ.data?.expected_next ?? null
    const today = todayIso()
    const gap =
      next && next.days_away >= 0
        ? eventMove(
            (termQ.data?.term ?? []).map((p) => ({ expiry: p.expiry, dte: daysTo(p.expiry, today) ?? 0, iv: p.atm_iv })),
            next.days_away
          )
        : null
    const earnings = earnQ.data ? { next, filings: earnQ.data.filings, gap } : null
    const extras = faceExtras(exhibits, { held, watched, sepa: counts, earnings })
    const views = DOSSIER_FACES.map((face) =>
      faceView(face, exhibits, symbol, specOf, extras[face.id]),
    )
    const rating = views.filter((v) => RATING_FACE_IDS.includes(v.face.id))
    const ratingRows = rating.flatMap((v) => v.rows.filter((r) => r.band != null))
    return {
      views,
      record: symbolRecord(exhibits, symbol, specOf),
      drove: (trail?.drove ?? null) as DossierFaceId | null,
      decisive: {
        n: ratingRows.filter((r) => r.band === 'hot' || r.band === 'cold').length,
        of: rating.reduce((n, v) => n + v.face.lenses.length, 0),
      },
      held,
      watched,
      earnings: earnQ.data?.expected_next ?? null,
      loading: loading || registry.isLoading,
      failed,
    }
  }, [
    exhibits,
    failed,
    loading,
    portfolio,
    registry.data,
    registry.isLoading,
    sepa.data,
    earnQ.data,
    termQ.data,
    symbol,
    trail,
  ])
}
