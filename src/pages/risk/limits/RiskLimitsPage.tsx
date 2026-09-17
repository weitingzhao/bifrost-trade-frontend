/**
 * Risk · Limits & Breaches — the limits that exist, and what they read now.
 *
 * Two kinds, kept apart because they bind different things. The house lines are
 * the ones this app already enforces and already draws elsewhere, each carrying
 * the reading from the page that owns it (§14.2). The gate is the daemon's own
 * parameter set: real, stored, and binding an engine that is frozen under D10
 * and configured for paper trading, so nothing there can trip today.
 *
 * What does not exist is a record of when a limit was crossed. A breach is
 * computable right now; a history of breaches has no store, and an empty table
 * would read as a clean record rather than as no record at all.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { fmtPct0 } from '@/utils/positions'
import { HOUSE_GATE_PCT, backingPoolUsage, deriveBackingJudgment } from '@/utils/backingJudgment'
import { rollupMargin } from '@/utils/marginPressure'
import { usePressureCeiling } from '@/hooks/usePressureCeiling'
import { fetchModelAnalysis } from '@/api/portfolio'
import { fetchGateSafetyFull, fetchGateSafety } from '@/api/strategy'
import { fetchRiskBeta } from '@/api/research/riskStats'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { usePositionsBook } from '@/hooks/usePositionsBook'
import { RISK_CONCENTRATION_FLOOR, buildRiskExposureRows } from '@/pages/risk/portfolio/riskExposureModel'
import { LIMITS_UNRECORDED, breached, gateParams, houseLimits, watching, type LimitRow } from './limitsModel'

const PAGE_LEAD =
  'The limits that exist and what they read right now. A hard line is one something acts on; a soft line asks to be acknowledged. Every reading here belongs to another page — this one only holds them against a number.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

function limitUseLabel(row: LimitRow): string {
  if (row.use == null) return '—'
  return fmtPct0(row.use)
}

function currentLabel(row: LimitRow): string {
  if (row.current == null) return '—'
  // Every house line here is a ratio except the counts, which have no ceiling.
  return row.ceiling == null ? String(row.current) : fmtPct0(row.current)
}

export default function RiskLimitsPage() {
  const { data: status, isLoading: statusLoading } = useMonitorStatus()
  const { ceiling } = usePressureCeiling()
  const [section, setSection] = useState('house')

  const accountIds = useMemo(
    () => (status?.portfolio?.accounts ?? []).map((a) => (a.account_id ?? '').trim()).filter(Boolean),
    [status],
  )
  const modelQueries = useQueries({
    queries: accountIds.map((id) => ({
      queryKey: ['portfolio', 'model-analysis', id],
      queryFn: () => fetchModelAnalysis(id),
      enabled: Boolean(id),
    })),
  })
  const modelStamp = modelQueries.map((q) => q.dataUpdatedAt).join(',')

  /** Naked short calls, as the model service counts them — not the ITM count. */
  const nakedShortCalls = useMemo(() => {
    let n = 0
    let seen = false
    for (const q of modelQueries) {
      for (const u of q.data?.per_underlying ?? []) {
        const c = Number(u.naked_short_call_contracts ?? 0)
        if (Number.isFinite(c)) {
          n += c
          seen = true
        }
      }
    }
    return seen ? n : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelStamp])

  const model = useMemo(() => {
    const by = new Map<string, { symbol: string; spot: number | null; deltaShares: number | null; deltaDollars: number | null; degraded: boolean; reason: string | null }>()
    for (const q of modelQueries) {
      for (const u of q.data?.per_underlying ?? []) {
        const symbol = (u.symbol ?? '').trim().toUpperCase()
        if (!symbol) continue
        const g = u.greeks ?? {}
        const prev = by.get(symbol)
        by.set(symbol, {
          symbol,
          spot: u.spot ?? prev?.spot ?? null,
          deltaShares: null,
          deltaDollars:
            g.delta_dollars == null && prev?.deltaDollars == null ? null : (prev?.deltaDollars ?? 0) + (g.delta_dollars ?? 0),
          degraded: Boolean(g.degraded),
          reason: g.reason ?? null,
        })
      }
    }
    return [...by.values()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelStamp])

  const symbols = useMemo(() => model.map((m) => m.symbol).sort(), [model])
  const betaQuery = useQuery({
    queryKey: ['research', 'risk', 'beta', symbols.join(','), '60'],
    queryFn: () => fetchRiskBeta(symbols, 'SPY', [60]),
    enabled: symbols.length > 0,
    staleTime: 60 * 60_000,
  })
  const betaBySymbol = useMemo(() => {
    const by = new Map<string, { beta: number | null; n: number }>()
    for (const it of betaQuery.data?.items ?? []) by.set(it.symbol.trim().toUpperCase(), { beta: it.beta, n: it.n })
    return by
  }, [betaQuery.data?.items])

  const { rows: exposure } = useMemo(
    () => buildRiskExposureRows({ model, betaBySymbol, greeks: new Map() }),
    [model, betaBySymbol],
  )

  const book = usePositionsBook({ accountFilter: { host: true, secondary: true }, filterSymbol: '', filterExpiry: '' }, 0)
  const judgment = useMemo(
    () => (book.alarm ? deriveBackingJudgment(backingPoolUsage(book.alarm.book)) : null),
    [book.alarm],
  )
  const margin = useMemo(() => rollupMargin(status?.portfolio?.accounts ?? []), [status])

  const gatesQuery = useQuery({ queryKey: ['strategy', 'gate-safety'], queryFn: fetchGateSafety })
  const activeGate = (gatesQuery.data?.items ?? []).find((g) => g.is_active) ?? null
  const gateFullQuery = useQuery({
    queryKey: ['strategy', 'gate-safety', activeGate?.gate_safety_strategy_id],
    queryFn: () => fetchGateSafetyFull(activeGate!.gate_safety_strategy_id),
    enabled: activeGate != null,
  })
  const params = useMemo(() => gateParams(gateFullQuery.data?.gates), [gateFullQuery.data?.gates])

  const rows = useMemo(
    () =>
      houseLimits({
        backingUsedPct: judgment?.usedPct ?? null,
        backingGatePct: HOUSE_GATE_PCT,
        topNameShare: exposure[0]?.share ?? null,
        concentrationFloor: RISK_CONCENTRATION_FLOOR,
        pressure: margin.pressure,
        pressureCeiling: ceiling,
        nakedShortCalls,
        nakedShortCallLimit: null,
      }),
    [judgment, exposure, margin.pressure, ceiling, nakedShortCalls],
  )
  const over = breached(rows)
  const near = watching(rows)

  const loading = statusLoading
  const error = modelQueries.find((q) => q.error)?.error ?? null

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Limits and Breaches">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Risk / Limits &amp; Breaches</p>}
          title="Limits & Breaches"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              <SegmentControl
                size="xs"
                ariaLabel="Which limits"
                value={section}
                onChange={setSection}
                options={[
                  { value: 'house', label: 'House lines' },
                  { value: 'gate', label: 'The daemon’s gate' },
                ]}
              />
              <span
                className={cn(
                  positionsUi.mono,
                  'text-dense-meta',
                  over.length > 0 ? 'text-warning' : 'text-muted-foreground',
                )}
              >
                {over.length} over · {near.length} close
              </span>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={() => modelQueries.forEach((q) => void q.refetch())} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        ) : section === 'house' ? (
          <>
            <PositionsTier
              label="House lines"
              note="each reading belongs to another page — this one holds it against a number"
            />
            <section className={positionsUi.panel} aria-label="House lines">
              <div className="overflow-x-auto">
                {/* §14.6: seven columns, the design's 900 floor. */}
                <table className="w-full min-w-[900px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '19%' }} />
                    <col style={{ width: '14%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(positionsUi.th, 'text-left')}>Limit</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Kind</th>
                      <th className={positionsUi.th}>Now</th>
                      <th className={positionsUi.th}>Line</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Of the limit</th>
                      <th className={cn(positionsUi.th, 'text-left')}>On breach</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Reading from</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const isOver = r.use != null && r.use > 1
                      const isNear = r.use != null && r.use > 0.8 && r.use <= 1
                      return (
                        <tr key={r.key} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                          <td className={cn(positionsUi.td, 'pl-2 text-left font-sans font-semibold whitespace-normal text-foreground')}>
                            {r.name}{' '}
                            <span className="font-normal text-dense-meta text-muted-foreground">{r.scope}</span>
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans')}>
                            <span
                              className={cn(
                                'inline-flex h-4 items-center rounded-[3px] border px-1.25 font-mono text-dense-micro font-bold tracking-[0.04em]',
                                r.kind === 'hard' ? 'border-lamp-red/45 text-lamp-red' : 'border-border text-muted-foreground',
                              )}
                            >
                              {r.kind.toUpperCase()}
                            </span>
                          </td>
                          <td className={cn(positionsUi.td, isOver ? 'text-warning' : 'text-foreground')}>
                            {currentLabel(r)}
                          </td>
                          <td className={cn(positionsUi.td, 'whitespace-normal text-muted-foreground')}>{r.limit}</td>
                          <td className={cn(positionsUi.td, 'text-left')}>
                            {r.use == null ? (
                              <span className="inline-flex items-start gap-1.5 whitespace-normal text-dense-meta leading-normal text-muted-foreground">
                                <StatusLamp lamp="gray" variant="dot" title="No reading" className="mt-1 shrink-0" />
                                {r.noReading ?? 'no reading'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <span className="inline-block h-1.5 w-20 overflow-hidden rounded-sm bg-[var(--sk-surface)]">
                                  <span
                                    className={cn('block h-full', isOver ? 'bg-lamp-red' : isNear ? 'bg-warning' : 'bg-[var(--sk-line2)]')}
                                    style={{ width: `${Math.min(100, Math.round(r.use * 100))}%` }}
                                  />
                                </span>
                                <span className={cn(positionsUi.mono, 'text-dense-meta', isOver ? 'text-warning' : 'text-muted-foreground')}>
                                  {limitUseLabel(r)}
                                </span>
                              </span>
                            )}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans whitespace-normal text-muted-foreground')}>
                            {r.onBreach}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans')}>
                            <Link to={r.citedFrom.to} className={positionsUi.link}>
                              {r.citedFrom.label} →
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className={cn(FOOT, 'm-0')}>
                A line exactly at its limit is not yet crossed. The pressure ceiling is the one the Owner sets on{' '}
                <Link to="/portfolio/backing" className={positionsUi.link}>
                  Backing &amp; Model
                </Link>
                , and it is the broker&rsquo;s cushion it bounds — not the house gate, which is pool usage.
              </p>
            </section>

            <div className={positionsUi.bandGrid}>
              <section className={cn(positionsUi.panel, over.length > 0 && 'border-warning/40')} aria-label="Over the line">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Over the line</span>
                  <span className={positionsUi.panelTitle}>{over.length === 0 ? 'nothing is over' : `${over.length} now`}</span>
                </header>
                {over.length === 0 ? (
                  <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground text-pretty">
                    Every line with a reading is inside it. {near.length > 0 ? `${near.length} is close.` : ''}
                  </p>
                ) : (
                  over.map((r) => (
                    <div key={r.key} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-border/55 px-3 py-1.75 last:border-b-0">
                      <span className="inline-flex items-center gap-1.5 text-xs leading-normal text-foreground">
                        <StatusLamp lamp={r.kind === 'hard' ? 'red' : 'yellow'} variant="dot" title={r.kind} />
                        {r.name}
                      </span>
                      <span className={cn(positionsUi.mono, 'text-xs font-semibold text-warning')}>
                        {currentLabel(r)} against {r.limit}
                      </span>
                      <span className="min-w-0 flex-[1_1_10rem] text-dense-meta text-muted-foreground text-pretty">
                        {r.onBreach}
                      </span>
                      <Link to={r.citedFrom.to} className={positionsUi.link}>
                        {r.citedFrom.label} →
                      </Link>
                    </div>
                  ))
                )}
                <p className={cn(FOOT, 'm-0')}>{LIMITS_UNRECORDED.ack}</p>
              </section>

              <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="History">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>History</span>
                  <span className={positionsUi.panelTitle}>when a line was crossed</span>
                  <DenseTag variant="warning" size="cell">
                    ⚠ nothing records it
                  </DenseTag>
                </header>
                <p className="m-0 px-3 py-2.5 text-xs leading-normal text-secondary-foreground text-pretty">
                  The useful question is not whether a line is crossed now — the table above answers that — but how long
                  it stayed crossed and what ended it. That needs a row written every time a reading passes a line.
                </p>
                <p className={cn(FOOT, 'm-0')}>{LIMITS_UNRECORDED.history}</p>
              </section>
            </div>
          </>
        ) : (
          <>
            <PositionsTier label="The daemon’s gate" note="stored limits on an engine that is not running" />
            <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="The daemon's gate">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>{activeGate?.name ?? 'no active gate'}</span>
                <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                  {params.length} parameters
                </span>
                <DenseTag variant="warning" size="cell">
                  ⚠ the engine is frozen
                </DenseTag>
                <Link to="/strategy/gates" className={cn(positionsUi.link, 'ml-auto')}>
                  Gates →
                </Link>
              </header>
              {params.length === 0 ? (
                <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">No gate is active.</p>
              ) : (
                <div className="overflow-x-auto">
                  {/* §14.6: three columns, a 560 floor. */}
                  <table className="w-full min-w-[560px] table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '54%' }} />
                      <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={cn(positionsUi.th, 'text-left')}>Section</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Parameter</th>
                        <th className={positionsUi.th}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {params.map((p) => (
                        <tr key={`${p.section}.${p.key}`} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                          <td className={cn(positionsUi.td, 'pl-2 text-left font-sans text-muted-foreground')}>
                            {p.section}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left text-secondary-foreground')}>{p.key}</td>
                          <td className={cn(positionsUi.td, 'text-foreground')}>{p.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className={cn(FOOT, 'm-0')}>{LIMITS_UNRECORDED.daemon}</p>
            </section>
          </>
        )}

        <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
          <span className="font-semibold text-secondary-foreground">Boundary.</span> This page holds readings against
          numbers. Every reading is computed on the page that owns it, and the gate&rsquo;s parameters are edited on{' '}
          <Link to="/strategy/gates" className={positionsUi.link}>
            Gates
          </Link>
          , never here.
        </p>
      </section>
    </PageShell>
  )
}
