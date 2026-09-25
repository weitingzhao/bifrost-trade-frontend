/**
 * History — `/research/history`, one name against its own past.
 *
 * Walked 2026-09-23 against `Research History.dc.html` (Rev 2026-09-17.1),
 * in the prototype's order: IV vs realized across the page, then the vol
 * cone, earnings moves and correlation over time side by side.
 *
 * Earnings moves (2026-09-25) read `/analytics/vol/earnings-moves`: the
 * name's 8-K Item 2.02 filings are the print dates, the straddle the session
 * before is what was priced, and the same prints dash the IV chart. A name
 * outside the plugin's 8-K list says so in the panel instead of drawing nothing.
 * Correlation over time reads Research's matrix as of each session (0.124.0).
 */
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageFaceSwitch, PageHeader, PageShell, SectionPanel } from '@/components/layout'
import { HistoryCorrelation } from './HistoryCorrelation'
import { HistoryEarnings } from './HistoryEarnings'
import { printMarks } from './earningsText'
import { SegmentControl } from '@/components/data-display'
import { VrpTimeSeriesChart } from '@/components/charts/VrpTimeSeriesChart'
import { SymbolContextGuard } from '@/components/research/SymbolContextGuard'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchIvVolatilityCone } from '@/api/research/optionDiscovery'
import { useResearchContext } from '@/hooks/useResearchContext'
import { useEarningsDates } from '@/hooks/useNarrative'
import { useEarningsMoves, useRvCone, useVrpHistory } from '@/hooks/useVrpData'
import { ordinal } from '@/lib/analyzeDepth'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import {
  HISTORY_WINDOWS,
  coneRows,
  coneStory,
  coverageLine,
  isHistoryWindow,
  suspectLine,
  eventLine,
  ivReading,
  MARKET_IV_SYMBOL,
  type IvEventContext,
  signedVolPts,
  volPts,
  windowRows,
  type HistoryWindow,
  type TermPoint,
} from '@/utils/ivHistory'
import { VolCone } from '@/components/research/VolCone'

const PATH = '/research/history'

/** The vrp store answers 251 sessions today; asking for the design's 2y keeps the page honest the day it holds more. */
const FETCH_DAYS = 504
const CONE_YEARS = 2
/** The design's count; eight prints is about the 2y window. */
const PRINTS = 8

const WINDOW_OPTIONS = HISTORY_WINDOWS.map((w) => ({ value: w, label: w }))

const LINK = 'text-primary hover:underline'

export default function HistoryPage() {
  const { symbol } = useResearchContext()
  const sym = (symbol ?? '').trim().toUpperCase()
  const [params, setParams] = useSearchParams()
  const win: HistoryWindow = isHistoryWindow(params.get('win')) ? (params.get('win') as HistoryWindow) : '6m'

  const setWin = (v: string) => {
    const next = new URLSearchParams(params)
    if (v === '6m') next.delete('win')
    else next.set('win', v)
    setParams(next, { replace: true })
  }

  return (
    <PageShell padding="compact" className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 max-w-[84ch] flex-[1_1_28rem]">
          <PageHeader
            breadcrumb={<p className="text-xs font-medium text-primary/90">Research · Analyze</p>}
            title={
              <span className="inline-flex items-baseline gap-3">
                History
                {sym ? (
                  // The name is its own destination: its Symbol page.
                  <Link
                    to={withSymbolParam(SYMBOL_PATH, sym)}
                    className="font-mono text-dense-body font-bold text-entity-symbol hover:underline"
                  >
                    {sym}
                  </Link>
                ) : null}
              </span>
            }
            description="What today's numbers look like against their own past."
          />
        </div>
        <span className="ml-auto mt-1 flex flex-none flex-wrap items-center gap-2.5">
          <PageFaceSwitch path={PATH} />
          <SegmentControl size="xs" ariaLabel="Window" value={win} onChange={setWin} options={WINDOW_OPTIONS} />
          {/* The design's second way to the method face, live since it was
              built (2026-09-24) — the ⧉ switch beside the header is the first. */}
          <Link
            to="/research/lab/history"
            className="whitespace-nowrap font-mono text-dense-meta text-primary hover:underline"
            title="The Method face — window, estimator, percentile definition — with this reading held fixed."
          >
            Method → window · estimator
          </Link>
        </span>
      </div>

      <SymbolContextGuard symbol={sym} description="History reads one name against its own past. Pick a symbol, then come back here.">
        <HistoryBody sym={sym} win={win} />
      </SymbolContextGuard>
    </PageShell>
  )
}

