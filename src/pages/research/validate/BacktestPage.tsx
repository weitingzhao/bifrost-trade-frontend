/**
 * Backtest — event-driven replays of the strategy templates, and the
 * settlement record of every forecast the engine made (design
 * `Research Backtest.dc.html`, route rev 2026-09-22.6). Historical only —
 * nothing on this page places an order (D10).
 *
 * The Event tab is run-first: the persisted `research.backtest_run` rows are
 * the page's spine (newest first), a click opens the run's detail, and the
 * builder is behind ＋ New run rather than always open. The Settlement tab
 * reads every symbol's sessions (the endpoint's newest 200) — runs carry
 * their own symbol set, so the shell's symbol scope is held, not followed.
 */
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { History } from 'lucide-react'
import { PageHead, PageHeadAction, PageShell } from '@/components/layout'
import { AsofTag } from '@/components/AsofTag'
import { useSignalHealthSummary } from '@/hooks/useCopilotStanding'
import { healthFlag } from '@/lib/asofTag'
import {
  DenseTag,
  EmptyState,
  SettlementBadges,
} from '@/components/data-display'
import { fmtNumLocale } from '@/lib/format'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { fetchSettlements, type ForecastSettlement } from '@/api/researchEngine'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { EventQueryBuilder } from '@/components/research/EventQueryBuilder'
import { BacktestRunResultCard } from '@/components/research/BacktestRunResultCard'
import { cap, mono, panel, panelHead, td, th } from '@/components/research/labFaceUi'
import { useBacktestRun, useBacktestRuns } from '@/hooks/useBacktestEventQuery'
import { useResearchContext } from '@/hooks/useResearchContext'
import { settlementFineGrain } from '@/lib/researchSettlement'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import { runConfidence, runScope, runSymbols, settleAgg } from '@/utils/backtestRuns'
import type {
  BacktestRunRow,
  EventQueryResponse,
} from '@/api/research/backtestEvent'

type TabKey = 'event' | 'settlement'

const TAB_OPTIONS: { value: TabKey; label: string }[] = [
  { value: 'event', label: 'Event backtest' },
  { value: 'settlement', label: 'Settlement' },
]

function normalizeTab(raw: string | null): TabKey {
  // 'event-query' is the page's own old name for the tab; bookmarks predate it.
  if (raw === 'settlement') return 'settlement'
  return 'event'
}

function rowToResponse(row: BacktestRunRow): EventQueryResponse {
  return {
    run_id: row.id,
    run: row,
    summary: row.summary,
    runs: [],
    event_source: row.summary.event_source ?? null,
    event_source_notes: null,
    skipped_events: row.summary.skipped_events ?? 0,
    walk_forward: row.walk_forward,
    benchmark: row.benchmark,
    advisory: 'D10 BLOCKED — historical replay only',
  }
}

