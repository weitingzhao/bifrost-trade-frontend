/**
 * Research › Validate › Pine library › one script (`/research/pine/<id>`,
 * ledger B7, Owner 2026-10-06 option B): everything the app knows about one
 * script on one page — what the build stored, the edge after its signals on
 * both sides, when and where it fired, its latest signals, and the simulator
 * runs that entered on it. Before this the same answers were spread over
 * Signal Decay, the Simulator and the chart. A first cut in the existing panel
 * language; Design has not drawn it. Nothing here places an order (D10).
 */
import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ViewState } from '@bifrost/ui'
import { PageHead, PageHeadLink, PageShell } from '@/components/layout'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { cap, mono, panel, panelHead, td, th } from '@/components/research/labFaceUi'
import { firstResearchAuthGapError } from '@/lib/auth/researchAuthGap'
import { useResearchAuth } from '@/lib/auth/researchUser'
import { pineChartSignalOf, pineLibraryPath, withChartSignal, withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { HttpError } from '@/lib/http'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useBacktestRuns } from '@/hooks/useBacktestEventQuery'
import { usePineRun } from '@/hooks/usePineRun'
import { fetchPineSignalStats, fetchPineSummary, type PineSide, type PineSignalStats, type PineSummary } from '@/api/research/pine'
import type { BacktestRunRow } from '@/api/research/backtestEvent'
import { PineEdgeTable } from './PineTryPanel'
import { PineRunControl } from './PineRunControl'
import { STRUCTURE_LABEL, isSimRun, signedPct, simStructure, simSummaryOf, simUsd } from './simRuns'

const HORIZONS = [5, 10, 20] as const
const SIDES: readonly PineSide[] = ['buy', 'sell']
/** The runs list the Simulator reads; a script's runs are found among these. */
const RUNS_LIMIT = 100

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** Every month from `first` to `last` (YYYY-MM), so a quiet month reads as a gap, not as nothing. */
export function monthSpan(rows: PineSummary['by_month']): PineSummary['by_month'] {
  if (!rows.length) return []
  const have = new Map(rows.map((r) => [r.month, r]))
  const [y0, m0] = rows[0].month.split('-').map(Number)
  const [y1, m1] = rows[rows.length - 1].month.split('-').map(Number)
  const out: PineSummary['by_month'] = []
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? ((y += 1), (m = 1)) : (m += 1)) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    out.push(have.get(key) ?? { month: key, buy: 0, sell: 0 })
  }
  return out
}

/** The simulator runs whose entry was this script's signal, newest first. */
export function runsOfScript(rows: readonly BacktestRunRow[], id: string): BacktestRunRow[] {
  return rows.filter(
    (r) => isSimRun(r) && r.event_def?.kind === 'pine_signal' && String((r.event_def.params as Record<string, unknown>)?.script ?? '') === id,
  )
}

