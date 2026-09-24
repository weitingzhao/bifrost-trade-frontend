/**
 * Backtest run detail — one run of `POST /research/backtest/event-query` or a
 * persisted `research.backtest_run` row (design `Research Backtest.dc.html`).
 *
 * Confidence tag on the design's own thresholds (n < 5 noise, < 30 thin),
 * summary tiles, win/loss bar, equity and per-event histogram from real event
 * trades (persisted runs carry none and say so), walk-forward and SPY
 * buy-hold read with tolerant parsers written against the engine's actual
 * payloads — the previous card's types described a shape the server never
 * sent, unnoticed because no persisted run on DEV carries either.
 *
 * All colors use site-wide tokens (`text-profit` / `text-loss` /
 * `pnlColorClass()`).
 */
import { Beaker, GitCommit, Info, Layers } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTableCellPadding,
  denseTableNumCell,
  DenseTag,
  EmptyState,
} from '@/components/data-display'
import { pnlColorClass } from '@/utils/dailyChange'
import {
  equityFrom,
  histogramFrom,
  parseBenchmark,
  parseWalkForward,
  runConfidence,
} from '@/utils/backtestRuns'
import { fmtNumLocale, fmtPctFromFraction } from '@/lib/format'
import type {
  BacktestRunRow,
  EventQueryResponse,
  EventRun,
} from '@/api/research/backtestEvent'

function fmtDollar(v: number | null | undefined, digits = 2): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return '—'
  const sign = v > 0 ? '+' : v < 0 ? '−' : ''
  return `${sign}$${Math.abs(v).toFixed(digits)}`
}

function pctSigned(v: number | null, digits = 1): string {
  if (v == null) return '—'
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v * 100).toFixed(digits)}%`
}

/** The design's 320×96 equity frame with its 28px drawdown strip. */
function EquityChart({ runs }: { runs: EventRun[] }) {
  const eq = equityFrom(runs)
  if (!eq) return null
  const N = eq.cums.length
  const lo = Math.min(0, ...eq.cums)
  const hi = Math.max(0, ...eq.cums)
  const span = hi - lo || 1
  const X = (i: number) => (N === 1 ? 160 : (i / (N - 1)) * 320)
  const Y = (v: number) => 90 - ((v - lo) / span) * 84
  const ddSpan = -eq.maxDd || 1
  return (
    <div className="min-w-0 rounded-md border border-border bg-background px-3 py-2.5">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Equity · cum P&L
        </span>
        <span className="font-mono text-dense-caption tabular-nums text-muted-foreground">
          last <span className={pnlColorClass(eq.last)}>{fmtDollar(eq.last, 0)}</span>
        </span>
      </div>
      <svg viewBox="0 0 320 96" preserveAspectRatio="none" className="block h-24 w-full">
        <line x1="0" y1={Y(0)} x2="320" y2={Y(0)} stroke="var(--border)" strokeWidth="1" />
        <polyline
          points={eq.cums.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="1.5"
        />
        <circle
          cx={X(N - 1)}
          cy={Y(eq.cums[N - 1])}
          r="2.5"
          fill="var(--sk-accent)"
        />
      </svg>
      <svg viewBox="0 0 320 28" preserveAspectRatio="none" className="mt-0.5 block h-7 w-full">
        <path
          d={`M0,0 ${eq.dds.map((d, i) => `L${X(i).toFixed(1)},${((-d / ddSpan) * 27).toFixed(1)}`).join(' ')} L320,0 Z`}
          fill="var(--color-loss)"
          opacity="0.55"
        />
        <line x1="0" y1="0.5" x2="320" y2="0.5" stroke="var(--border)" strokeWidth="1" />
      </svg>
      <div className="mt-1 flex justify-between text-dense-caption text-muted-foreground">
        <span>
          drawdown · max{' '}
          <span className="font-mono text-loss">{fmtDollar(eq.maxDd, 0)}</span>
        </span>
        <span>{N} events, trade order</span>
      </div>
    </div>
  )
}

function PnlHistogram({ runs }: { runs: EventRun[] }) {
  const h = histogramFrom(runs)
  if (!h) return null
  return (
    <div className="min-w-0 rounded-md border border-border bg-background px-3 py-2.5">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          P&L per event
        </span>
        <span className="font-mono text-dense-caption tabular-nums text-muted-foreground">
          median <span className="text-foreground">{fmtDollar(h.median, 0)}</span>
        </span>
      </div>
      <div className="relative flex h-24 items-end gap-0.5">
        {h.bins.map((b, i) => (
          <div
            key={i}
            title={`${fmtDollar(b.lo, 0)} … ${fmtDollar(b.hi, 0)} · ${b.count}`}
            className="flex-1 rounded-t-[1px]"
            style={{
              height: `${Math.max(2, (b.count / (h.maxCount || 1)) * 100).toFixed(0)}%`,
              background:
                (b.lo + b.hi) / 2 >= 0 ? 'var(--sk-line2)' : 'var(--sk-line0)',
            }}
          />
        ))}
        <span
          className="absolute inset-y-0 w-px bg-[var(--sk-faint,var(--border))]"
          style={{ left: `${h.zeroPct.toFixed(1)}%` }}
        />
        <span
          className="absolute inset-y-0 -ml-px w-0.5 bg-[var(--sk-accent)]"
          style={{ left: `${h.medianPct.toFixed(1)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-dense-caption text-muted-foreground">
        <span className="font-mono">{fmtDollar(h.lo, 0)}</span>
        <span>grey rule = zero · violet = median</span>
        <span className="font-mono">{fmtDollar(h.hi, 0)}</span>
      </div>
    </div>
  )
}

