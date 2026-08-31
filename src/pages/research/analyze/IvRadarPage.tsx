import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { Radar } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import {
  DenseDataTable,
  DenseLinkButton,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  EmptyState,
  SegmentControl,
  denseTable,
  denseTableEntityCell,
  denseTableNumCell,
} from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { IvGauge } from '@/components/charts/IvGauge'
import { IvRankStrip } from '@/components/charts/IvRankStrip'
import { DenseSparkline } from '@/components/charts/DenseSparkline'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { SymbolContextGuard } from '@/components/research/SymbolContextGuard'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { fetchIvRankHistory } from '@/api/research/ivRadar'
import { SimilarRegimeCard } from '@/components/research/SimilarRegimeCard'
import { CompositeRegimeRibbon } from '@/components/research/CompositeRegimeRibbon'
import {
  AnalyzeVerdictStrip,
  type AnalyzeVerdictTone,
} from '@/components/research/AnalyzeVerdictStrip'
import { CopilotAutoInsightChip } from '@/components/research/CopilotAutoInsightChip'
import { PortfolioTag } from '@/components/portfolio/PortfolioTag'
import { useIvRadarData } from '@/hooks/useIvRadarData'
import {
  PORTFOLIO_UNIVERSE_OPTIONS,
  usePortfolioSymbols,
  type PortfolioUniverse,
} from '@/hooks/usePortfolioSymbols'
import { useResearchContext } from '@/hooks/useResearchContext'
import { askCopilotIntentStore } from '@/store/askCopilotIntentStore'
import { copilotViewStore } from '@/store/copilotViewStore'
import type { IvRadarBucket, IvRadarRow, IvRadarUniverseFilter } from '@/types/ivRadar'
import {
  IV_RADAR_BUCKET_HINTS,
  formatIvRadarSource,
  ivRankDistanceFrom50,
} from '@/utils/ivRadar/universe'
import { cn } from '@/lib/utils'

type ViewMode = 'table' | 'gauge'
type SortMode = 'symbol' | 'rank' | 'extremes'

function fmtIv(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  // Plugin stores IV as decimal (e.g. 0.25) or percent — show as % when < 3
  const pct = n > 0 && n < 3 ? n * 100 : n
  return `${pct.toFixed(1)}%`
}

function fmtRankPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(1)
}

function bucketTagVariant(
  bucket: IvRadarBucket,
): 'danger' | 'warning' | 'success' | 'neutral' {
  if (bucket === 'high') return 'danger'
  if (bucket === 'low') return 'success'
  if (bucket === 'neutral') return 'warning'
  return 'neutral'
}

function bucketLabel(bucket: IvRadarBucket): string {
  if (bucket === 'high') return 'High'
  if (bucket === 'neutral') return 'Neutral'
  if (bucket === 'low') return 'Low'
  return 'No data'
}

function ivRankVerdictTone(rank: number | null | undefined): AnalyzeVerdictTone {
  if (rank == null || !Number.isFinite(rank)) return 'neutral'
  if (rank >= 60) return 'danger'
  if (rank <= 30) return 'success'
  return 'warning'
}

function ivRankVerdictLabel(rank: number | null | undefined): string {
  if (rank == null || !Number.isFinite(rank)) return 'No IV Rank — wait'
  if (rank >= 60) return 'Sell premium bias'
  if (rank <= 30) return 'Buy premium bias'
  return 'No edge — stay flat'
}

function ivRankVerdictSummary(row: IvRadarRow | null): string {
  if (!row) return 'No IV Rank for this symbol — wait for radar compute before sizing vol.'
  const rank = row.data?.iv_rank_1y
  if (rank == null || !Number.isFinite(rank)) {
    return `${row.symbol}: IV Rank not computed yet — do not size from this row.`
  }
  if (rank >= 60) {
    return `${row.symbol} IV Rank ${fmtRankPct(rank)} (${bucketLabel(row.bucket)}) — prefer short premium / defined-risk shorts if VRP agrees. IV ${fmtIv(row.data?.iv_current)}.`
  }
  if (rank <= 30) {
    return `${row.symbol} IV Rank ${fmtRankPct(rank)} (${bucketLabel(row.bucket)}) — prefer long premium / debit structures. IV ${fmtIv(row.data?.iv_current)}.`
  }
  return `${row.symbol} IV Rank ${fmtRankPct(rank)} mid-band — no standalone vol edge; wait for VRP or GEX confirmation.`
}

