import { useState } from 'react'
import { fmtNumLocale } from '@/lib/format'
// lucide-react icons used only in navConfig; PageHeader has no icon prop
import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell } from '@/components/layout'
import { ForecastStructureCards } from '@/components/research/ForecastStructureCards'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  SettlementBadges,
  denseTable,
  denseTableNumCell,
} from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { settlementFineGrain } from '@/lib/researchSettlement'
import {
  fetchForecastHitRate,
  fetchForecastSessionDetail,
  fetchForecastSessions,
  fetchSettlements,
  type ForecastSession,
} from '@/api/researchEngine'
import { ProbabilityBar } from '@/components/charts/ProbabilityBar'
import { ForecastPathOverlay } from '@/components/charts/ForecastPathOverlay'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { SymbolContextGuard } from '@/components/research/SymbolContextGuard'
import { CompositeRegimeRibbon } from '@/components/research/CompositeRegimeRibbon'
import { AnalyzeVerdictStrip } from '@/components/research/AnalyzeVerdictStrip'
import { withWatchlistContractKey } from '@/components/research/watchlistContractKey'
import { useResearchContext } from '@/hooks/useResearchContext'
import { cn } from '@/lib/utils'

function fmtTime(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return ts
  }
}

function fmtDate(ts: string): string {
  try {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ts
  }
}

function regimeVariant(
  regime: string,
): 'success' | 'warning' | 'danger' | 'neutral' {
  const r = regime?.toLowerCase()
  if (r === 'bull' || r === 'bullish') return 'success'
  if (r === 'bear' || r === 'bearish') return 'danger'
  if (r === 'squeeze' || r === 'rangy') return 'warning'
  return 'neutral'
}

