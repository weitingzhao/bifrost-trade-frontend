import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { fmtIsoDateToken, fmtUsdRound } from '@/lib/format'
import { pnlColorClass } from '@/utils/dailyChange'
import type { PerformanceResponse } from '@/types/trading'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { useNavHistory } from '@/hooks/useSnapshots'
import { useAccountTransactions } from '@/hooks/useAccountTransactions'
import { perfUi } from './performanceUi'
import { externalFlows, returnBasisFromNav, type ReturnBasis } from './returnBasisModel'

type BasisRow = { op: string; label: string; value: string; recorded: boolean; strong?: boolean; flow?: boolean }

function fmtPctSigned2(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}%`
}

const asPercent = (v: number | null) => (v == null ? null : v * 100)

/**
 * Return basis (Design §14.5). Money crossing the account boundary is not
 * return: the gain is the balance change less deposits and withdrawals, and
 * the headline is time-weighted. Both read the closing net liquidation the
 * nightly snapshot stores per account (api 0.12.0, TD-138) — from the first
 * stored session on, so a range that starts earlier says where the series
 * begins rather than inventing its start.
 *
 * Returns on this basis differ from the Reading's return on capital base (the
 * third card), which divides by today's balance; the two are shown side by
 * side, and switching the headline is a separate decision (§14.5 rule 3).
 */
export function PerformanceReturnBasis({
  perf,
  rangeEndsToday,
  sinceStr,
  untilStr,
}: {
  perf: PerformanceResponse | undefined
  rangeEndsToday: boolean
  sinceStr: string
  untilStr: string
}) {
  const navQuery = useNavHistory()
  const nav = navQuery.data
  const firstSession = nav?.sessions?.[0] ?? null
  const fromTs = firstSession ? Date.parse(`${firstSession}T00:00:00Z`) / 1000 : null
  const txQuery = useAccountTransactions({ fromTs }, { enabled: fromTs != null })
  const basis: ReturnBasis | null = useMemo(() => {
    if (!nav) return null
    return returnBasisFromNav({
      nav: nav.items,
      flows: externalFlows(txQuery.data?.transactions ?? []),
      sinceStr,
      untilStr,
    })
  }, [nav, txQuery.data?.transactions, sinceStr, untilStr])

  const nlvNow = perf?.transaction?.start_equity ?? null
  const netCash = perf?.transaction?.net_cash_flow ?? null
  const base = perf?.transaction?.capital_base ?? null
  const total = perf?.summary ? perf.summary.total_pnl ?? perf.summary.net_pnl + perf.summary.total_unrealized_pnl : null

  const served = nav != null
  const live = basis != null && basis.gain != null
  const startLabel = basis?.startDate
    ? `Net liquidation · ${basis.startRecorded ? 'start of range' : 'first stored session'} (${fmtIsoDateToken(basis.startDate)} close)`
    : 'Net liquidation · start of range'
  const rows: BasisRow[] = live
    ? [
        {
          op: '',
          label: `Net liquidation · end (${fmtIsoDateToken(basis.endDate)} close)`,
          value: fmtUsdRound(basis.navEnd),
          recorded: true,
        },
        { op: '−', label: startLabel, value: fmtUsdRound(basis.navStart), recorded: true },
        {
          op: '=',
          label: 'Balance change',
          value: fmtSignedUsd0((basis.navEnd ?? 0) - (basis.navStart ?? 0)),
          recorded: true,
          strong: true,
        },
        {
          op: '−',
          label: `Deposits − withdrawals in between (${basis.flowRows} ${basis.flowRows === 1 ? 'row' : 'rows'})`,
          value: fmtSignedUsd0(basis.flows),
          recorded: true,
          flow: true,
        },
        {
          op: '=',
          label: 'Investment gain — what return is measured on',
          value: fmtSignedUsd0(basis.gain),
          recorded: true,
          strong: true,
        },
      ]
    : [
        rangeEndsToday && nlvNow != null
          ? { op: '', label: 'Net liquidation · now (end of range)', value: fmtUsdRound(nlvNow), recorded: true }
          : {
              op: '',
              label: 'Net liquidation · end of range',
              value: basis?.navEnd != null ? fmtUsdRound(basis.navEnd) : 'not recorded',
              recorded: basis?.navEnd != null,
            },
        { op: '−', label: startLabel, value: 'not recorded', recorded: false },
        { op: '=', label: 'Balance change', value: '—', recorded: false, strong: true },
        { op: '−', label: 'Cash transactions in range, net', value: fmtSignedUsd0(netCash), recorded: netCash != null, flow: true },
        { op: '=', label: 'Investment gain — what return may be measured on', value: '—', recorded: false, strong: true },
      ]

  const needs = !served
    ? 'Not computed — this API does not serve the stored net liquidation yet (trade-api 0.12.0).'
    : 'Not computed — needs closing net liquidation on at least two sessions in the range.'
  const span =
    live && basis.startDate && basis.endDate
      ? `${fmtIsoDateToken(basis.startDate)} → ${fmtIsoDateToken(basis.endDate)} · ${basis.subPeriods} sub-${basis.subPeriods === 1 ? 'period' : 'periods'}`
      : null
  const methods = [
    {
      name: 'Time-weighted return',
      value: live && basis.twr != null ? fmtPctSigned2(asPercent(basis.twr)) : 'not computed',
      tone: live && basis.twr != null ? pnlColorClass(basis.twr) : 'text-muted-foreground',
      formula: 'Π (1 + r_sub) − 1 · r_sub = (NAV₁ − flows) ÷ NAV₀ − 1, one per pair of stored closes',
      when: live
        ? `The headline basis. ${span}.${basis.accountsLeftOut ? ` ${basis.accountsLeftOut} account-session${basis.accountsLeftOut === 1 ? '' : 's'} left out where an account had no closing NAV at one end.` : ''}`
        : `The headline. Chaining sub-periods removes the timing and the size of transfers from the number. ${needs}`,
      headline: true,
    },
    {
      name: 'Modified Dietz',
      value: live && basis.dietz != null ? fmtPctSigned2(asPercent(basis.dietz)) : 'not computed',
      tone: live && basis.dietz != null ? pnlColorClass(basis.dietz) : 'text-muted-foreground',
      formula: 'gain ÷ (begin + Σ weight × flow) · weight = days remaining ÷ days in period',
      when: live
        ? 'The one-period cross-check over the same span, each flow weighted by how long it was in the account.'
        : `The fallback while no daily net-liq series is stored. ${needs}`,
      headline: false,
    },
  ]

  return (
    <section className={perfUi.panel} id="return-basis" aria-label="Return basis">
      <header className={perfUi.panelHead}>
        <span className={perfUi.cap}>Return basis</span>
        <span className={perfUi.panelTitle}>net of external cash flow</span>
        {!served ? (
          <DenseTag variant="warning" size="cell">⚠ designed · not wired</DenseTag>
        ) : live && !basis.startRecorded ? (
          <DenseTag variant="warning" size="cell" title="The range starts before the first stored session.">
            ⚠ series since {fmtIsoDateToken(basis.startDate)} · {basis.sessions.length}{' '}
            {basis.sessions.length === 1 ? 'session' : 'sessions'}
          </DenseTag>
        ) : !live ? (
          <DenseTag variant="warning" size="cell">⚠ fewer than two stored closes in range</DenseTag>
        ) : null}
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
            External cash flow moves the balance without earning anything: deposits and withdrawals (Transfer &amp;
            Pay&rsquo;s Transfer kind) come out; dividends, fees, tax and interest stay in the gain.{' '}
            {served
              ? `Closing net liquidation per account is stored nightly from ${fmtIsoDateToken(firstSession)}${nav.dropped.length ? `; ${nav.dropped.length} account-session${nav.dropped.length === 1 ? ' was' : 's were'} read before the close and are left out` : ''}.`
              : 'What unlocks the live figure is one daily row per account — net liquidation plus its snapshot time (SNAPSHOT-SPEC §1.1).'}
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
                <span className={cn(perfUi.mono, 'ml-auto text-dense-body', m.tone)}>{m.value}</span>
              </span>
              <span className={cn(perfUi.mono, 'text-dense-caption text-muted-foreground text-pretty')}>{m.formula}</span>
              <span className="text-dense-meta text-muted-foreground text-pretty">{m.when}</span>
            </span>
          ))}
          <span className="flex flex-col gap-0.5 rounded-sm bg-[var(--sk-raised)] px-2 py-1.5">
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
              differently as the balance moves. Moving the Reading onto the time-weighted basis changes the figures it
              shows for past ranges — that switch is its own decision.
            </span>
          </span>
        </div>
      </div>
    </section>
  )
}