interface BacktestRunResultCardProps {
  response: EventQueryResponse
}

export function BacktestRunResultCard({ response }: BacktestRunResultCardProps) {
  const summary = response.summary
  const runs: EventRun[] = response.runs ?? []

  // An event the engine could not price says nothing about the strategy. These
  // separate "no edge" from "no history", which the card used to render alike.
  const noOption = summary.skipped_no_option ?? 0
  const noStock = summary.skipped_no_stock ?? 0
  const skipped = summary.skipped_events ?? noOption + noStock
  const conf = runConfidence(summary.n_events)
  const noise = conf.level === 'noise'

  const coverage = (() => {
    if (skipped === 0 && !noise) return null
    const parts: string[] = []
    if (noOption > 0) {
      parts.push(
        `${noOption} event${noOption === 1 ? '' : 's'} skipped — no option data covers those dates`,
      )
    }
    if (noStock > 0) {
      parts.push(
        `${noStock} event${noStock === 1 ? '' : 's'} skipped — outside the daily price history`,
      )
    }
    if (summary.n_events > 0 && noise) {
      parts.push(
        `${summary.n_events} priced event${summary.n_events === 1 ? '' : 's'} is too small a sample to read a win rate from`,
      )
    }
    return parts.length > 0 ? parts.join(' · ') : null
  })()

  const walkForward = parseWalkForward(response.walk_forward)
  const benchmark = parseBenchmark(response.benchmark)
  const persisted = Boolean(response.run_id)

  const wins = Math.round(summary.win_rate * summary.n_events)
  const losses = Math.max(0, summary.n_events - wins)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Beaker className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-dense-body font-semibold">Run result</h3>
        {response.run_id && (
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-dense-caption text-muted-foreground">
            {response.run_id}
          </span>
        )}
        {response.event_source && (
          <span className="text-dense-caption text-muted-foreground">
            source: <code className="rounded bg-muted px-1 py-0.5">{response.event_source}</code>
          </span>
        )}
        <DenseTag size="cell" variant={conf.variant}>
          {conf.label}
        </DenseTag>
        <span className="text-dense-caption text-muted-foreground">{conf.note}</span>
      </div>

      {response.event_source_notes && (
        <Alert>
          <AlertDescription className="text-dense-meta">
            <Info className="mr-1 inline h-3.5 w-3.5" />
            {response.event_source_notes}
          </AlertDescription>
        </Alert>
      )}

      {!persisted && (response as EventQueryResponse & { run?: BacktestRunRow }).run?.error && (
        <Alert variant="destructive">
          <AlertDescription className="text-dense-meta">
            Run not persisted:{' '}
            {(response as EventQueryResponse & { run?: BacktestRunRow }).run?.error}
          </AlertDescription>
        </Alert>
      )}

      {coverage ? (
        <Alert>
          <AlertDescription className="text-dense-meta">{coverage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <SummaryTile
          label="Events"
          value={fmtNumLocale(summary.n_events, 0)}
          note={skipped > 0 ? `${skipped} skipped` : 'none skipped'}
        />
        <SummaryTile
          label="Win rate"
          value={fmtPctFromFraction(summary.win_rate)}
          note={`${wins} of ${summary.n_events}`}
          tone={
            noise
              ? 'muted'
              : summary.win_rate > 0.55
                ? 'profit'
                : summary.win_rate < 0.45
                  ? 'loss'
                  : 'muted'
          }
        />
        <SummaryTile
          label="Avg P&L"
          value={fmtDollar(summary.avg_pnl)}
          note="per event · net"
          tone={noise ? 'muted' : summary.avg_pnl > 0 ? 'profit' : summary.avg_pnl < 0 ? 'loss' : 'muted'}
        />
        <SummaryTile
          label="Median P&L"
          value={fmtDollar(summary.median_pnl)}
          note={summary.avg_pnl > summary.median_pnl ? 'right skew' : 'left skew'}
          tone={noise ? 'muted' : summary.median_pnl > 0 ? 'profit' : summary.median_pnl < 0 ? 'loss' : 'muted'}
        />
        <SummaryTile
          label="Sharpe"
          value={noise ? '—' : fmtNumLocale(summary.sharpe_annual)}
          note={noise ? 'withheld · n < 5' : 'annualised'}
          tone={noise ? 'muted' : summary.sharpe_annual > 0.5 ? 'profit' : summary.sharpe_annual < 0 ? 'loss' : 'muted'}
        />
        <SummaryTile
          label="Max drawdown"
          value={fmtDollar(summary.max_drawdown)}
          note="peak → trough"
          tone="loss"
        />
      </div>

      {summary.n_events > 0 ? (
        <div>
          <div className="flex h-1.5 overflow-hidden rounded-[3px] bg-muted">
            <span
              style={{ width: `${((wins / summary.n_events) * 100).toFixed(1)}%` }}
              className={noise ? 'bg-[var(--sk-line2)]' : 'bg-profit'}
            />
            <span
              style={{ width: `${((losses / summary.n_events) * 100).toFixed(1)}%` }}
              className={noise ? 'bg-[var(--sk-line0)]' : 'bg-loss'}
            />
          </div>
          <div className="mt-1 flex justify-between text-dense-caption text-muted-foreground">
            <span className="font-mono">
              {wins} wins · {losses} losses
            </span>
            {noise ? <span>greys on purpose — noise</span> : null}
          </div>
        </div>
      ) : null}

      {runs.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <EquityChart runs={runs} />
          <PnlHistogram runs={runs} />
        </div>
      ) : null}

      {runs.length === 0 ? (
        <Card variant="elevated">
          <CardContent className="px-3 py-6">
            <EmptyState
              icon={<Beaker />}
              title={
                persisted
                  ? 'Persisted run — per-event trades are not stored'
                  : 'No event trades produced'
              }
              description={
                persisted
                  ? 'Summary, walk-forward and benchmark come from research.backtest_run. Rerun to regenerate the leg-level table, equity and histogram.'
                  : noOption > 0
                    ? `${noOption} event${noOption === 1 ? '' : 's'} matched but could not be priced — no option data covers those dates. A stock-only template can run on this window.`
                    : noStock > 0
                      ? `${noStock} event${noStock === 1 ? '' : 's'} matched but fall outside the daily price history.`
                      : 'No events matched the criteria over the selected lookback window. Widen the window or relax parameters.'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="mb-1 flex items-center gap-2 text-dense-label font-semibold text-muted-foreground">
            <GitCommit className="h-3.5 w-3.5" />
            Per-event trades ({runs.length})
          </div>
          <DenseDataTable scrollX>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead className={denseTableCellPadding}>Event date</DenseTableHead>
                <DenseTableHead className={denseTableCellPadding}>Symbol</DenseTableHead>
                <DenseTableHead className={denseTableCellPadding}>Entry</DenseTableHead>
                <DenseTableHead className={denseTableCellPadding}>Exit</DenseTableHead>
                <DenseTableHead className={denseTableNumCell}>P&L</DenseTableHead>
                <DenseTableHead className={denseTableNumCell}>MFE</DenseTableHead>
                <DenseTableHead className={denseTableNumCell}>MAE</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {runs.map((r, idx) => (
                <DenseTableRow key={`${r.symbol}-${r.event_date}-${idx}`}>
                  <DenseTableCell className={denseTableCellPadding}>{r.event_date}</DenseTableCell>
                  <DenseTableCell className={`${denseTableCellPadding} font-mono`}>
                    {r.symbol}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableCellPadding}>{r.entry_ts}</DenseTableCell>
                  <DenseTableCell className={denseTableCellPadding}>{r.exit_ts}</DenseTableCell>
                  <DenseTableCell className={`${denseTableNumCell} ${pnlColorClass(r.pnl)}`}>
                    {fmtDollar(r.pnl)}
                  </DenseTableCell>
                  <DenseTableCell
                    className={`${denseTableNumCell} ${
                      r.mfe > 0 ? 'text-profit' : 'text-muted-foreground'
                    }`}
                  >
                    {fmtDollar(r.mfe)}
                  </DenseTableCell>
                  <DenseTableCell
                    className={`${denseTableNumCell} ${
                      r.mae < 0 ? 'text-loss' : 'text-muted-foreground'
                    }`}
                  >
                    {fmtDollar(r.mae)}
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseDataTable>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center gap-2 text-dense-label font-semibold text-muted-foreground">
          <Layers className="h-3.5 w-3.5" />
          Walk-forward
          <span className="font-normal">
            · IS 12m · OOS 3m · P&L proxy series (RS-C3 v1)
          </span>
        </div>
        {walkForward ? (
          <>
            <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4">
              <SummaryTile
                label="OOS windows"
                value={fmtNumLocale(walkForward.nWindows, 0)}
                note="rolling, no overlap"
              />
              <SummaryTile
                label="Mean OOS return"
                value={pctSigned(walkForward.avgTotal)}
                note="of the proxy series"
                tone={
                  walkForward.avgTotal == null
                    ? 'muted'
                    : walkForward.avgTotal > 0
                      ? 'profit'
                      : 'loss'
                }
              />
              <SummaryTile
                label="Positive windows"
                value={`${walkForward.windows.filter((w) => (w.oosTotal ?? 0) > 0).length} / ${walkForward.windows.length}`}
                note="OOS return above zero"
              />
              <SummaryTile
                label="Avg OOS Sharpe"
                value={walkForward.avgSharpe != null ? fmtNumLocale(walkForward.avgSharpe) : '—'}
                note={
                  walkForward.medianSharpe != null
                    ? `median ${fmtNumLocale(walkForward.medianSharpe)}`
                    : 'median —'
                }
                tone={
                  walkForward.avgSharpe == null
                    ? 'muted'
                    : walkForward.avgSharpe > 0.5
                      ? 'profit'
                      : walkForward.avgSharpe < 0
                        ? 'loss'
                        : 'muted'
                }
              />
            </div>
            <DenseDataTable scrollX>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead className={denseTableCellPadding}>#</DenseTableHead>
                  <DenseTableHead className={denseTableCellPadding}>OOS window</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>OOS return</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>OOS Sharpe</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>OOS win</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Days</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {walkForward.windows.map((w, i) => (
                  <DenseTableRow key={`${w.oosStart}-${i}`}>
                    <DenseTableCell className={denseTableCellPadding}>{i + 1}</DenseTableCell>
                    <DenseTableCell className={`${denseTableCellPadding} font-mono`}>
                      {w.oosStart ?? '—'} → {w.oosEnd ?? '—'}
                    </DenseTableCell>
                    <DenseTableCell
                      className={`${denseTableNumCell} ${w.oosTotal != null ? pnlColorClass(w.oosTotal) : 'text-muted-foreground'}`}
                    >
                      {pctSigned(w.oosTotal)}
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {w.oosSharpe != null ? fmtNumLocale(w.oosSharpe) : '—'}
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {w.oosWin != null ? fmtPctFromFraction(w.oosWin) : '—'}
                    </DenseTableCell>
                    <DenseTableCell className={`${denseTableNumCell} text-muted-foreground`}>
                      {w.oosN ?? '—'}
                    </DenseTableCell>
                  </DenseTableRow>
                ))}
              </DenseTableBody>
            </DenseDataTable>
            <p className="mt-1 text-dense-caption text-muted-foreground">
              The engine sends no in-sample metrics (fit is null in RS-C3 v1), so there is no
              IS column and no OOS / IS decay figure — unmeasured, not omitted.
            </p>
          </>
        ) : (
          <Card variant="elevated">
            <CardContent className="px-3 py-5">
              <EmptyState
                title="Walk-forward not requested for this run"
                description="Rerun with include_walk_forward to get OOS windows. With few priced events the windows would be empty anyway."
              />
            </CardContent>
          </Card>
        )}
      </div>

      {benchmark ? (
        <div>
          <div className="mb-1 flex items-center gap-2 text-dense-label font-semibold text-muted-foreground">
            <GitCommit className="h-3.5 w-3.5" />
            SPY buy-hold · same window, P&L proxy series
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <SummaryTile
              label="Total return"
              value={pctSigned(benchmark.totalReturn)}
              note={`${benchmark.startDate ?? '—'} → ${benchmark.endDate ?? '—'}`}
              tone={
                benchmark.totalReturn == null
                  ? 'muted'
                  : benchmark.totalReturn > 0
                    ? 'profit'
                    : 'loss'
              }
            />
            <SummaryTile
              label="CAGR"
              value={pctSigned(benchmark.cagr)}
              note="annualised"
            />
            <SummaryTile
              label="Sharpe"
              value={benchmark.sharpe != null ? fmtNumLocale(benchmark.sharpe) : '—'}
              note="annualised"
            />
            <SummaryTile
              label="Max drawdown"
              value={benchmark.maxDd != null ? pctSigned(benchmark.maxDd) : '—'}
              note={`${benchmark.n ?? '—'} observations`}
              tone="loss"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SummaryTile({
  label,
  value,
  note,
  tone = 'muted',
}: {
  label: string
  value: string
  note?: string
  tone?: 'profit' | 'loss' | 'muted'
}) {
  const toneClass =
    tone === 'profit' ? 'text-profit' : tone === 'loss' ? 'text-loss' : 'text-foreground'
  return (
    <Card variant="elevated">
      <CardContent className="px-3 py-2">
        <span className="text-dense-caption uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <p className={`font-mono text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
        {note ? <p className="m-0 text-dense-caption text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  )
}
