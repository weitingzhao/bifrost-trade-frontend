import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useIvRadarData } from '@/hooks/useIvRadarData'
import type { IvRadarBucket, IvRadarRow, IvRadarUniverseFilter } from '@/types/ivRadar'
import {
  IV_RADAR_BUCKET_HINTS,
  formatIvRadarSource,
  ivRankDistanceFrom50,
} from '@/utils/ivRadar/universe'
import { cn } from '@/lib/utils'

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

export default function IvRadarPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<IvRadarUniverseFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('rank')
  const { rows, counts, isLoading, isError, error, refetch, isFetching } = useIvRadarData(filter)

  const sorted = useMemo(() => sortRows(rows, sortMode), [rows, sortMode])
  const allMissing = counts.total > 0 && counts.noData === counts.total

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="IV Radar"
        description="Underlying IV Rank regime for Benchmarks ∪ optionable Watchlist ∪ Holdings. Drill into Option Discovery for chain/structure. Observe-only (D10)."
      />

      <Card variant="elevated">
        <CardContent className="flex flex-col gap-2 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">Universe:</span>
            <SegmentControl
              ariaLabel="IV Radar universe filter"
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
    </PageShell>
  )
}