function MonthBars({ months }: { months: PineSummary['by_month'] }) {
  const span = monthSpan(months)
  const top = Math.max(1, ...span.map((m) => Math.max(m.buy, m.sell)))
  return (
    <div className="space-y-1">
      <div className="flex h-28 items-stretch gap-px" role="img" aria-label="Signals by month, buy above the line and sell below">
        {span.map((m) => (
          <div key={m.month} className="flex min-w-[3px] flex-1 flex-col" title={`${m.month} · ▲ ${m.buy} · ▼ ${m.sell}`}>
            <div className="flex flex-1 items-end">
              <div className="w-full bg-foreground/55" style={{ height: `${(m.buy / top) * 100}%` }} />
            </div>
            <div className="h-px bg-border" />
            <div className="flex flex-1 items-start">
              <div className="w-full bg-foreground/25" style={{ height: `${(m.sell / top) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className={cn(mono, 'flex justify-between text-dense-micro text-muted-foreground')}>
        <span>{span[0]?.month}</span>
        <span>▲ buy above · ▼ sell below · tallest month {top.toLocaleString('en-US')}</span>
        <span>{span[span.length - 1]?.month}</span>
      </div>
    </div>
  )
}

interface RecentRow {
  side: PineSide
  symbol: string
  date: string
  ret: Record<number, number | null>
  counted: boolean
}

function recentRows(stats: Partial<Record<PineSide, PineSignalStats>>): RecentRow[] {
  const rows: RecentRow[] = []
  for (const side of SIDES) {
    for (const r of stats[side]?.recent ?? []) {
      const ret: Record<number, number | null> = {}
      for (const h of HORIZONS) ret[h] = (r[`ret_${h}`] as number | null | undefined) ?? null
      // A signal too new for its first horizon has no return yet and is not counted either — that is not the cooldown.
      const settled = ret[HORIZONS[0]] != null
      rows.push({ side, symbol: r.symbol, date: r.date, ret, counted: !settled || r[`counted_${HORIZONS[0]}`] !== false })
    }
  }
  return rows.sort((a, b) => (a.date === b.date ? a.symbol.localeCompare(b.symbol) : a.date < b.date ? 1 : -1)).slice(0, 50)
}

export default function PineReportPage() {
  const { scriptId = '' } = useParams<{ scriptId: string }>()
  const auth = useResearchAuth()
  const summaryQ = useQuery({
    queryKey: QUERY_KEYS.researchEngine.pineSummary(scriptId),
    queryFn: () => fetchPineSummary(scriptId),
    enabled: Boolean(scriptId),
    staleTime: 60_000,
    retry: (n, e) => !(e instanceof HttpError && e.status === 404) && n < 2,
  })
  const summary = summaryQ.data
  const sides = SIDES.filter((s) => summary?.script.signals.includes(s))
  const statQs = useQueries({
    queries: sides.map((side) => ({
      queryKey: QUERY_KEYS.researchEngine.pineSignalStats(scriptId, side, 'report'),
      queryFn: () => fetchPineSignalStats({ script: scriptId, side, horizons: [...HORIZONS], detail: true }),
      enabled: Boolean(summary?.signals),
      staleTime: 10 * 60_000,
    })),
  })
  const stats: Partial<Record<PineSide, PineSignalStats>> = {}
  sides.forEach((s, i) => {
    if (statQs[i]?.data) stats[s] = statQs[i].data
  })
  const runsQ = useBacktestRuns({ limit: RUNS_LIMIT })
  const sims = useMemo(() => runsOfScript(runsQ.data?.rows ?? [], scriptId), [runsQ.data, scriptId])
  const run = usePineRun(scriptId)

  const script = summary?.script
  const chartHref = (sym: string) => withSymbolParam(withChartSignal(SYMBOL_PATH, pineChartSignalOf(scriptId)), sym)
  const stale = summary && summary.built_version != null && summary.built_version !== script?.version
  const cost = Object.values(stats)[0]?.method?.cost_bps_one_way
  const recent = recentRows(stats)

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead
        title={script?.name ?? scriptId}
        info="One Pine script on one page: what the nightly build stored, the edge after its buy and sell signals, when and on which names it fired, and the simulator runs that entered on it. Run now builds it without waiting for 22:30 ET. Nothing on this page places an order."
        meta={
          script ? (
            <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
              {script.id} · v{script.version} · {script.origin === 'user' ? 'mine' : script.origin} · {script.is_active ? 'active' : 'off'}
            </span>
          ) : null
        }
        actions={
          <>
            <PageHeadLink to={pineLibraryPath(scriptId)} title="Edit the source, Check it, try it on a basket">
              Edit in library ↗
            </PageHeadLink>
            <PageHeadLink to={chartHref('SPY')} title="The chart with this script's marks">
              Chart ↗
            </PageHeadLink>
          </>
        }
      />

      {summaryQ.isLoading ? (
        <ViewState kind="loading" title="Loading the script" rows={6} cols={6} />
      ) : summaryQ.error instanceof HttpError && summaryQ.error.status === 404 ? (
        <ViewState kind="empty" title={`No script ${scriptId}`} detail="The library has no script by that id — it may have been renamed." />
      ) : summaryQ.isError ? (
        firstResearchAuthGapError(summaryQ.error) ? (
          <ResearchAuthGap error={summaryQ.error} onRetry={() => void summaryQ.refetch()} />
        ) : (
          <ViewState
            kind="failed"
            title="Couldn’t read the script’s signals"
            detail={`Nothing was read — a blank report here would not mean the script never fired. ${errText(summaryQ.error)}`}
            onAction={() => void summaryQ.refetch()}
          />
        )
      ) : summary && script ? (
        <>
          <section className={panel} aria-label="Stored signals">
            <header className={panelHead}>
              <span className="text-dense-body font-semibold">Stored signals</span>
              <span className="ml-auto">
                <PineRunControl
                  run={run}
                  active={script.is_active}
                  canRun={Boolean(auth.token)}
                  blockedWhy="Set user — runs need a Research identity"
                />
              </span>
            </header>
            {summary.signals ? (
              <div className="space-y-3 p-3">
                <div className={cn(mono, 'flex flex-wrap gap-x-5 gap-y-1 text-dense-body')}>
                  <span>
                    <span className={cap}>Signals</span> {summary.signals.toLocaleString('en-US')}
                  </span>
                  <span>
                    <span className={cap}>Names</span> {summary.names.toLocaleString('en-US')}
                  </span>
                  <span>
                    <span className={cap}>From</span> {summary.first} <span className={cap}>to</span> {summary.last}
                  </span>
                  <span className={cn(stale && 'text-destructive')}>
                    <span className={cap}>Built from</span> v{summary.built_version}
                    {stale ? ` — the source is v${script.version}; Run now rebuilds it` : ''}
                  </span>
                </div>
                <MonthBars months={summary.by_month} />
              </div>
            ) : (
              <ViewState
                kind="empty"
                title="No signals stored yet"
                detail={
                  script.is_active
                    ? 'The nightly build has not run it, or it never fired. Run now builds it over its whole history.'
                    : 'The script is off, so the build does not run it.'
                }
              />
            )}
          </section>

          {summary.signals ? (
            <section className={panel} aria-label="Edge after the signal">
              <header className={panelHead}>
                <span className="text-dense-body font-semibold">Edge after the signal</span>
                <span className="ml-auto text-dense-caption text-muted-foreground">
                  every name it fired on · last 5 years · entered the next session at the open
                  {cost != null ? `, net of ${cost} bps each way` : ''} · against the same names’ other sessions · the same
                  measure as Signal Decay
                </span>
              </header>
              <div className="grid grid-cols-1 gap-4 p-3 lg:grid-cols-2">
                {sides.map((side, i) => {
                  const sq = statQs[i]
                  return sq?.isLoading ? (
                    <ViewState key={side} kind="loading" title={`Measuring the ${side} signals — about ten seconds over every name`} rows={3} cols={6} />
                  ) : sq?.isError ? (
                    <ViewState
                      key={side}
                      kind="failed"
                      layout="strip"
                      title={`The ${side} side was not measured`}
                      detail={errText(sq.error)}
                      onAction={() => void sq.refetch()}
                    />
                  ) : (
                    <PineEdgeTable key={side} side={side} stats={sq?.data} horizons={HORIZONS} />
                  )
                })}
              </div>
            </section>
          ) : null}

          {summary.signals ? (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <section className={panel} aria-label="Names">
                <header className={panelHead}>
                  <span className="text-dense-body font-semibold">Names</span>
                  <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
                    {summary.by_name.length < summary.names
                      ? `the ${summary.by_name.length} with the most signals, of ${summary.names.toLocaleString('en-US')}`
                      : summary.names.toLocaleString('en-US')}
                  </span>
                  <span className="ml-auto text-dense-caption text-muted-foreground">20-session net after the signal, per name</span>
                </header>
                <div className="max-h-[26rem] overflow-auto">
                  <table className="w-full" data-sr-table="">
                    <thead>
                      <tr>
                        <th className={cn(th, 'text-left')}>Symbol</th>
                        <th className={th}>▲</th>
                        <th className={th}>▼</th>
                        <th className={cn(th, 'text-left')}>Last</th>
                        <th className={th} title="Average net return 20 sessions after a buy signal on this name">
                          ▲ 20d
                        </th>
                        <th className={th} title="Average net return 20 sessions after a sell signal on this name (a fall counts as a gain)">
                          ▼ 20d
                        </th>
                        <th className={th} />
                      </tr>
                    </thead>
                    <tbody>
                      {summary.by_name.map((r) => {
                        const b = stats.buy?.per_symbol?.[r.symbol]?.by_horizon['20']
                        const s = stats.sell?.per_symbol?.[r.symbol]?.by_horizon['20']
                        return (
                          <tr key={r.symbol}>
                            <td className={cn(td, 'text-left font-semibold')}>{r.symbol}</td>
                            <td className={td}>{r.buy || '—'}</td>
                            <td className={td}>{r.sell || '—'}</td>
                            <td className={cn(td, 'text-left')}>{r.last ?? '—'}</td>
                            <td className={td} title={b ? `n ${b.n}` : undefined}>
                              {signedPct(b?.avg_return, 1)}
                            </td>
                            <td className={td} title={s ? `n ${s.n}` : undefined}>
                              {signedPct(s?.avg_return, 1)}
                            </td>
                            <td className={td}>
                              <Link to={chartHref(r.symbol)} className="font-sans text-dense-caption hover:underline">
                                Chart ↗
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={panel} aria-label="Latest signals">
                <header className={panelHead}>
                  <span className="text-dense-body font-semibold">Latest signals</span>
                  <span className="ml-auto text-dense-caption text-muted-foreground">
                    price change after the signal, before cost · — not there yet · dimmed: inside an earlier signal’s cooldown, not counted
                  </span>
                </header>
                {statQs.some((x) => x.isLoading) ? (
                  <ViewState kind="loading" title="Reading the latest signals" rows={6} cols={6} />
                ) : recent.length ? (
                  <div className="max-h-[26rem] overflow-auto">
                    <table className="w-full" data-sr-table="">
                      <thead>
                        <tr>
                          <th className={cn(th, 'text-left')}>Session</th>
                          <th className={cn(th, 'text-left')}>Symbol</th>
                          <th className={th} />
                          {HORIZONS.map((h) => (
                            <th key={h} className={th}>
                              {h}d
                            </th>
                          ))}
                          <th className={th} />
                        </tr>
                      </thead>
                      <tbody>
                        {recent.map((r) => (
                          <tr key={`${r.side}:${r.symbol}:${r.date}`} className={cn(!r.counted && 'opacity-55')}>
                            <td className={cn(td, 'text-left')}>{r.date}</td>
                            <td className={cn(td, 'text-left font-semibold')}>{r.symbol}</td>
                            <td className={td}>{r.side === 'buy' ? '▲' : '▼'}</td>
                            {HORIZONS.map((h) => (
                              <td key={h} className={cn(td, pnlColorClass(r.ret[h]))}>
                                {signedPct(r.ret[h], 1)}
                              </td>
                            ))}
                            <td className={td}>
                              <Link to={chartHref(r.symbol)} className="font-sans text-dense-caption hover:underline">
                                Chart ↗
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <ViewState kind="empty" title="No measured signals" detail="Signal Decay’s measure returned none in the last five years." />
                )}
              </section>
            </div>
          ) : null}

          <section className={panel} aria-label="Simulations">
            <header className={panelHead}>
              <span className="text-dense-body font-semibold">Simulations that entered on it</span>
              <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>{runsQ.data ? sims.length : '…'}</span>
              <span className="ml-auto text-dense-caption text-muted-foreground">
                among the latest {RUNS_LIMIT} stored runs · Backtest › Simulator › ＋ New sim with this script as the entry
              </span>
            </header>
            {runsQ.isLoading ? (
              <ViewState kind="loading" title="Loading the simulations" rows={3} cols={6} />
            ) : runsQ.isError ? (
              firstResearchAuthGapError(runsQ.error) ? (
                <ResearchAuthGap error={runsQ.error} layout="banner" />
              ) : (
                <ViewState
                  kind="failed"
                  layout="strip"
                  title="Couldn’t load the simulations"
                  detail={`No run was read — an empty list here would not mean none ran. ${errText(runsQ.error)}`}
                  onAction={() => void runsQ.refetch()}
                />
              )
            ) : sims.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px]" data-sr-table="">
                  <thead>
                    <tr>
                      <th className={cn(th, 'text-left')}>Run</th>
                      <th className={cn(th, 'text-left')}>Structure</th>
                      <th className={cn(th, 'text-left')}>Side</th>
                      <th className={th}>Trades</th>
                      <th className={th}>Win</th>
                      <th className={th}>P&amp;L</th>
                      <th className={th} />
                    </tr>
                  </thead>
                  <tbody>
                    {sims.map((r) => {
                      const s = simSummaryOf(r)
                      const side = String((r.event_def.params as Record<string, unknown>)?.side ?? 'buy')
                      return (
                        <tr key={r.id}>
                          <td className={cn(td, 'text-left')}>{r.created_at.slice(0, 10)}</td>
                          <td className={cn(td, 'text-left font-sans')}>{STRUCTURE_LABEL[simStructure(r)] ?? simStructure(r)}</td>
                          <td className={cn(td, 'text-left')}>{side === 'sell' ? '▼ sell' : '▲ buy'}</td>
                          <td className={td}>{s.n_trades ?? '—'}</td>
                          <td className={td}>{s.win_rate == null ? '—' : `${Math.round(s.win_rate * 100)}%`}</td>
                          <td className={cn(td, pnlColorClass(s.total_pnl))}>{simUsd(s.total_pnl)}</td>
                          <td className={td}>
                            <Link
                              to={`/research/backtest?tab=sim&run_id=${encodeURIComponent(r.id)}`}
                              className="font-sans text-dense-caption hover:underline"
                            >
                              Open ↗
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <ViewState kind="empty" title="No simulation entered on this script" detail="None among the latest stored runs." />
            )}
          </section>
        </>
      ) : null}
    </PageShell>
  )
}
