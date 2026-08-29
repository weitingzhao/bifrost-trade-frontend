import { useEffect, useMemo } from 'react'
// lucide-react icons used only in navConfig; PageHeader has no icon prop
import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell } from '@/components/layout'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  denseTable,
  denseTableNumCell,
} from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import {
  fetchOrderSentiment,
  fetchMultiLegTrades,
  type OrderSentiment,
} from '@/api/researchEngine'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { SymbolContextGuard } from '@/components/research/SymbolContextGuard'
import { CompositeRegimeRibbon } from '@/components/research/CompositeRegimeRibbon'
import {
  AnalyzeVerdictStrip,
  type AnalyzeVerdictTone,
} from '@/components/research/AnalyzeVerdictStrip'
import { CopilotAutoInsightChip } from '@/components/research/CopilotAutoInsightChip'
import { withWatchlistContractKey } from '@/components/research/watchlistContractKey'
import { useResearchContext } from '@/hooks/useResearchContext'
import { askCopilotIntentStore } from '@/store/askCopilotIntentStore'
import { copilotViewStore } from '@/store/copilotViewStore'
import { cn } from '@/lib/utils'

function fmtNotional(v: number): string {
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v == null) return '—'
  return v.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function sentimentVerdictTone(score: number | undefined): AnalyzeVerdictTone {
  if (score == null || !Number.isFinite(score)) return 'neutral'
  if (score >= 30) return 'success'
  if (score <= -30) return 'danger'
  return 'warning'
}

function sentimentVerdictLabel(score: number | undefined): string {
  if (score == null || !Number.isFinite(score)) return 'No tape — wait'
  if (score >= 30) return 'Lean long with flow'
  if (score <= -30) return 'Lean short with flow'
  return 'Fade extremes — mixed tape'
}

function sentimentVerdictSummary(s: OrderSentiment | undefined): string {
  if (!s) return 'No order-flow sentiment yet — do not size from tape until snapshot lands.'
  const score = s.sentiment_score
  if (score >= 30) {
    return `Follow bullish flow in ${s.symbol} (score ${score.toFixed(1)}); confirm with GEX walls before adding. PCR vol ${fmtNum(s.pcr_volume)}.`
  }
  if (score <= -30) {
    return `Follow bearish flow in ${s.symbol} (score ${score.toFixed(1)}); confirm put wall / zero-γ before adding. PCR vol ${fmtNum(s.pcr_volume)}.`
  }
  return `${s.symbol} tape is mixed (score ${score.toFixed(1)}) — prefer mean-reversion / wait for clearer PCR. Call ${fmtNotional(s.call_notional)} vs put ${fmtNotional(s.put_notional)}.`
}