function HistoryBody({ sym, win }: { sym: string; win: HistoryWindow }) {
  const vrp = useVrpHistory(sym, FETCH_DAYS)
  const cone = useRvCone(sym, CONE_YEARS)
  const term = useQuery({
    queryKey: ['research', 'history', 'atm-term', sym],
    queryFn: () => fetchIvVolatilityCone(sym, [], 'massive', 90),
    enabled: Boolean(sym),
    staleTime: 5 * 60_000,
  })

  // The market's IV30 and the name's earnings dates tell a sharp move from a store
  // fault; until they arrive the rule judges without them, which only withholds more.
  const market = useVrpHistory(sym === MARKET_IV_SYMBOL ? '' : MARKET_IV_SYMBOL, FETCH_DAYS)
  const earnings = useEarningsDates(sym)
  const moves = useEarningsMoves(sym, PRINTS)
  const marks = useMemo(() => printMarks(moves.data), [moves.data])
  const ctx = useMemo<IvEventContext>(
    () => ({ market: sym === MARKET_IV_SYMBOL ? undefined : market.data, earnings: earnings.data?.dates }),
    [sym, market.data, earnings.data]
  )
  const reading = useMemo(() => ivReading(vrp.data ?? [], win, ctx), [vrp.data, win, ctx])
  const chartRows = useMemo(() => windowRows(vrp.data ?? [], win), [vrp.data, win])
  const coverage = coverageLine(reading)
  const suspect = suspectLine(reading)
  const event = eventLine(reading)

  const termPoints = useMemo<TermPoint[]>(
    () =>
      (term.data?.ok ? term.data.points : [])
        .filter((p) => p.dte_days != null && p.atm_iv != null)
        .map((p) => ({ dte: p.dte_days as number, iv: p.atm_iv as number })),
    [term.data],
  )
  const cRows = useMemo(() => coneRows(cone.data?.tenors ?? [], termPoints), [cone.data, termPoints])

  return (
    <div className="space-y-3">
      {/* ── IV vs realized ─────────────────────────────────────────── */}
      <SectionPanel
        cap="IV vs realized"
        title={
          <span className="font-mono tabular-nums">
            IV30 {volPts(reading.iv30)} · RV20 {volPts(reading.rv20)} · VRP{' '}
            <span className={cn(reading.vrp20 != null && reading.vrp20 > 0 ? 'text-success' : reading.vrp20 != null && reading.vrp20 < 0 ? 'text-danger' : '')}>
              {signedVolPts(reading.vrp20)}
            </span>
          </span>
        }
        note={
          <span title="Share of the window's IV30 readings at or below today's. A percentile, not iv_rank (position between the extremes) — the two are different numbers.">
            {reading.percentile != null
              ? `${ordinal(reading.percentile)} percentile of this window (${reading.ivPoints} readings)`
              : reading.suspects.length > 0
                ? `no percentile — ${reading.suspects.length} suspect IV30 readings in this window`
                : `no percentile — ${reading.ivPoints} IV30 readings in this window`}
            {reading.asOf ? ` · as of ${reading.asOf}` : ''}
          </span>
        }
      >
        <div className="space-y-2 px-3 py-3">
          {vrp.isLoading ? (
            <Skeleton className="h-48 rounded" />
          ) : vrp.isError ? (
            <QueryErrorAlert error={vrp.error} onRetry={() => void vrp.refetch()} />
          ) : (
            <>
              {coverage ? (
                <p className="text-dense-meta text-warning" role="note">
                  {coverage}
                </p>
              ) : null}
              {suspect ? (
                <p className="max-w-[110ch] text-dense-meta text-warning" role="note">
                  {suspect}
                </p>
              ) : null}
              {event ? (
                <p className="max-w-[110ch] text-dense-meta text-muted-foreground" role="note">
                  {event}
                </p>
              ) : null}
              <VrpTimeSeriesChart
                rows={chartRows}
                realized="rv_20d"
                // Close to the panel's own width at a desktop pane, so the
                // viewBox scales by about one and the axis text stays its size.
                width={1100}
                height={230}
                fluid
                band={reading.band ? { ...reading.band, label: 'IV30 20th–80th pct of window' } : null}
                marks={marks}
              />
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-dense-meta text-muted-foreground">
                <span>
                  {reading.ivAboveRv != null
                    ? `IV above RV on ${Math.round(reading.ivAboveRv * 100)}% of the ${reading.bothPoints} days holding both`
                    : reading.suspects.length > 0
                      ? 'IV over RV share withheld — see the suspect readings above.'
                      : 'No day in this window holds both IV30 and RV20.'}
                </span>
              </p>
            </>
          )}
        </div>
      </SectionPanel>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start">
        {/* ── Vol cone ─────────────────────────────────────────────── */}
        <SectionPanel
          cap="Vol cone"
          title="realized vol by horizon"
          note={
            cone.data
              ? `${cone.data.sessions} sessions of overlapping windows · ● = today's IV for that horizon`
              : "● = today's IV for that horizon"
          }
        >
          <div className="space-y-2 px-3 py-3">
            {cone.isLoading || term.isLoading ? (
              <Skeleton className="h-44 rounded" />
            ) : cone.isError ? (
              <QueryErrorAlert error={cone.error} onRetry={() => void cone.refetch()} />
            ) : (
              <>
                <VolCone rows={cRows} />
                <p className="max-w-[90ch] text-dense-meta leading-relaxed text-muted-foreground">
                  {coneStory(cRows)}
                  {term.data && !term.data.ok ? ` Implied vol did not answer: ${term.data.error ?? 'unknown error'}.` : ''}
                </p>
                <p className="text-dense-caption text-muted-foreground/70">
                  Bands are the 5th–95th and 20th–80th percentile of realised vol; dashed is the median. Implied vol at a
                  horizon is interpolated in total variance between the two listed expiries around it, and left off
                  where there is no pair.
                </p>
              </>
            )}
          </div>
        </SectionPanel>

        {/* ── Earnings moves ───────────────────────────────────────── */}
        <SectionPanel
          cap="Earnings moves"
          title="actual vs what was priced"
          note={moves.data && moves.data.prints.length > 0 ? `last ${moves.data.prints.length} prints` : `last ${PRINTS} prints`}
        >
          <HistoryEarnings
            data={moves.data}
            isLoading={moves.isLoading}
            error={moves.isError ? moves.error : null}
            onRetry={() => void moves.refetch()}
          />
        </SectionPanel>

        {/* ── Correlation over time ─────────────────────────────────── */}
        <SectionPanel
          cap="Correlation over time"
          title="book pairs · 60d rolling ρ"
          action={
            <Link to="/risk/portfolio" className={LINK}>
              Risk →
            </Link>
          }
        >
          <HistoryCorrelation />
        </SectionPanel>
      </div>
    </div>
  )
}
