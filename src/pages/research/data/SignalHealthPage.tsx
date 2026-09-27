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
import { useState, type ReactNode } from 'react'
import { PageHead, PageHeadLink, PageShell } from '@/components/layout'
import { RAISED_PANEL } from '@/components/layout/raisedPanel'
import { etStamp } from '@/lib/freshness'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  type DenseTagVariant,
} from '@/components/data-display'
import { ViewState } from '@bifrost/ui'
import { usePreviewState } from '@/hooks/usePreviewState'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
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
  isUnjudged,
  readinessRows,
  unjudgedReason,
  type CompositionRow,
} from '@/utils/signalHealthModel'

// Rev .91: fresh / ok in the state green, missing / empty in the red pastel —
// never the ticker lime, never the unrealised orange.
function statusVariant(status: string): DenseTagVariant {
  if (status === 'fresh' || status === 'ok') return 'state-green'
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

/** Why a coverage total carries ≈ (research 0.116.0). */
const ESTIMATE_WHY =
  'The planner’s row estimate, refreshed after each nightly write — the page reads indexes and statistics rather than counting every row. Symbols, dates and the minority counts are exact.'

// 11/600 sentence caps; a panel head is a rule, not a band (Rev .91 · .84).
const CAP = 'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground'
const PANEL_HEAD = 'flex flex-wrap items-baseline gap-2.5 border-b border-border px-3 py-2'

/** One of the readings beside the table: a cap, then its body. */
function SidePanel({
  cap,
  aside,
  row,
  children,
}: {
  cap: string
  aside?: string
  /** Lay the body out as a wrapping row (the hypothesis counts) rather than a column. */
  row?: boolean
  children: ReactNode
}) {
  return (
    <section className={cn(RAISED_PANEL, 'overflow-hidden')}>
      <header className={PANEL_HEAD}>
        <span className={CAP}>{cap}</span>
        {aside ? <span className="ml-auto text-dense-meta text-muted-foreground">{aside}</span> : null}
      </header>
      <div className={cn('px-3 py-2.5', row ? 'flex flex-wrap gap-1.5' : 'flex flex-col gap-1.5')}>{children}</div>
    </section>
  )
}

/** The panel's one big figure, as the design sets it. */
function Headline({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="font-mono text-lg font-bold tabular-nums">{value}</span>
      <span className="text-dense-meta text-muted-foreground">{label}</span>
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

  const preview = usePreviewState()
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(q)
  const data = q.data
  const rule = overallRule(data)
  const lenses = healthLenses(data?.freshness ?? [])
  // Read once: "today" must not move under the reader mid-render.
  const [nowMs] = useState(() => Date.now())
  const pnlMix = composition(data?.canonical_pnl?.by_quality)
  const ivMix = composition(data?.iv_reconstruction?.by_status)

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead
        title="Signal Health"
        info="Ground truth for every asof in the console — every freshness stamp elsewhere reads this page's asof, never its own clock. Observe-only."
        actions={<PageHeadLink to="/research/lens-coverage">Lens Coverage →</PageHeadLink>}
      />

      {pageState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh signal health"
          detail={staleDetail(q, 'every asof in the console reads this copy until it refreshes.')}
          onAction={() => void q.refetch()}
        />
      ) : null}
      {pageState === 'failed' ? (
        <section className={cn(RAISED_PANEL, 'overflow-hidden')}>
          <ViewState
            kind="failed"
            title="Couldn’t load signal health"
            detail={failedDetail(q, 'No lens was probed — this is not a healthy pipeline, it is an unread one.')}
            onAction={() => void q.refetch()}
          />
        </section>
      ) : null}

      {/* The verdict strip: radius 12 and no frame while it is ok; its edge
          takes the verdict's colour at 55% when it is not (Rev .91) — inline,
          because mat-card clears border classes. */}
      <div
        className={cn(RAISED_PANEL, 'flex flex-wrap items-center gap-x-6 gap-y-2.5 px-3 py-2.5')}
        style={
          rule.tone === 'warn'
            ? { borderColor: 'color-mix(in srgb, var(--color-warning) 55%, transparent)' }
            : undefined
        }
      >
        <span className={CAP}>Overall</span>
        {pageState === 'loading' ? (
          <span className="text-dense-meta text-muted-foreground">reading…</span>
        ) : (
          <DenseTag variant={statusVariant(data?.overall ?? 'missing')} size="cell">
            {(data?.overall ?? '—').toUpperCase()}
          </DenseTag>
        )}
        {data?.as_of ? (
          <span className="font-mono text-dense-body tabular-nums" title={`asof ${data.as_of} — as the service states it`}>
            asof {data.as_of.replace('T', ' ').slice(0, 16)}
          </span>
        ) : null}
        <span className="text-dense-meta text-muted-foreground">
          judged by Research · the engine&rsquo;s signal-health service
        </span>
        {/* The design's line, and why this page is ground truth rather than
            a status board: "degraded" is a colour, and *which* lens is late
            is the only version a reader can act on. */}
        <span className={cn('ml-auto text-dense-meta', rule.tone === 'warn' ? 'text-warning' : 'text-muted-foreground')}>
          {rule.text}
        </span>
      </div>

      {/* The design's two columns: the lens table, and the readings beside it. */}
      <div className="grid grid-cols-1 items-start gap-3 @4xl/page:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <section className={cn(RAISED_PANEL, 'overflow-hidden')}>
          <header className={PANEL_HEAD}>
            <span className={CAP}>Lens freshness</span>
            <span className="text-dense-body font-semibold">{lenses.length} tables</span>
            <span className="text-dense-meta text-muted-foreground">
              amber = old, red = wrong, grey = not probed — an unprobed lens is not a down lens
            </span>
          </header>
          {pageState === 'loading' ? (
            <ViewState kind="loading" title="Probing the lenses" rows={8} cols={7} />
          ) : !data?.freshness?.length ? (
            <ViewState
              kind="empty"
              title="No freshness signals"
              detail="The service answered with no lens table — the feature tables may be empty or unreachable."
            />
          ) : (
            <DenseDataTable standard>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead col="entity">Lens</DenseTableHead>
                  <DenseTableHead col="tag">Status</DenseTableHead>
                  <DenseTableHead col="num">Rows</DenseTableHead>
                  <DenseTableHead col="num">Age</DenseTableHead>
                  <DenseTableHead col="tag">Last computed</DenseTableHead>
                  <DenseTableHead col="tag">Expected</DenseTableHead>
                  <DenseTableHead col="tag">Downstream</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {lenses.map((f) => {
                  const at = f.max_computed_at ? Date.parse(f.max_computed_at) : NaN
                  return (
                    <DenseTableRow key={f.label}>
                      <DenseTableCell col="entity">
                        <div className="flex flex-col">
                          <span className="text-dense-label font-medium text-foreground">{f.label}</span>
                          <span className="font-mono text-dense-caption text-muted-foreground">{f.table}</span>
                        </div>
                      </DenseTableCell>
                      <DenseTableCell col="tag">
                        <DenseTag
                          variant={statusVariant(f.status)}
                          size="cell"
                          title={isUnjudged(f) ? `Not judged this read — ${unjudgedReason(f)}. Grey, not late.` : undefined}
                        >
                          {f.status}
                        </DenseTag>
                      </DenseTableCell>
                      <DenseTableCell
                        col="num"
                        className="text-[var(--sk-mute2)]"
                        title={f.row_count_estimated ? 'The planner’s estimate from table statistics — the probe reads the age off an index and does not scan.' : undefined}
                      >
                        {/* A count nobody took is not zero. */}
                        {f.row_count == null ? '—' : `${f.row_count_estimated ? '≈' : ''}${f.row_count.toLocaleString()}`}
                      </DenseTableCell>
                      <DenseTableCell col="num" className={cn('font-semibold', f.status === 'stale' && 'text-warning')}>
                        {fmtAge(f.age_hours)}
                      </DenseTableCell>
                      <DenseTableCell col="tag" className="text-dense-meta text-[var(--sk-mute2)]">
                        <span title={f.max_computed_at ?? undefined}>{Number.isFinite(at) ? etStamp(at, nowMs) : '—'}</span>
                      </DenseTableCell>
                      <DenseTableCell col="tag" className="text-dense-meta text-muted-foreground">
                        {f.expected}
                      </DenseTableCell>
                      <DenseTableCell col="tag" className="text-dense-meta">
                        {/* Only where this side has the page. A link to an
                            approximate destination answers "where does this
                            land" with a guess. */}
                        {f.downstream ? (
                          <Link to={f.downstream.to} className="text-[var(--sk-accent)] hover:underline">
                            {f.downstream.label} →
                          </Link>
                        ) : (
                          <span className="text-muted-foreground/60" title="No page on this side reads this table directly.">
                            —
                          </span>
                        )}
                      </DenseTableCell>
                    </DenseTableRow>
                  )
                })}
              </DenseTableBody>
            </DenseDataTable>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-3">
          <SidePanel cap="Canonical P&L coverage">
            {pageState === 'loading' ? (
              <span className="text-dense-meta text-muted-foreground">reading…</span>
            ) : blockError(data?.canonical_pnl) ? (
              <BlockFailed why={blockError(data?.canonical_pnl) as string} />
            ) : (
              <>
                <Headline value={fmtPctFromFraction(data?.canonical_pnl.insufficient_pct)} label="insufficient chain" />
                <p className="m-0 text-dense-meta leading-normal text-[var(--sk-mute2)]">
                  <span title={data?.canonical_pnl.rows_estimated ? ESTIMATE_WHY : undefined}>
                    {data?.canonical_pnl.rows_estimated ? '≈' : ''}
                    {(data?.canonical_pnl.rows ?? 0).toLocaleString()} rows
                  </span>{' '}
                  · {data?.canonical_pnl.symbols ?? '—'} symbols
                </p>
                <Composition
                  rows={pnlMix}
                  note="The design reads this as the share pricing off a full chain. Every row here is interpolated, so 0% insufficient means every leg got a price — not that any priced off a chain."
                />
              </>
            )}
          </SidePanel>

          {data?.iv_reconstruction ? (
            <SidePanel cap="IV reconstruction">
              {blockError(data.iv_reconstruction) ? (
                <BlockFailed why={blockError(data.iv_reconstruction) as string} />
              ) : (
                <>
                  <Headline value={fmtPctFromFraction(data.iv_reconstruction.solver_ok_pct)} label="solver OK" />
                  <p className="m-0 text-dense-meta leading-normal text-[var(--sk-mute2)]">
                    <span title={data.iv_reconstruction.rows_estimated ? ESTIMATE_WHY : undefined}>
                      {data.iv_reconstruction.rows_estimated ? '≈' : ''}
                      {(data.iv_reconstruction.rows ?? 0).toLocaleString()} rows
                    </span>{' '}
                    · {data.iv_reconstruction.symbols ?? '—'}{' '}
                    symbols · {data.iv_reconstruction.distinct_dates ?? '—'} dates
                  </p>
                  <Composition
                    rows={ivMix}
                    note="Most rows are vendor snapshots and never reach the solver. The percentage above is its success on what it was asked, not on the data."
                  />
                </>
              )}
            </SidePanel>
          ) : null}

          <SidePanel cap="Universe readiness" aside="from the SEPA criteria stats">
            {readinessQ.isLoading ? (
              <span className="text-dense-meta text-muted-foreground">reading the criteria stats…</span>
            ) : readinessQ.isError ? (
              <p className="m-0 text-dense-meta text-muted-foreground">
                The criteria stats did not answer — the rows are absent rather than zero.
              </p>
            ) : (
              <>
                {readinessRows(readinessQ.data ?? {}).map((r) => (
                  <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2.5">
                    <span className="text-dense-label text-[var(--sk-soft)]">{r.label}</span>
                    <span
                      className={cn(
                        'font-mono text-dense-label font-semibold tabular-nums',
                        r.warn ? 'text-warning' : r.owed ? 'text-muted-foreground/60' : '',
                      )}
                      title={r.owed}
                    >
                      {r.owed ? 'owed' : r.value}
                    </span>
                  </div>
                ))}
                {/* The design's own sentence, and the half that matters. */}
                <p className="m-0 border-t border-border pt-2 text-dense-meta leading-normal text-muted-foreground">
                  Readiness is a coverage fact, not a stock pick: a symbol short of bars or statements is
                  excluded from ratings and screens until a backfill lands. Per-symbol detail lives in{' '}
                  <Link to="/research/lens-coverage" className="text-[var(--sk-accent)] hover:underline">
                    Lens Coverage
                  </Link>
                  .
                </p>
              </>
            )}
          </SidePanel>

          <SidePanel cap="Hypotheses store" row>
            {pageState === 'loading' ? (
              <span className="text-dense-meta text-muted-foreground">reading…</span>
            ) : (
              <>
                {/* The per-status counts, which already include `active` —
                    printing `total_active` beside them said 32 twice. */}
                {Object.entries(data?.hypotheses.counts ?? {}).map(([k, v]) => (
                  <DenseTag key={k} variant={k === 'active' ? 'state-blue' : 'neutral'} size="cell">
                    {k} {v}
                  </DenseTag>
                ))}
                <DenseTag variant="neutral" size="cell">
                  total {data?.hypotheses.total ?? 0}
                </DenseTag>
              </>
            )}
          </SidePanel>
        </div>
      </div>
    </PageShell>
  )
}
