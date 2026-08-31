/**
 * Signal Health page — Wave 14.
 */
import { useQuery } from '@tanstack/react-query'
import { Activity } from 'lucide-react'
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
  EmptyState,
  denseTable,
  denseTableNumCell,
} from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchSignalHealth } from '@/api/research/similarRegime'
import { fmtPctFromFraction } from '@/lib/format'

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'fresh' || status === 'ok') return 'success'
  if (status === 'stale' || status === 'degraded' || status === 'unknown') return 'warning'
  if (status === 'missing' || status === 'empty') return 'danger'
  return 'neutral'
}

function fmtAge(h: number | null | undefined): string {
  if (h == null || !Number.isFinite(h)) return '—'
  if (h < 1) return `${Math.round(h * 60)}m`
  if (h < 48) return `${h.toFixed(1)}h`
  return `${(h / 24).toFixed(1)}d`
}

export default function SignalHealthPage() {
  const q = useQuery({
    queryKey: ['research', 'signal-health'],
    queryFn: fetchSignalHealth,
    staleTime: 30_000,
    refetchInterval: 120_000,
  })

  const data = q.data

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Signal Health"
        description="Feature-store freshness, hypothesis counts, canonical PnL coverage, and IV reconstruction. Observe-only."
      />

      {q.isError ? (
        <QueryErrorAlert error={q.error} onRetry={() => void q.refetch()} />
      ) : null}

      <Card variant="elevated">
        <CardContent className="flex flex-wrap items-center gap-2 px-3 py-2">
          <span className="text-dense-label font-medium">Overall</span>
          {q.isLoading ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <DenseTag variant={statusVariant(data?.overall ?? 'missing')}>
              {(data?.overall ?? '—').toUpperCase()}
            </DenseTag>
          )}
          {data?.as_of ? (
            <span className="text-dense-meta text-muted-foreground font-mono">{data.as_of}</span>
          ) : null}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium">Cron freshness</p>
          {q.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !data?.freshness?.length ? (
            <EmptyState
              icon={<Activity />}
              title="No freshness signals"
              description="Feature tables may be empty or unreachable."
            />
          ) : (
            <DenseDataTable tableClassName="min-w-[520px]">
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead>Signal</DenseTableHead>
                  <DenseTableHead>Status</DenseTableHead>
                  <DenseTableHead className="text-right">Rows</DenseTableHead>
                  <DenseTableHead className="text-right">Age</DenseTableHead>
                  <DenseTableHead>Last computed</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {data.freshness.map((f) => (
                  <DenseTableRow key={f.label}>
                    <DenseTableCell>
                      <div className="flex flex-col">
                        <span className="text-dense-label">{f.label}</span>
                        <span className="text-dense-micro text-muted-foreground font-mono">
                          {f.table}
                        </span>
                      </div>
                    </DenseTableCell>
                    <DenseTableCell>
                      <DenseTag variant={statusVariant(f.status)}>{f.status}</DenseTag>
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>{f.row_count}</DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>{fmtAge(f.age_hours)}</DenseTableCell>
                    <DenseTableCell className={denseTable.mutedMeta}>
                      {f.max_computed_at ?? '—'}
                    </DenseTableCell>
                  </DenseTableRow>
                ))}
              </DenseTableBody>
            </DenseDataTable>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Card variant="elevated">
          <CardContent className="space-y-2 px-3 py-2">
            <p className="text-dense-label font-medium">Hypotheses</p>
            {q.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex flex-wrap gap-2 text-dense-meta">
                <DenseTag variant="info">
                  active {data?.hypotheses.total_active ?? 0}
                </DenseTag>
                <DenseTag variant="neutral">total {data?.hypotheses.total ?? 0}</DenseTag>
                {Object.entries(data?.hypotheses.counts ?? {}).map(([k, v]) => (
                  <DenseTag key={k} variant="neutral">
                    {k}: {v}
                  </DenseTag>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="space-y-2 px-3 py-2">
            <p className="text-dense-label font-medium">Canonical PnL coverage</p>
            {q.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-1 text-dense-meta">
                <p>
                  Insufficient chain:{' '}
                  <span className="font-mono text-foreground">
                    {fmtPctFromFraction(data?.canonical_pnl.insufficient_pct)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Rows {data?.canonical_pnl.rows ?? '—'} · Symbols{' '}
                  {data?.canonical_pnl.symbols ?? '—'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {data?.iv_reconstruction ? (
          <Card variant="elevated">
            <CardContent className="space-y-2 px-3 py-2">
              <p className="text-dense-label font-medium">IV Reconstruction</p>
              <div className="space-y-1 text-dense-meta">
                <p>
                  Solver OK:{' '}
                  <span className="font-mono text-foreground">
                    {fmtPctFromFraction(data.iv_reconstruction.solver_ok_pct)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Rows {data.iv_reconstruction.rows ?? '—'} · Symbols{' '}
                  {data.iv_reconstruction.symbols ?? '—'} · Dates{' '}
                  {data.iv_reconstruction.distinct_dates ?? '—'}
                </p>
                {data.iv_reconstruction.with_iv != null ? (
                  <p className="text-muted-foreground">
                    With IV {data.iv_reconstruction.with_iv}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageShell>
  )
}