export default function BacktestPage() {
  const { symbol } = useResearchContext()
  const heldSymbol = symbol.trim().toUpperCase()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<TabKey>(normalizeTab(params.get('tab')))

  const runIdParam = params.get('run_id') || undefined
  // Arriving from a Hypothesis card: open the builder seeded with the thesis
  // and its symbols. EventQueryBuilder writes the run id back to the link.
  const hypothesisIdParam = params.get('hypothesis_id') || null
  const symbolsParam = params.get('symbols')
  const seededSymbols = symbolsParam
    ? symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
    : undefined

  const [showBuilder, setShowBuilder] = useState(Boolean(hypothesisIdParam || seededSymbols))
  const [builderSeed, setBuilderSeed] = useState<{ hyp: string | null; symbols?: string[] }>({
    hyp: hypothesisIdParam,
    symbols: seededSymbols,
  })
  const [liveResult, setLiveResult] = useState<EventQueryResponse | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(runIdParam ?? null)

  const runsQ = useBacktestRuns({ limit: 100 }, tab === 'event')
  const rows = useMemo(() => runsQ.data?.rows ?? [], [runsQ.data?.rows])
  // Nothing picked yet: the newest run is the rest state, derived rather than
  // set so the first render after load already shows it.
  const effectiveId = selectedId ?? rows[0]?.id ?? null
  // The list carries every persisted field; the by-id read is only needed for
  // a deep link that outruns the list (a run past the first 100).
  const listedRun = rows.find((r) => r.id === effectiveId) ?? null
  const byIdQ = useBacktestRun(
    effectiveId && !listedRun ? effectiveId : undefined,
    tab === 'event'
  )
  const selectedRow = listedRun ?? byIdQ.data?.row ?? null

  const activeResult: EventQueryResponse | null = useMemo(() => {
    if (liveResult && (!effectiveId || liveResult.run_id === effectiveId)) return liveResult
    if (selectedRow) return rowToResponse(selectedRow)
    return null
  }, [liveResult, effectiveId, selectedRow])

  useEffect(() => {
    const next = new URLSearchParams(params)
    next.set('tab', tab)
    if (effectiveId) next.set('run_id', effectiveId)
    else next.delete('run_id')
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, effectiveId])

  const fills = selectedRow?.fill_config ?? null
  const newestRun = rows[0]?.created_at ?? null

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* §16.10 sample page (Rev .32): the description is behind ⓘ, the two
          tabs are the head's own, and the breadcrumb is the top bar's. */}
      <PageHead
        title="Backtest"
        info="Event-driven replays of the strategy templates, and the settlement record of every forecast the engine made. Historical only — nothing on this page places an order."
        stamp={<BacktestAsofTag />}
        tabs={TAB_OPTIONS}
        tab={tab}
        onTab={(v) => setTab(v as TabKey)}
        actions={
          <>
            <AskCopilotButton
              originPage="backtest"
              originLabel="Backtest"
              symbol={heldSymbol}
              snapshot={compactSnapshot({
                tab,
                run_id: selectedId,
                runs: rows.length,
              })}
              suggestedPrompt="Interpret these backtest results and suggest the next validation step."
            />
            {tab === 'event' ? (
              <PageHeadAction
                primary
                title="Build an event query; a run that produces events is kept here"
                onClick={() => {
                  setBuilderSeed({ hyp: null, symbols: undefined })
                  setShowBuilder((v) => !v)
                }}
              >
                ＋ New run
              </PageHeadAction>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border px-3 py-1.75 mat-card">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 border py-0.5 font-mono text-dense-caption tracking-[0.05em] text-[var(--sk-accent)] mat-tag'
          )}
          title="Lab mode — method and parameters only. No order can be placed from here (D10)."
        >
          ◆ LAB · NO ORDERS
        </span>
        {heldSymbol ? (
          <span
            className="inline-flex items-center gap-1.5 border px-2 py-0.5 opacity-55 mat-tag"
            title="Held — runs carry their own symbol set"
          >
            <span className={cn(mono, 'text-dense-caption font-bold')}>{heldSymbol}</span>
            <span className="text-dense-caption text-muted-foreground">held</span>
          </span>
        ) : null}
        {tab === 'event' && fills ? (
          <span className="inline-flex items-center gap-1.5">
            <span className={cap}>fills</span>
            <span className={cn(mono, 'text-dense-caption')}>
              {fills.slippage_pct_of_spread} × spread · ${fills.commission_per_contract} / contract
            </span>
          </span>
        ) : null}
        <span className={cn(mono, 'ml-auto text-dense-micro text-muted-foreground')}>
          {tab === 'event'
            ? newestRun
              ? `research.backtest_run · newest ${newestRun.slice(0, 10)}`
              : 'research.backtest_run'
            : 'stock_backtest_settlement · newest 200 sessions'}
        </span>
      </div>

      {tab === 'event' ? (
        <div className="space-y-3">
          {showBuilder ? (
            <EventQueryBuilder
              initialHypothesisId={builderSeed.hyp}
              defaultSymbols={builderSeed.symbols}
              onRun={(res) => {
                setLiveResult(res)
                setShowBuilder(false)
                if (res.run_id) setSelectedId(res.run_id)
                void runsQ.refetch()
              }}
            />
          ) : null}
          {runsQ.isError ? (
            <QueryErrorAlert error={runsQ.error} onRetry={() => void runsQ.refetch()} />
          ) : null}
          <div className="flex flex-wrap items-start gap-3">
            <section className={cn(panel, 'max-w-[36rem] flex-[1_1_24rem]')}>
              <header className={panelHead}>
                <span className="text-dense-body font-semibold">Runs</span>
                <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
                  {runsQ.data ? fmtNumLocale(runsQ.data.count, 0) : '…'}
                </span>
                <span className="ml-auto text-dense-caption text-muted-foreground">
                  research.backtest_run · newest first
                </span>
              </header>
              {runsQ.isLoading ? (
                <div className="space-y-1.5 p-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div className="p-3.5">
                  <EmptyState
                    icon={<History />}
                    title="No persisted runs"
                    description="＋ New run builds an event query; a run that produces events is persisted here."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[460px] border-collapse">
                    <thead>
                      <tr>
                        <th className={cn(th, 'text-left')}>Run</th>
                        <th className={cn(th, 'text-left')}>Template · event</th>
                        <th className={th}>n</th>
                        <th className={th}>Win</th>
                        <th className={th}>Sharpe</th>
                        <th className={cn(th, 'text-left')}>Thesis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const conf = runConfidence(r.summary.n_events)
                        const noise = conf.level === 'noise'
                        const on = r.id === effectiveId
                        return (
                          <tr
                            key={r.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedId(r.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setSelectedId(r.id)
                              }
                            }}
                            className={cn(
                              'cursor-pointer hover:bg-[color-mix(in_oklab,var(--sk-accent)_5%,transparent)]',
                              on &&
                                'bg-[rgb(var(--sk-accent-rgb)/0.06)] shadow-[inset_2px_0_0_var(--sk-ticker)]'
                            )}
                          >
                            <td className={cn(td, 'text-left')}>
                              <div className={cn(mono, 'text-dense-caption font-semibold')}>
                                {r.id.slice(0, 11)}
                              </div>
                              <div className={cn(mono, 'text-dense-micro text-muted-foreground')}>
                                {r.created_at.slice(0, 16).replace('T', ' ')}
                              </div>
                            </td>
                            <td className={cn(td, 'min-w-0 text-left')}>
                              <div className={cn(mono, 'text-dense-caption')}>
                                {r.strategy_template}
                              </div>
                              <div className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap font-sans text-dense-micro text-muted-foreground">
                                {r.event_def.kind} · {runScope(r.event_def.params)}
                              </div>
                            </td>
                            <td
                              className={cn(
                                td,
                                noise
                                  ? 'text-destructive'
                                  : conf.level === 'thin'
                                    ? 'text-warning'
                                    : 'text-foreground'
                              )}
                            >
                              {r.summary.n_events}
                            </td>
                            <td
                              className={cn(
                                td,
                                noise
                                  ? 'text-muted-foreground'
                                  : r.summary.win_rate > 0.55
                                    ? 'text-profit'
                                    : r.summary.win_rate < 0.45
                                      ? 'text-loss'
                                      : 'text-foreground'
                              )}
                            >
                              {Math.round(r.summary.win_rate * 100)}%
                            </td>
                            <td
                              className={cn(
                                td,
                                noise
                                  ? 'text-muted-foreground'
                                  : r.summary.sharpe_annual > 0.5
                                    ? 'text-profit'
                                    : r.summary.sharpe_annual < 0
                                      ? 'text-loss'
                                      : 'text-foreground'
                              )}
                            >
                              {noise ? '—' : r.summary.sharpe_annual.toFixed(2)}
                            </td>
                            <td className={cn(td, 'text-left')}>
                              <span
                                className={cn(
                                  mono,
                                  'text-dense-micro',
                                  r.hypothesis_id
                                    ? 'text-[var(--sk-contract,#7dd3fc)]'
                                    : 'text-muted-foreground'
                                )}
                                title={r.hypothesis_id ?? 'No thesis linked to this run.'}
                              >
                                {r.hypothesis_id ? `${r.hypothesis_id.slice(0, 14)}…` : '—'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="min-w-0 flex-[999_1_34rem] space-y-3">
              {selectedRow ? (
                <div className="flex flex-wrap items-center gap-2 border px-3 py-1.75 mat-card">
                  <span className={cn(mono, 'text-dense-body font-bold')}>
                    {selectedRow.id.slice(0, 11)}
                  </span>
                  <DenseTag size="cell" variant="neutral">
                    {selectedRow.strategy_template}
                  </DenseTag>
                  <span className="text-dense-caption text-muted-foreground">
                    event <span className={cn(mono, 'text-foreground')}>{selectedRow.event_def.kind}</span>
                    {selectedRow.summary.event_source ? (
                      <>
                        {' '}· source{' '}
                        <span className={cn(mono, 'text-foreground')}>
                          {selectedRow.summary.event_source}
                        </span>
                      </>
                    ) : null}
                  </span>
                  <span className="inline-flex flex-wrap gap-1">
                    {runSymbols(selectedRow.event_def.params).map((s) => (
                      <Link
                        key={s}
                        to={withSymbolParam(SYMBOL_PATH, s)}
                        className={cn(
                          mono,
                          'border px-1.25 text-dense-caption font-bold leading-4 text-[var(--sk-ticker)] hover:underline mat-btn'
                        )}
                      >
                        {s}
                      </Link>
                    ))}
                  </span>
                  <span className="ml-auto inline-flex flex-wrap items-center gap-1.5">
                    {selectedRow.hypothesis_id ? (
                      <Link
                        to="/research/loop/hypotheses"
                        className="border px-1.75 py-0.5 text-dense-caption text-primary mat-btn"
                        title={`This run settles ${selectedRow.hypothesis_id} — the board holds the thesis; no per-id focus yet.`}
                      >
                        Hypothesis →
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setBuilderSeed({
                          hyp: selectedRow.hypothesis_id,
                          symbols: runSymbols(selectedRow.event_def.params),
                        })
                        setShowBuilder(true)
                      }}
                      className="cursor-pointer rounded border border-border px-1.75 py-0.5 text-dense-caption text-primary hover:bg-secondary"
                      title="Opens the builder seeded with this run's symbols and thesis; template and window are picked there."
                    >
                      Rerun
                    </button>
                  </span>
                </div>
              ) : null}
              {byIdQ.isError && selectedId && !listedRun ? (
                <QueryErrorAlert error={byIdQ.error} onRetry={() => void byIdQ.refetch()} />
              ) : null}
              {activeResult ? (
                <BacktestRunResultCard response={activeResult} headerless />
              ) : (
                <Card variant="elevated">
                  <CardContent className="px-3 py-6">
                    <EmptyState
                      icon={<History />}
                      title="No run selected"
                      description="Pick a run on the left, or ＋ New run to build an event query."
                    />
                  </CardContent>
                </Card>
              )}
            </section>
          </div>
        </div>
      ) : (
        <SettlementTab />
      )}
    </PageShell>
  )
}

/**
 * The settlement record, newest 200 sessions — the tab and the head's ASOF
 * read the one query. Cross-symbol on purpose: forecasts settle per session
 * per symbol, and the question this tab answers is the engine's record.
 */
function useSettlementRecord() {
  return useQuery({
    queryKey: ['backtest-settlements', 'all'],
    queryFn: () => fetchSettlements(undefined, undefined, 200),
  })
}

/**
 * The head's stamp: the newest session the engine has settled — this page's
 * one session reading (a persisted run's date is when it ran, not a session)
 * — with signal health's verdict as the flag, judged by Research, the same
 * pair the Symbol page wears.
 */
function BacktestAsofTag() {
  const settlementsQ = useSettlementRecord()
  const health = useSignalHealthSummary()
  const newest = (settlementsQ.data?.rows ?? []).reduce<string | null>(
    (m, r) => (m == null || r.trade_date > m ? r.trade_date : m),
    null,
  )
  return (
    <AsofTag
      asof={newest}
      flag={healthFlag(health.data, { loading: health.isLoading, error: health.isError })}
      judgedBy="Research"
      href="/research/signal-health"
    />
  )
}

function SettlementTab() {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const settlementsQ = useSettlementRecord()

  const rows = (settlementsQ.data?.rows ?? []).filter((r) => {
    if (start && r.trade_date < start) return false
    if (end && r.trade_date > end) return false
    return true
  })
  const agg = settleAgg(rows)

  return (
    <div className="space-y-3">
      <Card variant="elevated">
        <CardContent className="flex flex-wrap items-center gap-2 px-3 py-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Range:</span>
          <Input
            type="date"
            className="h-7 w-36 text-dense-label"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            title="Start date"
          />
          <Input
            type="date"
            className="h-7 w-36 text-dense-label"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            title="End date"
          />
          <span className="ml-auto text-dense-caption text-muted-foreground">
            Every forecast session, marked against the realised close at its horizon.
          </span>
        </CardContent>
      </Card>

      {settlementsQ.isError && (
        <QueryErrorAlert error={settlementsQ.error} onRetry={() => void settlementsQ.refetch()} />
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <AggTile label="Sessions" value={String(agg.sessions)} note="newest 200 the API serves" />
        <AggTile
          label="Within ±3%"
          value={agg.within3Pct != null ? `${agg.within3Pct.toFixed(0)}%` : '—'}
          note={`${agg.within3} of ${agg.sessions}`}
          cls={agg.within3Pct != null && agg.within3Pct >= 60 ? 'text-profit' : undefined}
        />
        <AggTile
          label="Mean abs miss"
          value={agg.meanAbsMissPct != null ? `${agg.meanAbsMissPct.toFixed(2)}%` : '—'}
          note="realised vs forecast"
        />
        <AggTile
          label="Path hit"
          value={agg.pathHitPct != null ? `${agg.pathHitPct.toFixed(0)}%` : '—'}
          note={`${agg.pathHits} of ${agg.sessions} sessions`}
          cls={agg.pathHitPct != null && agg.pathHitPct >= 60 ? 'text-profit' : undefined}
        />
        {/* The design's calibration tile needs the forecast's own claimed
            probability, which the settlement store does not record. */}
        <AggTile
          label="Realised − claimed"
          value="—"
          note="no claimed p in the store — calibration unmeasured"
        />
      </div>

      {settlementsQ.isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<History />}
          title="No settlement rows"
          description="Run intraday settlement Cron or settle sessions via Research API."
        />
      ) : (
        <div className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <th className={cn(th, 'text-left')}>Session</th>
                  <th className={cn(th, 'text-left')}>Symbol</th>
                  <th className={th}>Forecast</th>
                  <th className={th}>Realised</th>
                  <th className={th}>Miss</th>
                  <th className={cn(th, 'text-left')}>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: ForecastSettlement) => {
                  const fine = settlementFineGrain(r)
                  const missPct = r.close_miss_pct * 100
                  const absMiss = Math.abs(missPct)
                  return (
                    <tr key={r.settlement_id} className="hover:bg-[color-mix(in_oklab,var(--sk-accent)_5%,transparent)]">
                      <td className={cn(td, 'text-left text-muted-foreground')}>{r.trade_date}</td>
                      <td className={cn(td, 'text-left')}>
                        <Link
                          to={withSymbolParam(SYMBOL_PATH, r.symbol)}
                          className={cn(mono, 'font-bold text-[var(--sk-ticker)] hover:underline')}
                        >
                          {r.symbol}
                        </Link>
                      </td>
                      <td className={td}>{fmtNumLocale(r.expected_close)}</td>
                      <td className={td}>{fmtNumLocale(r.actual_close)}</td>
                      <td
                        className={cn(
                          td,
                          absMiss < 1
                            ? 'text-profit'
                            : absMiss < 3
                              ? 'text-foreground'
                              : 'text-loss'
                        )}
                      >
                        {missPct >= 0 ? '+' : '−'}
                        {absMiss.toFixed(2)}%
                      </td>
                      <td className={cn(td, 'text-left')}>
                        <SettlementBadges
                          pathHit={r.path_hit}
                          pathHitCount={r.path_hit_count}
                          pathTotal={r.path_total}
                          closeMissPct={r.close_miss_pct}
                          directionHit={fine.directionHit}
                          pathShape={fine.pathShape}
                          closeZone={fine.closeZone}
                          leanMiss={fine.leanMiss}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function AggTile({ label, value, note, cls }: { label: string; value: string; note: string; cls?: string }) {
  return (
    <Card variant="elevated">
      <CardContent className="px-3 py-2">
        <span className="text-dense-caption uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <p className={cn('font-mono text-lg font-semibold tabular-nums', cls ?? 'text-foreground')}>
          {value}
        </p>
        <p className="m-0 text-dense-caption text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  )
}