export default function OrderSentimentPage() {
  const { symbol, dateInput } = useResearchContext()
  const date = dateInput

  const {
    data: sentimentData,
    isLoading: sentimentLoading,
    error: sentimentError,
  } = useQuery({
    queryKey: ['order-sentiment', symbol, date],
    queryFn: () => fetchOrderSentiment(symbol || undefined, date || undefined),
    enabled: symbol.length > 0,
  })

  const {
    data: multiLegData,
    isLoading: multiLegLoading,
    error: multiLegError,
  } = useQuery({
    queryKey: ['multi-leg-trades', symbol, date],
    queryFn: () => fetchMultiLegTrades(symbol, date || undefined),
    enabled: symbol.length > 0,
  })

  const sentiment: OrderSentiment | undefined = sentimentData?.rows?.[0]
  const multiLegRows = multiLegData?.rows ?? []
  const topMultiLeg = useMemo(
    () => [...multiLegRows].sort((a, b) => b.total_notional - a.total_notional).slice(0, 10),
    [multiLegRows],
  )

  const verdictTone = sentimentVerdictTone(sentiment?.sentiment_score)
  const verdictLabel = sentimentVerdictLabel(sentiment?.sentiment_score)
  const verdictSummary = sentimentVerdictSummary(sentiment)

  useEffect(() => {
    if (window.location.hash === '#multi-leg') {
      document.getElementById('multi-leg-section')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [multiLegRows.length])

  return (
    <PageShell padding="compact">
      <PageHeader
        title="Order Sentiment"
        actions={
          <div className="flex items-center gap-1.5">
            <AskCopilotButton
              originPage="order-sentiment"
              originLabel="Order Sentiment"
              symbol={symbol}
              date={date || undefined}
              snapshot={compactSnapshot({
                data_source: sentiment?.data_source,
                sentiment_score: sentiment?.sentiment_score,
                pcr_volume: sentiment?.pcr_volume,
                multi_leg_count: multiLegRows.length,
              })}
              suggestedPrompt={`Interpret ${symbol} order-flow / sentiment from this tape snapshot. What stands out?`}
            />
            <SaveAsHypothesisButton
              originPage="order-sentiment"
              defaultTitle={`${symbol} order-flow hypothesis`}
              defaultThesis={verdictSummary}
              defaultSymbols={[symbol]}
              defaultTags={['order-flow', 'sentiment', 'tape']}
              originRef={withWatchlistContractKey(
                {
                  symbol,
                  date: date || null,
                  sentiment_score: sentiment?.sentiment_score ?? null,
                  pcr_volume: sentiment?.pcr_volume ?? null,
                  multi_leg_count: multiLegRows.length,
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

      {(verdictTone === 'success' || verdictTone === 'danger') && sentiment ? (
        <CopilotAutoInsightChip
          message={`${symbol} order flow looks ${verdictLabel.toLowerCase()} (score ${sentiment.sentiment_score.toFixed(1)}).`}
          tone={verdictTone}
          onAsk={() => {
            copilotViewStore.unsuppress()
            askCopilotIntentStore.open({
              originPage: 'order-sentiment',
              originLabel: 'Order Sentiment',
              symbol,
              suggestedPrompt: `Interpret ${symbol} order-flow sentiment and what the tape implies for positioning.`,
              snapshot: compactSnapshot({
                sentiment_score: sentiment.sentiment_score,
                pcr_volume: sentiment.pcr_volume,
              }),
            })
          }}
        />
      ) : null}

      <AnalyzeVerdictStrip
        tone={verdictTone}
        verdictLabel={verdictLabel}
        narrative={verdictSummary}
        signals={
          sentiment
            ? [
                { label: 'Score', value: sentiment.sentiment_score.toFixed(1) },
                { label: 'PCR vol', value: fmtNum(sentiment.pcr_volume) },
                { label: 'PCR OI', value: fmtNum(sentiment.pcr_oi) },
              ]
            : []
        }
        nextMoves={[
          {
            label: 'Option Discovery',
            href: `/research/discovery?symbol=${encodeURIComponent(symbol)}`,
          },
          { label: 'IV Radar', href: `/research/iv-radar?symbol=${encodeURIComponent(symbol)}` },
        ]}
      />

      {(sentiment?.data_source === 'option_snapshot_aggregates' ||
        sentiment?.data_source === 'option_trades_tape') && (
        <div className="flex flex-wrap items-center gap-2">
          {sentiment?.data_source === 'option_snapshot_aggregates' && (
            <DenseTag
              variant="warning"
              title="Approximated from OI × volume snapshots. Real aggressor-signed tape uses market.option_trades when Plugin ingest has rows."
            >
              Source: option snapshot proxy (real tape pending)
            </DenseTag>
          )}
          {sentiment?.data_source === 'option_trades_tape' && (
            <DenseTag
              variant="success"
              title="Aggregated from market.option_trades (Polygon REST daily tape)."
            >
              Source: option trades tape
            </DenseTag>
          )}
        </div>
      )}

      {sentimentError && <QueryErrorAlert error={sentimentError} />}

      {sentimentLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {sentiment && (
        <>
          {sentiment.data_source === 'option_snapshot_aggregates' && (
            <p
              className="mb-2 text-dense-meta text-muted-foreground"
              title="Approximated from OI × volume snapshots. Real aggressor-signed tape (market.option_trades) requires Plugin follow-on."
            >
              data_source: {sentiment.data_source} — approximated from OI × volume snapshots
              (real tape pending)
            </p>
          )}
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Total Notional"
              value={fmtNotional(sentiment.call_notional + sentiment.put_notional)}
            />
            <KpiCard
              label="Call Notional"
              value={fmtNotional(sentiment.call_notional)}
              className="text-profit"
            />
            <KpiCard
              label="Put Notional"
              value={fmtNotional(sentiment.put_notional)}
              className="text-loss"
            />
            <KpiCard
              label="Sentiment Score"
              value={sentiment.sentiment_score.toFixed(1)}
              className={
                sentiment.sentiment_score > 0
                  ? 'text-profit'
                  : sentiment.sentiment_score < 0
                    ? 'text-loss'
                    : ''
              }
            />
          </div>

          {/* Sentiment gradient bar */}
          <Card variant="elevated" size="sm" className="mt-3 p-3">
            <CardContent className="p-0">
              <SentimentGradientBar score={sentiment.sentiment_score} />
            </CardContent>
          </Card>

          {/* Concentration metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <Card variant="elevated" size="sm" className="p-3">
              <CardContent className="p-0">
                <h3 className="text-dense-label font-semibold mb-2">
                  Expiry Concentration
                </h3>
                <ConcentrationBar
                  value={sentiment.expiry_concentration}
                  label="Concentration"
                  color="var(--color-chart-2, #34d399)"
                />
                <div className="mt-1 text-dense-meta text-muted-foreground">
                  PCR Volume: {fmtNum(sentiment.pcr_volume)} — PCR OI:{' '}
                  {fmtNum(sentiment.pcr_oi)}
                </div>
              </CardContent>
            </Card>
            <Card variant="elevated" size="sm" className="p-3">
              <CardContent className="p-0">
                <h3 className="text-dense-label font-semibold mb-2">
                  Strike Concentration
                </h3>
                <ConcentrationBar
                  value={sentiment.strike_concentration}
                  label="Concentration"
                  color="var(--color-chart-4, #a78bfa)"
                />
                <div className="mt-1 text-dense-meta text-muted-foreground">
                  Call Vol: {sentiment.call_volume.toLocaleString()} — Put Vol:{' '}
                  {sentiment.put_volume.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Multi-leg trades table */}
      {multiLegError && <QueryErrorAlert error={multiLegError} />}

      {multiLegLoading && <Skeleton className="h-48 w-full mt-3" />}

      {multiLegRows.length > 0 && (
        <div id="multi-leg-section" className="mt-3 space-y-3">
          <h2 className="text-dense-body font-semibold">Top multi-leg clusters</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {topMultiLeg.map((row) => (
              <Card key={row.cluster_id} variant="elevated">
                <CardContent className="flex flex-col gap-1 px-3 py-2">
                  <DenseTag variant="neutral">{row.strategy_guess}</DenseTag>
                  <p className="font-mono text-lg font-semibold tabular-nums">
                    {fmtNotional(row.total_notional)}
                  </p>
                  <p className="font-mono text-dense-micro text-muted-foreground truncate">
                    {row.cluster_id}
                  </p>
                  <p className="text-dense-caption text-muted-foreground">
                    Conf {(row.confidence * 100).toFixed(0)}%
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

        <Card variant="elevated">
          <CardContent className="p-0">
            <DenseDataTable>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead>Cluster ID</DenseTableHead>
                  <DenseTableHead>Strategy Guess</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>
                    Total Notional
                  </DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>
                    Confidence
                  </DenseTableHead>
                  <DenseTableHead>Data Source</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {multiLegRows.map((row) => (
                  <DenseTableRow key={row.cluster_id}>
                    <DenseTableCell className="font-mono text-dense-meta">
                      {row.cluster_id}
                    </DenseTableCell>
                    <DenseTableCell>
                      <DenseTag variant="neutral">
                        {row.strategy_guess}
                      </DenseTag>
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {fmtNotional(row.total_notional)}
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {(row.confidence * 100).toFixed(0)}%
                    </DenseTableCell>
                    <DenseTableCell className="text-dense-meta text-muted-foreground">
                      {row.data_source}
                    </DenseTableCell>
                  </DenseTableRow>
                ))}
              </DenseTableBody>
            </DenseDataTable>
          </CardContent>
        </Card>
        </div>
      )}

      {!sentimentLoading &&
        !multiLegLoading &&
        !sentiment &&
        multiLegRows.length === 0 &&
        !sentimentError &&
        !multiLegError && (
          <p className={denseTable.emptyHint}>No order sentiment data available</p>
        )}
      </SymbolContextGuard>
    </PageShell>
  )
}

function KpiCard({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <Card variant="elevated" size="sm" className="p-2.5">
      <CardContent className="p-0">
        <div className="text-dense-meta text-muted-foreground">{label}</div>
        <div className={cn('text-dense-body font-semibold font-mono', className)}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

function SentimentGradientBar({ score }: { score: number }) {
  const clampedScore = Math.max(-100, Math.min(100, score))
  const pct = ((clampedScore + 100) / 200) * 100

  return (
    <div>
      <div className="flex justify-between text-dense-meta text-muted-foreground mb-1">
        <span>Bearish (-100)</span>
        <span className="font-semibold">
          Score: {score > 0 ? '+' : ''}
          {score.toFixed(1)}
        </span>
        <span>Bullish (+100)</span>
      </div>
      <svg
        viewBox="0 0 400 24"
        style={{ width: '100%', height: 24 }}
        role="img"
        aria-label={`Sentiment score: ${score}`}
      >
        <defs>
          <linearGradient id="sentiment-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-loss, #ef4444)" />
            <stop offset="50%" stopColor="var(--border)" />
            <stop offset="100%" stopColor="var(--color-profit, #22c55e)" />
          </linearGradient>
        </defs>
        <rect x={0} y={4} width={400} height={16} rx={4} fill="url(#sentiment-grad)" opacity={0.5} />
        {/* Marker */}
        <circle cx={(pct / 100) * 400} cy={12} r={6} fill="var(--foreground)" />
      </svg>
    </div>
  )
}

function ConcentrationBar({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: string
}) {
  const pct = Math.max(0, Math.min(100, value * 100))

  return (
    <div>
      <div className="flex justify-between text-dense-meta text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="font-mono">{pct.toFixed(1)}%</span>
      </div>
      <svg viewBox="0 0 400 12" style={{ width: '100%', height: 12 }} role="img">
        <rect x={0} y={0} width={400} height={12} rx={3} fill="var(--secondary)" />
        <rect
          x={0}
          y={0}
          width={(pct / 100) * 400}
          height={12}
          rx={3}
          fill={color}
          opacity={0.7}
        />
      </svg>
    </div>
  )
}