export default function ForecastSessionsPage() {
  const { symbol, apiDate } = useResearchContext()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const {
    data: listData,
    isLoading: listLoading,
    error: listError,
  } = useQuery({
    queryKey: ['forecast-sessions', symbol, apiDate],
    queryFn: () => fetchForecastSessions(symbol, apiDate || undefined),
  })

  const {
    data: detail,
    isLoading: detailLoading,
    error: detailError,
  } = useQuery({
    queryKey: ['forecast-session-detail', selectedId],
    queryFn: () => fetchForecastSessionDetail(selectedId!),
    enabled: !!selectedId,
  })

  const {
    data: settlementData,
  } = useQuery({
    queryKey: ['forecast-settlements', selectedId],
    queryFn: () => fetchSettlements(undefined, selectedId!),
    enabled: !!selectedId,
  })

  const { data: hitRateData } = useQuery({
    queryKey: ['forecast-hit-rate', symbol, 30],
    queryFn: () => fetchForecastHitRate(symbol, 30),
    enabled: symbol.length > 0,
    staleTime: 60_000,
  })

  const sessions = listData?.rows ?? []
  const settlement = settlementData?.rows?.[0]
  const rollingHit = hitRateData?.path_hit_rate ?? null
  const rollingMiss = hitRateData?.avg_close_miss_pct ?? null
  const rollingCount = hitRateData?.session_count ?? 0
  const pathHitRate =
    settlementData && settlementData.rows.length > 0
      ? settlementData.rows.filter((r) => r.path_hit).length / settlementData.rows.length
      : rollingHit
  const avgMissPct =
    settlementData && settlementData.rows.length > 0
      ? settlementData.rows.reduce((s, r) => s + Math.abs(r.close_miss_pct), 0) /
        settlementData.rows.length
      : rollingMiss

  return (
    <PageShell padding="compact">
      <PageHeader
        title="Forecast"
        actions={
          <div className="flex items-center gap-1.5">
            <AskCopilotButton
              originPage="forecast-sessions"
              originLabel="Forecast"
              symbol={symbol}
              date={apiDate}
              snapshot={compactSnapshot({
                session_count: sessions.length,
                selected_id: selectedId,
                path_hit_rate: pathHitRate,
                avg_miss_pct: avgMissPct,
              })}
              suggestedPrompt={`Review the ${symbol} forecast sessions and tell me which paths look most / least reliable.`}
            />
            <SaveAsHypothesisButton
              originPage="forecast-sessions"
              defaultTitle={`${symbol} forecast path hypothesis`}
              defaultThesis={
                pathHitRate != null
                  ? `${symbol} selected session path hit ${(pathHitRate * 100).toFixed(0)}% · avg miss ${avgMissPct != null ? `${(avgMissPct * 100).toFixed(1)}%` : '—'}. Trust paths only when hit-rate ≥ 60%.`
                  : `${symbol}: ${sessions.length} forecast session(s). Settle closed sessions before sizing from path calls.`
              }
              defaultSymbols={[symbol]}
              defaultTags={['forecast', 'path', 'settlement']}
              originRef={withWatchlistContractKey(
                {
                  symbol,
                  date: apiDate || null,
                  selected_id: selectedId,
                  path_hit_rate: pathHitRate,
                  avg_miss_pct: avgMissPct,
                  session_count: sessions.length,
                },
                symbol,
              )}
            />
          </div>
        }
      />

      <ResearchContextBar />

      <SymbolContextGuard symbol={symbol}>

      <CompositeRegimeRibbon symbol={symbol} />

      <AnalyzeVerdictStrip
        tone={
          pathHitRate == null
            ? 'neutral'
            : pathHitRate >= 0.6
              ? 'success'
              : pathHitRate < 0.4
                ? 'danger'
                : 'warning'
        }
        verdictLabel={
          pathHitRate == null
            ? 'Settle before sizing'
            : pathHitRate >= 0.6
              ? 'Paths reliable — lean in'
              : pathHitRate < 0.4
                ? 'Paths unreliable — fade'
                : 'Mixed path quality — reduce size'
        }
        narrative={
          pathHitRate != null
            ? `${symbol} 30d path hit ${rollingHit != null ? `${(rollingHit * 100).toFixed(0)}%` : '—'} across ${rollingCount} settled session(s) · avg |miss| ${rollingMiss != null ? `${(rollingMiss * 100).toFixed(1)}%` : '—'}. Prefer structures that match the winning path call.`
            : `${sessions.length} session(s) listed. Open a settled session to decide whether forecast paths deserve capital.`
        }
        signals={
          pathHitRate != null
            ? [
                {
                  label: '30d Hit',
                  value: rollingHit != null ? `${(rollingHit * 100).toFixed(0)}%` : '—',
                },
                {
                  label: 'Miss',
                  value: rollingMiss != null ? `${(rollingMiss * 100).toFixed(1)}%` : '—',
                },
                { label: 'N', value: String(rollingCount) },
              ]
            : [{ label: 'Sessions', value: String(sessions.length) }]
        }
      />

      {hitRateData && rollingCount > 0 ? (
        <Card variant="elevated" size="sm">
          <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-dense-caption text-muted-foreground">
            <span className="font-medium text-foreground">30d realized path KPI</span>
            <span>
              Hit{' '}
              <strong className="font-mono text-foreground">
                {rollingHit != null ? `${(rollingHit * 100).toFixed(0)}%` : '—'}
              </strong>
            </span>
            <span>
              Avg |miss|{' '}
              <strong className="font-mono text-foreground">
                {rollingMiss != null ? `${(rollingMiss * 100).toFixed(1)}%` : '—'}
              </strong>
            </span>
            <span>
              Settled <strong className="font-mono text-foreground">{rollingCount}</strong>
            </span>
          </CardContent>
        </Card>
      ) : null}

      {listError && <QueryErrorAlert error={listError} />}

      <div className="flex gap-3 mt-1">
        {/* Left sidebar — session list */}
        <Card variant="elevated" className="w-64 shrink-0 overflow-hidden">
          <CardContent className="p-0">
            <div className="max-h-[calc(100vh-140px)] overflow-y-auto">
              {listLoading && (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              )}
              {sessions.map((s) => (
                <SessionRow
                  key={s.session_id}
                  session={s}
                  isActive={s.session_id === selectedId}
                  onClick={() => setSelectedId(s.session_id)}
                />
              ))}
              {!listLoading && sessions.length === 0 && (
                <p className={cn(denseTable.emptyHint, 'py-8')}>
                  No forecast sessions
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right main area — detail */}
        <div className="flex-1 min-w-0 space-y-3">
          {!selectedId && (
            <Card variant="elevated">
              <CardContent className="py-12 text-center text-dense-meta text-muted-foreground">
                Select a session to view details
              </CardContent>
            </Card>
          )}

          {detailError && <QueryErrorAlert error={detailError} />}

          {detailLoading && selectedId && (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          )}

          {detail && (
            <>
              {/* Session header card */}
              <Card variant="elevated" size="sm" className="p-3">
                <CardContent className="p-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-dense-label">
                    <span className="font-semibold text-dense-body">
                      {detail.session.symbol}
                    </span>
                    <span>{detail.session.trade_date}</span>
                    <DenseTag variant={regimeVariant(detail.session.regime)}>
                      {detail.session.regime}
                    </DenseTag>
                    <span>
                      Spot{' '}
                      <strong className="font-mono">
                        {fmtNumLocale(detail.session.spot)}
                      </strong>
                    </span>
                    <span>
                      Expected Close{' '}
                      <strong className="font-mono">
                        {fmtNumLocale(detail.session.expected_close)}
                      </strong>
                    </span>
                  </div>
                  {detail.session.narrative && (
                    <p className="text-dense-meta text-muted-foreground">
                      {detail.session.narrative}
                    </p>
                  )}
                  <p className="text-dense-micro text-muted-foreground">
                    LLM: {detail.session.llm_provider || 'heuristic'}
                    {(() => {
                      const tj = detail.session.terrain_json as Record<string, unknown> | null
                      const tokens = tj?.llm_tokens as Record<string, unknown> | undefined
                      const cost = tokens?.session_cost_usd ?? tokens?.cost_usd
                      return cost != null ? ` · session cost $${Number(cost).toFixed(4)}` : ''
                    })()}
                  </p>
                </CardContent>
              </Card>

              {/* Probability bar */}
              <Card variant="elevated" size="sm" className="p-3">
                <CardContent className="p-0">
                  <ProbabilityBar
                    rangy={detail.session.prob_rangy}
                    bull={detail.session.prob_bull}
                    bear={detail.session.prob_bear}
                    squeeze={detail.session.prob_squeeze}
                  />
                </CardContent>
              </Card>

              {/* Settlement KPI */}
              {settlement && (() => {
                const fine = settlementFineGrain(settlement)
                return (
                <Card variant="elevated" size="sm" className="p-3">
                  <CardContent className="p-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-dense-label font-semibold">Settlement</span>
                      <SettlementBadges
                        pathHit={settlement.path_hit}
                        pathHitCount={settlement.path_hit_count}
                        pathTotal={settlement.path_total}
                        closeMissPct={settlement.close_miss_pct}
                        directionHit={fine.directionHit}
                        pathShape={fine.pathShape}
                        closeZone={fine.closeZone}
                        leanMiss={fine.leanMiss}
                      />
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-dense-meta text-muted-foreground">
                      <span>
                        Expected{' '}
                        <strong className="font-mono text-foreground">
                          {fmtNumLocale(settlement.expected_close)}
                        </strong>
                      </span>
                      <span>
                        Actual{' '}
                        <strong className="font-mono text-foreground">
                          {fmtNumLocale(settlement.actual_close)}
                        </strong>
                      </span>
                      <span>
                        Miss{' '}
                        <strong className="font-mono text-foreground">
                          {fmtNumLocale(settlement.close_miss)}
                        </strong>
                      </span>
                      {pathHitRate != null && (
                        <span>
                          Path hit rate{' '}
                          <strong className="font-mono text-foreground">
                            {(pathHitRate * 100).toFixed(0)}%
                          </strong>
                        </span>
                      )}
                      {avgMissPct != null && (
                        <span>
                          Avg |miss|{' '}
                          <strong className="font-mono text-foreground">
                            {(avgMissPct * 100).toFixed(2)}%
                          </strong>
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <ForecastPathOverlay
                        forecast={(detail.hourly ?? []).map((h) => ({
                          hour_et: h.hour_et,
                          level_low: h.level_low,
                          level_high: h.level_high,
                          level_target: h.level_target,
                        }))}
                        realized={
                          (settlement.hourly_realized as
                            | { hour_et: number; close: number }[]
                            | null
                            | undefined) ??
                          (Array.isArray(settlement.stats_json?.hourly_close)
                            ? (settlement.stats_json.hourly_close as {
                                hour_et: number
                                close: number
                              }[])
                            : null)
                        }
                      />
                      <p className="text-dense-micro text-muted-foreground">
                        Realized overlay: forecast band vs hourly close when settlement has
                        stats_json.hourly_close; otherwise expected/actual close KPIs above.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                )
              })()}

              {/* Hourly forecast table */}
              {detail.hourly.length > 0 && (
                <Card variant="elevated">
                  <CardContent className="p-0">
                    <DenseDataTable>
                      <DenseTableHeader>
                        <DenseTableHeadRow>
                          <DenseTableHead>Hour ET</DenseTableHead>
                          <DenseTableHead>Path Call</DenseTableHead>
                          <DenseTableHead className={denseTableNumCell}>
                            Level Low
                          </DenseTableHead>
                          <DenseTableHead className={denseTableNumCell}>
                            Level High
                          </DenseTableHead>
                          <DenseTableHead className={denseTableNumCell}>
                            Level Target
                          </DenseTableHead>
                          <DenseTableHead className={denseTableNumCell}>
                            Confidence
                          </DenseTableHead>
                        </DenseTableHeadRow>
                      </DenseTableHeader>
                      <DenseTableBody>
                        {detail.hourly.map((h) => (
                          <DenseTableRow key={h.hour_et}>
                            <DenseTableCell className="font-mono">
                              {String(h.hour_et).padStart(2, '0')}:00
                            </DenseTableCell>
                            <DenseTableCell>
                              <DenseTag variant={pathCallVariant(h.path_call)}>
                                {h.path_call}
                              </DenseTag>
                            </DenseTableCell>
                            <DenseTableCell className={denseTableNumCell}>
                              {fmtNumLocale(h.level_low)}
                            </DenseTableCell>
                            <DenseTableCell className={denseTableNumCell}>
                              {fmtNumLocale(h.level_high)}
                            </DenseTableCell>
                            <DenseTableCell className={denseTableNumCell}>
                              {fmtNumLocale(h.level_target)}
                            </DenseTableCell>
                            <DenseTableCell className={denseTableNumCell}>
                              {(h.confidence * 100).toFixed(0)}%
                            </DenseTableCell>
                          </DenseTableRow>
                        ))}
                      </DenseTableBody>
                    </DenseDataTable>
                  </CardContent>
                </Card>
              )}

              {/* Structures cards */}
              {detail.session.structures_json && (
                <Card variant="elevated" size="sm" className="p-3">
                  <CardContent className="p-0 space-y-2">
                    <h3 className="text-dense-label font-semibold">Recommended Structures</h3>
                    <ForecastStructureCards structuresJson={detail.session.structures_json} />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
      </SymbolContextGuard>
    </PageShell>
  )
}

function pathCallVariant(
  call: string,
): 'success' | 'danger' | 'warning' | 'neutral' {
  const c = call?.toLowerCase()
  if (c === 'bull' || c === 'up') return 'success'
  if (c === 'bear' || c === 'down') return 'danger'
  if (c === 'flat' || c === 'rangy') return 'warning'
  return 'neutral'
}

function SessionRow({
  session,
  isActive,
  onClick,
}: {
  session: ForecastSession
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2 border-b border-border/50',
        'hover:bg-accent/50 transition-colors',
        isActive && 'bg-accent',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-dense-label font-medium">
          {fmtDate(session.computed_at)} {fmtTime(session.computed_at)}
        </span>
        <DenseTag variant={regimeVariant(session.regime)}>
          {session.regime}
        </DenseTag>
      </div>
      <div className="text-dense-meta text-muted-foreground mt-0.5">
        {session.symbol} — Spot {fmtNumLocale(session.spot)}
      </div>
    </button>
  )
}