function sortRows(rows: IvRadarRow[], mode: SortMode): IvRadarRow[] {
  const copy = [...rows]
  if (mode === 'rank') {
    copy.sort((a, b) => {
      const ra = a.data?.iv_rank_1y
      const rb = b.data?.iv_rank_1y
      if (ra == null && rb == null) return a.symbol.localeCompare(b.symbol)
      if (ra == null) return 1
      if (rb == null) return -1
      return rb - ra
    })
    return copy
  }
  if (mode === 'extremes') {
    copy.sort((a, b) => {
      const da = ivRankDistanceFrom50(a.data?.iv_rank_1y)
      const db = ivRankDistanceFrom50(b.data?.iv_rank_1y)
      if (da < 0 && db < 0) return a.symbol.localeCompare(b.symbol)
      if (da < 0) return 1
      if (db < 0) return -1
      return db - da
    })
    return copy
  }
  copy.sort((a, b) => a.symbol.localeCompare(b.symbol))
  return copy
}

function RegimeCard({
  label,
  count,
  hint,
  tone,
}: {
  label: string
  count: number
  hint: string
  tone: 'high' | 'neutral' | 'low'
}) {
  const toneClass =
    tone === 'high'
      ? 'border-destructive/30'
      : tone === 'low'
        ? 'border-success/30'
        : 'border-warning/30'
  return (
    <Card variant="elevated" size="sm" className={cn('border', toneClass)}>
      <CardContent className="py-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-dense-caption uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-mono text-lg font-semibold tabular-nums">{count}</p>
        </div>
        <p className="mt-1 text-dense-meta text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function GaugeGridView({
  rows,
  navigate,
}: {
  rows: IvRadarRow[]
  navigate: ReturnType<typeof useNavigate>
}) {
  const withData = rows.filter((r) => r.bucket !== 'no_data')
  const sparkSymbols = useMemo(() => withData.slice(0, 12).map((r) => r.symbol), [withData])
  const sparkQueries = useQueries({
    queries: sparkSymbols.map((sym) => ({
      queryKey: ['iv-rank-history', sym, 90],
      queryFn: () => fetchIvRankHistory(sym, 90),
      staleTime: 5 * 60_000,
    })),
  })
  const sparkBySymbol = useMemo(() => {
    const map = new Map<string, number[]>()
    sparkSymbols.forEach((sym, i) => {
      const rows = sparkQueries[i]?.data ?? []
      map.set(
        sym,
        rows.map((r) => r.iv_rank_1y ?? r.iv_percentile_1y ?? null).filter((v): v is number => v != null),
      )
    })
    return map
  }, [sparkSymbols, sparkQueries])

  if (withData.length === 0) {
    return (
      <p className="py-8 text-center text-dense-meta text-muted-foreground">
        No IV data to display in gauge view
      </p>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
      {withData.map((row) => {
        const rank = row.data?.iv_rank_1y ?? 0
        const iv = row.data?.iv_current
        const pct = row.data?.iv_percentile_1y
        const spark = sparkBySymbol.get(row.symbol) ?? []
        return (
          <Card
            key={row.symbol}
            variant="elevated"
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => navigate(`/research/discovery?symbol=${encodeURIComponent(row.symbol)}`)}
          >
            <CardContent className="flex flex-col items-center gap-1 px-2 py-3">
              <IvGauge value={rank} size={90} />
              <div className="flex items-center gap-1">
                <p className="text-dense-body font-semibold text-entity-symbol">{row.symbol}</p>
                <PortfolioTag symbol={row.symbol} variant="inline" />
              </div>
              {spark.length >= 2 ? (
                <DenseSparkline values={spark} width={64} height={16} />
              ) : null}
              {iv != null && Number.isFinite(iv) ? (
                <p className="font-mono text-dense-meta tabular-nums text-muted-foreground">
                  ATM {(iv > 0 && iv < 3 ? iv * 100 : iv).toFixed(1)}%
                </p>
              ) : null}
              {pct != null && Number.isFinite(pct) ? (
                <p className="font-mono text-dense-micro tabular-nums text-muted-foreground">
                  Pctl {pct.toFixed(0)}
                </p>
              ) : null}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default function IvRadarPage() {
  const navigate = useNavigate()
  const { symbol: contextSymbol } = useResearchContext()
  const [filter, setFilter] = useState<IvRadarUniverseFilter>('all')
  const [universe, setUniverse] = useState<PortfolioUniverse>('all')
  const [sortMode, setSortMode] = useState<SortMode>('rank')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const { filterSymbols } = usePortfolioSymbols()
  const { rows, counts, isLoading, isError, error, refetch, isFetching } = useIvRadarData(filter)

  const sorted = useMemo(() => {
    const ordered = sortRows(rows, sortMode)
    if (universe === 'all') return ordered
    const allowed = new Set(filterSymbols(universe, ordered.map((r) => r.symbol)))
    return ordered.filter((r) => allowed.has(r.symbol))
  }, [rows, sortMode, universe, filterSymbols])
  const allMissing = counts.total > 0 && counts.noData === counts.total

  const focusRow = useMemo(() => {
    const sym = contextSymbol.trim().toUpperCase()
    if (sym) {
      const match = sorted.find((r) => r.symbol === sym)
      if (match) return match
    }
    return sorted.find((r) => r.bucket !== 'no_data') ?? sorted[0] ?? null
  }, [sorted, contextSymbol])

  const focusSymbol = focusRow?.symbol ?? contextSymbol.trim().toUpperCase()
  const focusIvRank = focusRow?.data?.iv_rank_1y
  const verdictTone = ivRankVerdictTone(focusIvRank)
  const verdictLabel = ivRankVerdictLabel(focusIvRank)
  const verdictSummary = ivRankVerdictSummary(focusRow)
  const focusOutOfUniverse =
    universe !== 'all' &&
    Boolean(focusSymbol) &&
    filterSymbols(universe, [focusSymbol]).length === 0

  const topIvSymbols = useMemo(
    () => sorted.slice(0, 5).map((r) => r.symbol).filter(Boolean),
    [sorted],
  )

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="IV Radar"
        description="Underlying IV Rank regime for Benchmarks ∪ optionable Watchlist ∪ Holdings. Drill into Option Discovery for chain/structure. Observe-only (D10)."
        actions={
          <div className="flex items-center gap-1.5">
            <AskCopilotButton
              originPage="iv-radar"
              originLabel="IV Radar"
              snapshot={compactSnapshot({
                universe: filter,
                sort: sortMode,
                view: viewMode,
                top_symbols: topIvSymbols,
              })}
              suggestedPrompt="From this IV Rank universe, which names look interesting for short-vol observation?"
            />
            <SaveAsHypothesisButton
              originPage="iv-radar"
              defaultTitle="IV Radar hypothesis"
              defaultSymbols={topIvSymbols}
              defaultTags={['iv-regime']}
              originRef={{
                universe: filter,
                sort: sortMode,
                view: viewMode,
              }}
            />
          </div>
        }
      />

      <ResearchContextBar showDate={false} />

      <SymbolContextGuard symbol={contextSymbol}>

      {focusSymbol ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-dense-label font-semibold text-entity-symbol">{focusSymbol}</span>
          <PortfolioTag symbol={focusSymbol} variant="inline" />
          {focusOutOfUniverse ? (
            <span className="text-dense-meta text-muted-foreground">Not in holdings/watchlist</span>
          ) : null}
        </div>
      ) : null}

      <CompositeRegimeRibbon symbol={focusSymbol} />

      {(verdictTone === 'success' || verdictTone === 'danger') && focusRow ? (
        <CopilotAutoInsightChip
          message={`${focusSymbol} IV Rank ${fmtRankPct(focusIvRank)} looks ${verdictLabel.toLowerCase()}.`}
          tone={verdictTone}
          onAsk={() => {
            copilotViewStore.unsuppress()
            askCopilotIntentStore.open({
              originPage: 'iv-radar',
              originLabel: 'IV Radar',
              symbol: focusSymbol,
              suggestedPrompt: `Explain ${focusSymbol} current IV Rank regime and comparable historical outcomes.`,
              snapshot: {},
            })
          }}
        />
      ) : null}

      <AnalyzeVerdictStrip
        tone={verdictTone}
        verdictLabel={verdictLabel}
        narrative={verdictSummary}
        signals={[
          { label: 'Rank', value: fmtRankPct(focusIvRank) },
          { label: 'IV', value: fmtIv(focusRow?.data?.iv_current) },
          { label: 'Pctl', value: fmtRankPct(focusRow?.data?.iv_percentile_1y) },
        ]}
        nextMoves={[
          {
            label: 'Option Discovery',
            href: `/research/discovery?symbol=${encodeURIComponent(focusSymbol)}`,
          },
          { label: 'VRP Lab', href: `/research/vrp-lab?symbol=${encodeURIComponent(focusSymbol)}` },
        ]}
      />

      <SimilarRegimeCard lens="iv_rank" symbol={focusSymbol} value={focusIvRank} />

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium text-foreground flex flex-wrap items-center gap-1">
            <span>IV Rank strip · {focusSymbol || '—'}</span>
            {focusSymbol ? <PortfolioTag symbol={focusSymbol} variant="inline" /> : null}
          </p>
          <IvRankStrip rank={focusIvRank} />
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent className="flex flex-col gap-2 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">View:</span>
            <SegmentControl
              ariaLabel="IV Radar view mode"
              size="sm"
              value={viewMode}
              onChange={v => setViewMode(v as ViewMode)}
              options={[
                { value: 'table', label: 'Table' },
                { value: 'gauge', label: 'Gauge Grid' },
              ]}
            />
            <span className="ml-2 shrink-0 text-dense-meta font-medium text-muted-foreground">Universe:</span>
            <SegmentControl
              ariaLabel="Portfolio universe filter"
              size="sm"
              value={universe}
              onChange={(v) => setUniverse(v as PortfolioUniverse)}
              options={[...PORTFOLIO_UNIVERSE_OPTIONS]}
            />
            <span className="ml-2 shrink-0 text-xs font-medium text-muted-foreground">Source:</span>
            <SegmentControl
              ariaLabel="IV Radar source filter"
              size="sm"
              value={filter}
              onChange={v => setFilter(v as IvRadarUniverseFilter)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'benchmarks', label: 'Benchmarks' },
                { value: 'watchlist', label: 'Watchlist' },
                { value: 'holdings', label: 'Holdings' },
              ]}
            />
            {viewMode === 'table' && (
              <>
                <span className="ml-2 shrink-0 text-xs font-medium text-muted-foreground">Sort:</span>
                <SegmentControl
                  ariaLabel="IV Radar sort mode"
                  size="sm"
                  value={sortMode}
                  onChange={v => setSortMode(v as SortMode)}
                  options={[
                    { value: 'rank', label: 'Rank' },
                    { value: 'extremes', label: '|Rank−50|' },
                    { value: 'symbol', label: 'Symbol' },
                  ]}
                />
              </>
            )}
            {isFetching && !isLoading ? (
              <span className="text-dense-meta text-muted-foreground">Refreshing…</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <RegimeCard
          label="High"
          count={counts.high}
          hint={IV_RADAR_BUCKET_HINTS.high}
          tone="high"
        />
        <RegimeCard
          label="Neutral"
          count={counts.neutral}
          hint={IV_RADAR_BUCKET_HINTS.neutral}
          tone="neutral"
        />
        <RegimeCard
          label="Low"
          count={counts.low}
          hint={IV_RADAR_BUCKET_HINTS.low}
          tone="low"
        />
      </div>

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium text-foreground">How to read</p>
          <p className="text-dense-meta text-muted-foreground">
            <span className="font-medium text-foreground">IV Rank</span> (primary) = where current IV
            sits in the 1y high–low range. Buckets: High &gt;60 · Neutral 30–60 · Low &lt;30.{' '}
            <span className="font-medium text-foreground">IV Percentile</span> = % of history days with
            lower IV (column only). Typical flow: Benchmarks (market weather) → Holdings (is the book
            expensive/cheap?) → Watchlist (candidates) → Option Discovery for structure.
          </p>
        </CardContent>
      </Card>

      {isError ? (
        <QueryErrorAlert error={error} onRetry={() => void refetch()} />
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      ) : counts.total === 0 ? (
        <EmptyState
          icon={<Radar />}
          title="No symbols in this universe"
          description="Add optionable STK to Watchlist, or wait for Holdings when monitor portfolio has open positions. Benchmarks always include SPY, QQQ, IWM on All / Benchmarks."
          action={
            <Button type="button" variant="secondary" size="sm" onClick={() => setFilter('benchmarks')}>
              Show Benchmarks
            </Button>
          }
        />
      ) : allMissing ? (
        <EmptyState
          icon={<Radar />}
          title="No IV percentile data yet"
          description="iv-percentile rows are empty or stale for this universe. Wait for the Market Data plugin Cron, or check Ops Console → Subcontractors → Market Data (coverage / freshness)."
          action={
            <Button type="button" variant="secondary" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        />
      ) : viewMode === 'gauge' ? (
        <GaugeGridView rows={sorted} navigate={navigate} />
      ) : (
        <DenseDataTable tableClassName="min-w-[720px]">
          <colgroup>
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Symbol</DenseTableHead>
              <DenseTableHead className="text-right">IV</DenseTableHead>
              <DenseTableHead className="text-right">IV Rank</DenseTableHead>
              <DenseTableHead className="text-right">IV Percentile</DenseTableHead>
              <DenseTableHead className="text-right">Lookback</DenseTableHead>
              <DenseTableHead>Source</DenseTableHead>
              <DenseTableHead>As-of</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {sorted.map(row => (
              <DenseTableRow key={row.symbol}>
                <DenseTableCell className={denseTableEntityCell}>
                  <div className="flex items-center gap-1.5">
                    <DenseLinkButton
                      variant="stock"
                      label={row.symbol}
                      ariaLabel={`Open ${row.symbol} in Option Discovery`}
                      onClick={() =>
                        navigate(`/research/discovery?symbol=${encodeURIComponent(row.symbol)}`)
                      }
                    />
                    <PortfolioTag symbol={row.symbol} variant="row-suffix" />
                    {row.bucket !== 'no_data' ? (
                      <DenseTag variant={bucketTagVariant(row.bucket)}>
                        {bucketLabel(row.bucket)}
                      </DenseTag>
                    ) : (
                      <span className={denseTable.mutedMeta}>No data</span>
                    )}
                  </div>
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {fmtIv(row.data?.iv_current)}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {fmtRankPct(row.data?.iv_rank_1y)}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {fmtRankPct(row.data?.iv_percentile_1y)}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {row.data?.lookback_days != null ? String(row.data.lookback_days) : '—'}
                </DenseTableCell>
                <DenseTableCell className="text-dense-meta">
                  {formatIvRadarSource(row.sources)}
                </DenseTableCell>
                <DenseTableCell className={denseTable.mutedMeta}>
                  {row.data?.trade_date ?? '—'}
                </DenseTableCell>
              </DenseTableRow>
            ))}
          </DenseTableBody>
        </DenseDataTable>
      )}

      <p className="text-dense-caption text-muted-foreground">
        Relative regime only — not investment advice. IV levels are Polygon vendor-dependent.
        D10: no live order execution from this page.
      </p>
      </SymbolContextGuard>
    </PageShell>
  )
}
