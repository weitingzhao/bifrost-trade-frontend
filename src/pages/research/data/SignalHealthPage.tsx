/**
 * Signal Health — walked against `Research Signal Health.dc.html`
 * (Rev 2026-09-19.2) on 2026-09-22.
 *
 * The design calls this page **"ground truth for every asof in the console
 * (§17) — every AsofTag reads this page's asof, never its own clock"**, and it
 * earns that claim with one line beside the Overall tag: not *degraded*, but
 * *which* lens is late and what that does to the readings downstream of it.
 * The page had the tag and the timestamp and not the line, which is the half
 * a reader can act on.
 *
 * ## The finding: two headlines that hide their own composition
 *
 * Measured on DEV 2026-09-22.
 *
 * - **Canonical P&L** answers `insufficient_pct: 0.0` — every leg priced —
 *   and `by_quality` says all 234,415 rows are `iv_interpolated`. Not one
 *   priced off a full chain. "0% insufficient" is true and reads as the
 *   opposite of what it means.
 * - **IV reconstruction** answers `solver_ok_pct: 0.997`, and `by_status`
 *   says 1,950,684 of 2,130,014 rows are `vendor_snapshot` — **91.6% never
 *   went through the solver at all**. It succeeded at what it was asked; it
 *   was asked about 8% of the data.
 *
 * Neither number is wrong and neither is worth much without the breakdown
 * under it, so both panels now lead with the breakdown.
 *
 * ## Built, and what is owed
 *
 * Added: the Overall rule line, `Expected` and `Downstream` on the freshness
 * table, the two compositions, Universe readiness from the SEPA criteria
 * stats, and the `Lens Coverage →` the design puts in the header.
 *
 * Owed: the design's *Both · enters ratings* row. The criteria stats count
 * the fundamental and technical sides independently and carry no
 * intersection, so a number there would be an assumption about overlap. And
 * the design's `unprobed` status — this engine probes every table it lists,
 * so nothing carries it today; the legend still names it, because *an
 * unprobed lens is not a down lens* is a rule about how to read a grey row,
 * not a row that has to exist to be worth stating.
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
import { fetchSepaCriteriaStats } from '@/api/research/dataReadiness'
import { fmtPctFromFraction } from '@/lib/format'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  blockError,
  composition,
  healthLenses,
  overallRule,
  readinessRows,
  type CompositionRow,
} from '@/utils/signalHealthModel'

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'fresh' || status === 'ok') return 'success'
  if (status === 'stale' || status === 'degraded') return 'warning'
  if (status === 'missing' || status === 'empty') return 'danger'
  // `unprobed` / `unknown` is the design's grey: not probed is not down.
  return 'neutral'
}

/**
 * A block whose own query failed.
 *
 * Its numbers arrive as zeroes either way, so without this the page asserts a
 * measurement it did not make — "0 rows · Solver OK —" reads as *the solver
 * produced nothing*, and what happened is that it never ran.
 */
function BlockFailed({ why }: { why: string }) {
  return (
    <p className="text-dense-meta leading-relaxed text-warning">
      This reading did not run — <span className="font-mono">{why}</span>. Its numbers are absent,
      not zero.
    </p>
  )
}

