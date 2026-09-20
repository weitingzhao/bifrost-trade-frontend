import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { fmtUsdRound } from '@/lib/format'
import { pnlColorClass } from '@/utils/dailyChange'
import type { PerformanceResponse } from '@/types/trading'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { perfUi } from './performanceUi'

type BasisRow = { op: string; label: string; value: string; recorded: boolean; strong?: boolean; flow?: boolean }

function fmtPctSigned2(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}%`
}

/**
 * Return basis (Design §14.5, `designed · not wired`). Money crossing the account
 * boundary is not return. The page cannot net it out yet: nothing stores net
 * liquidation at the start of a range, so the balance rows read `not recorded`
 * and the two return methods read `not computed`. The third card says what the
 * Reading's return actually divides by today.
 */
export function PerformanceReturnBasis({
  perf,
  rangeEndsToday,
}: {
  perf: PerformanceResponse | undefined
  rangeEndsToday: boolean
}) {
  const nlvNow = perf?.transaction?.start_equity ?? null
  const netCash = perf?.transaction?.net_cash_flow ?? null
  const base = perf?.transaction?.capital_base ?? null
  const total = perf?.summary ? perf.summary.total_pnl ?? perf.summary.net_pnl + perf.summary.total_unrealized_pnl : null

  const rows: BasisRow[] = [
    rangeEndsToday && nlvNow != null
      ? { op: '', label: 'Net liquidation · now (end of range)', value: fmtUsdRound(nlvNow), recorded: true }
      : { op: '', label: 'Net liquidation · end of range', value: 'not recorded', recorded: false },
    { op: '−', label: 'Net liquidation · start of range', value: 'not recorded', recorded: false },
    { op: '=', label: 'Balance change', value: '—', recorded: false, strong: true },
    { op: '−', label: 'Cash transactions in range, net', value: fmtSignedUsd0(netCash), recorded: netCash != null, flow: true },
    { op: '=', label: 'Investment gain — what return may be measured on', value: '—', recorded: false, strong: true },
  ]

  const needs = 'Not computed — needs net liquidation at the start of the range.'
  const methods = [
    {
      name: 'Time-weighted return',
      value: 'not computed',
      formula: 'Π (1 + r_sub) − 1 · sub-periods cut at every external flow',
      when: `The headline. Chaining sub-periods removes the timing and the size of transfers from the number. ${needs}`,
      headline: true,
    },
    {
      name: 'Modified Dietz',
      value: 'not computed',
      formula: 'gain ÷ (begin + Σ weight × flow) · weight = days remaining ÷ days in period',
      when: `The fallback while no daily net-liq series is stored: one period, each flow weighted by how long it was in the account. ${needs}`,
      headline: false,
    },
  ]

  return (
    <section className={perfUi.panel} id="return-basis" aria-label="Return basis">
      <header className={perfUi.panelHead}>
        <span className={perfUi.cap}>Return basis</span>
        <span className={perfUi.panelTitle}>net of external cash flow</span>
        <DenseTag variant="warning" size="cell">⚠ designed · not wired</DenseTag>
        <Link to="/portfolio/transfer" className={cn(perfUi.link, 'ml-auto')}>
          cash events → Transfer &amp; Pay
        </Link>
      </header>
      <div className="flex flex-wrap gap-x-5.5 gap-y-3 px-3 py-2.25">
        <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-0.75">
          <span className={cn(perfUi.cap, perfUi.soft)}>Balance change is not return</span>
          {rows.map(r => (
            <span key={r.label} className="flex items-baseline gap-2 border-b border-border/40 py-0.5">
              <span className={cn(perfUi.mono, 'w-3 text-dense-meta text-muted-foreground')}>{r.op}</span>
              <span className={cn('text-xs', r.strong ? 'text-foreground' : 'text-muted-foreground')}>{r.label}</span>
              <span
                className={cn(
                  perfUi.mono,
                  'ml-auto text-xs',
                  !r.recorded ? 'text-muted-foreground' : r.flow ? cn('font-semibold', perfUi.sky) : cn('font-semibold', perfUi.soft),
                )}
              >
                {r.value}
              </span>
            </span>
          ))}
          <span className={cn(perfUi.note, 'text-pretty')}>
            External cash flow moves the balance without earning anything. The cash line is every transaction Transfer
            &amp; Pay records in the range, dividends and fees included. What unlocks the live figure is one daily row
            per account — net liquidation plus its snapshot time (SNAPSHOT-SPEC §1.1).
          </span>
        </div>

        <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-1.25">
          <span className={cn(perfUi.cap, perfUi.soft)}>Which return</span>
          {methods.map(m => (
            <span
              key={m.name}
              className={cn(
                'flex flex-col gap-0.5 rounded-sm border px-2 py-1.5',
                m.headline ? 'border-[var(--chart-1)]/40' : 'border-border',
              )}
            >
              <span className="flex flex-wrap items-baseline gap-2">
                <span className={cn('text-xs font-semibold', m.headline ? perfUi.lime : perfUi.soft)}>
                  {m.name}
                </span>
                <span className={cn(perfUi.mono, 'ml-auto text-dense-body text-muted-foreground')}>{m.value}</span>
              </span>
              <span className={cn(perfUi.mono, 'text-dense-caption text-muted-foreground text-pretty')}>{m.formula}</span>
              <span className="text-dense-meta text-muted-foreground text-pretty">{m.when}</span>
            </span>
          ))}
          <span className="flex flex-col gap-0.5 rounded-sm border border-dashed border-border px-2 py-1.5">
            <span className="flex flex-wrap items-baseline gap-2">
              <span className="text-xs font-semibold text-foreground">Used today · return on capital base</span>
              <span className={cn(perfUi.mono, 'ml-auto text-dense-body font-bold', pnlColorClass(perf?.summary?.return_pct))}>
                {fmtPctSigned2(perf?.summary?.return_pct)}
              </span>
            </span>
            <span className={cn(perfUi.mono, 'text-dense-caption text-muted-foreground text-pretty')}>
              total P&amp;L {fmtSignedUsd0(total)} ÷ (net liquidation now {fmtUsdRound(nlvNow)} + ½ × net cash{' '}
              {fmtSignedUsd0(netCash)}) = base {fmtUsdRound(base)}
            </span>
            <span className="text-dense-meta text-muted-foreground text-pretty">
              What Reading shows today. The base is today’s balance, not the range’s start, so a past range reads
              differently as the balance moves.
            </span>
          </span>
        </div>
      </div>
    </section>
  )
}
