import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import {
  fetchOrderSentiment,
  fetchMultiLegTrades,
  type OrderSentiment,
} from '@/api/researchEngine'
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

export default function OrderSentimentPage() {
  const [symbol, setSymbol] = useState('SPX')
  const [date, setDate] = useState('')

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

  return (
    <PageShell padding="compact">
      <PageHeader
        title="Order Sentiment"
        actions={
          <div className="flex items-center gap-2">
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
            <Input
              className="h-7 w-24 text-dense-label"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Symbol"
            />
            <Input
              type="date"
              className="h-7 w-36 text-dense-label"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        }
      />

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
        <Card variant="elevated" className="mt-3">
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
      )}

      {!sentimentLoading &&
        !multiLegLoading &&
        !sentiment &&
        multiLegRows.length === 0 &&
        !sentimentError &&
        !multiLegError && (
          <p className={denseTable.emptyHint}>No order sentiment data available</p>
        )}
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