/** What a headline percentage is actually made of. */
function Composition({ rows, note }: { rows: readonly CompositionRow[]; note: string }) {
  if (rows.length === 0) return null
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.key} className="flex items-baseline justify-between gap-2 text-dense-caption">
          <span className="min-w-0 truncate font-mono text-muted-foreground">{r.key}</span>
          <span className="shrink-0 font-mono tabular-nums">
            {r.n.toLocaleString()} · {Math.round(r.share * 1000) / 10}%
          </span>
        </div>
      ))}
      <p className="pt-0.5 text-dense-caption leading-relaxed text-warning">{note}</p>
    </div>
  )
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

  // Universe readiness is the design's fourth panel and lives in another
  // endpoint — the SEPA criteria stats, which the design notes this page
  // absorbed from the stock screener.
  const readinessQ = useQuery({
    queryKey: ['research', 'readiness', 'criteria-stats'],
    queryFn: fetchSepaCriteriaStats,
    staleTime: 10 * 60_000,
    retry: 0,
  })

  const data = q.data
  const rule = overallRule(data)
  const lenses = healthLenses(data?.freshness ?? [])
  const pnlMix = composition(data?.canonical_pnl?.by_quality)
  const ivMix = composition(data?.iv_reconstruction?.by_status)

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Signal Health"
        description="Ground truth for every asof in the console — every freshness stamp elsewhere reads this page's, never its own clock. Observe-only."
        actions={
          <Link
            to="/research/lens-coverage"
            className="text-dense-caption text-primary hover:underline"
          >
            Lens Coverage →
          </Link>
        }
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
            <span className="font-mono text-dense-meta text-muted-foreground">
              asof {data.as_of}
            </span>
          ) : null}
          <span className="text-dense-caption text-muted-foreground">
            judged by the research engine&rsquo;s signal-health service
          </span>
          {/* The design's line, and why this page is ground truth rather than
              a status board: "degraded" is a colour, and *which* lens is late
              is the only version a reader can act on. */}
          <span
            className={cn(
              'ml-auto text-dense-caption',
              rule.tone === 'warn' ? 'text-warning' : 'text-muted-foreground',
            )}
          >
            {rule.text}
          </span>
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-dense-label font-medium">Lens freshness</span>
            <span className="text-dense-caption text-muted-foreground">
              {lenses.length} tables · amber = old, red = wrong, grey = not probed — an unprobed
              lens is not a down lens
            </span>
          </p>
          {q.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !data?.freshness?.length ? (
            <EmptyState
              icon={<Activity />}
              title="No freshness signals"
              description="Feature tables may be empty or unreachable."
            />
          ) : (
            <DenseDataTable tableClassName="min-w-[760px]">
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead>Signal</DenseTableHead>
                  <DenseTableHead>Status</DenseTableHead>
                  <DenseTableHead className="text-right">Rows</DenseTableHead>
                  <DenseTableHead className="text-right">Age</DenseTableHead>
                  <DenseTableHead>Last computed</DenseTableHead>
                  <DenseTableHead>Expected</DenseTableHead>
                  <DenseTableHead>Downstream</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {lenses.map((f) => (
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
                    <DenseTableCell className={denseTable.mutedMeta}>{f.expected}</DenseTableCell>
                    <DenseTableCell>
                      {/* Only where this side has the page. A link to an
                          approximate destination answers "where does this
                          land" with a guess. */}
                      {f.downstream ? (
                        <Link
                          to={f.downstream.to}
                          className="text-dense-caption text-primary hover:underline"
                        >
                          {f.downstream.label} →
                        </Link>
                      ) : (
                        <span
                          className="text-dense-caption text-muted-foreground/60"
                          title="No page on this side reads this table directly."
                        >
                          —
                        </span>
                      )}
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
                <DenseTag variant="neutral">total {data?.hypotheses.total ?? 0}</DenseTag>
                {/* The per-status counts, which already include `active` —
                    printing `total_active` beside them said 32 twice. */}
                {Object.entries(data?.hypotheses.counts ?? {}).map(([k, v]) => (
                  <DenseTag key={k} variant={k === 'active' ? 'info' : 'neutral'}>
                    {k} {v}
                  </DenseTag>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="space-y-2 px-3 py-2">
            <p className="text-dense-label font-medium">Canonical P&amp;L coverage</p>
            {q.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : blockError(data?.canonical_pnl) ? (
              <BlockFailed why={blockError(data?.canonical_pnl) as string} />
            ) : (
              <div className="space-y-1.5 text-dense-meta">
                <p>
                  Insufficient chain:{' '}
                  <span className="font-mono text-foreground">
                    {fmtPctFromFraction(data?.canonical_pnl.insufficient_pct)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  {(data?.canonical_pnl.rows ?? 0).toLocaleString()} rows ·{' '}
                  {data?.canonical_pnl.symbols ?? '—'} symbols
                </p>
                <Composition
                  rows={pnlMix}
                  note="The design reads this as the share pricing off a full chain. Every row here is interpolated, so 0% insufficient means every leg got a price — not that any priced off a chain."
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="space-y-2 px-3 py-2">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-dense-label font-medium">Universe readiness</span>
              <span className="text-dense-caption text-muted-foreground">
                from the SEPA criteria stats
              </span>
            </p>
            {readinessQ.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : readinessQ.isError ? (
              <p className="text-dense-caption text-muted-foreground">
                The criteria stats did not answer — the rows are absent rather than zero.
              </p>
            ) : (
              <div className="space-y-1">
                {readinessRows(readinessQ.data ?? {}).map((r) => (
                  <div
                    key={r.label}
                    className="flex items-baseline justify-between gap-2 text-dense-meta"
                  >
                    <span className="min-w-0 text-muted-foreground">{r.label}</span>
                    <span
                      className={cn(
                        'shrink-0 font-mono tabular-nums',
                        r.warn ? 'text-warning' : r.owed ? 'text-muted-foreground/60' : '',
                      )}
                      title={r.owed}
                    >
                      {r.owed ? 'owed' : r.value}
                    </span>
                  </div>
                ))}
                {/* The design's own sentence, and the half that matters. */}
                <p className="border-t border-border/60 pt-1.5 text-dense-caption leading-relaxed text-muted-foreground">
                  Readiness is a coverage fact, not a stock pick: a symbol short of bars or
                  statements is excluded from ratings and screens until a backfill lands.
                  Per-symbol detail is on{' '}
                  <Link to="/research/lens-coverage" className="text-primary hover:underline">
                    Lens Coverage
                  </Link>
                  .
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {data?.iv_reconstruction ? (
          <Card variant="elevated">
            <CardContent className="space-y-2 px-3 py-2">
              <p className="text-dense-label font-medium">IV reconstruction</p>
              {blockError(data.iv_reconstruction) ? (
                <BlockFailed why={blockError(data.iv_reconstruction) as string} />
              ) : (
              <div className="space-y-1.5 text-dense-meta">
                <p>
                  Solver OK:{' '}
                  <span className="font-mono text-foreground">
                    {fmtPctFromFraction(data.iv_reconstruction.solver_ok_pct)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  {(data.iv_reconstruction.rows ?? 0).toLocaleString()} rows ·{' '}
                  {data.iv_reconstruction.symbols ?? '—'} symbols ·{' '}
                  {data.iv_reconstruction.distinct_dates ?? '—'} dates
                </p>
                <Composition
                  rows={ivMix}
                  note="Most rows are vendor snapshots and never reach the solver. The percentage above is its success on what it was asked, not on the data."
                />
              </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageShell>
  )
}
