/**
 * Backtest page (Wave RS-C4).
 *
 * Two tabs:
 *   1. Settlement — original forecast-settlement replay (RS-A/B baseline).
 *   2. Event Query — event-driven backtest (RS-C1–C4). Builds an
 *      `EventDef` + strategy template, calls
 *      `POST /research/backtest/event-query`, and renders the result.
 *
 * The `run_id` query param opens a previously persisted run.
 */
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { History } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
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
  EmptyState,
  SegmentControl,
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
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { EventQueryBuilder } from '@/components/research/EventQueryBuilder'
import { BacktestRunResultCard } from '@/components/research/BacktestRunResultCard'
import { useBacktestRun } from '@/hooks/useBacktestEventQuery'
import { useResearchContext } from '@/hooks/useResearchContext'
import { settlementFineGrain } from '@/lib/researchSettlement'
import type {
  BacktestRunRow,
  EventQueryResponse,
} from '@/api/research/backtestEvent'

type TabKey = 'settlement' | 'event-query'

const TAB_OPTIONS: { value: TabKey; label: string }[] = [
  { value: 'settlement', label: 'Settlement' },
  { value: 'event-query', label: 'Event Query' },
]

function rowToResponse(row: BacktestRunRow): EventQueryResponse {
  return {
    run_id: row.id,
    run: row,
    summary: row.summary,
    runs: [],
    event_source: null,
    event_source_notes:
      'Persisted run — per-event trades are not stored. Rerun the query to regenerate the leg-level table.',
    skipped_events: 0,
    walk_forward: row.walk_forward,
    benchmark: row.benchmark,
    advisory: 'D10 BLOCKED — historical replay only',
  }
}

export default function BacktestPage() {
  const { symbol } = useResearchContext()
  const [params, setParams] = useSearchParams()
  const initialTab = (params.get('tab') as TabKey) || (params.get('run_id') ? 'event-query' : 'settlement')
  const [tab, setTab] = useState<TabKey>(
    initialTab === 'settlement' || initialTab === 'event-query' ? initialTab : 'settlement',
  )

  const runIdParam = params.get('run_id') || undefined
  const persistedRunQ = useBacktestRun(runIdParam, tab === 'event-query')
  const [liveResult, setLiveResult] = useState<EventQueryResponse | null>(null)

  const activeResult: EventQueryResponse | null = useMemo(() => {
    if (liveResult) return liveResult
    if (runIdParam && persistedRunQ.data?.row) return rowToResponse(persistedRunQ.data.row)
    return null
  }, [liveResult, runIdParam, persistedRunQ.data])

  useEffect(() => {
    const current = params.get('tab')
    if (current !== tab) {
      const next = new URLSearchParams(params)
      next.set('tab', tab)
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Backtest"
        description="Settlement replay (RS-A/B baseline) · Event Query (RS-C event-driven engine)"
        actions={
          <AskCopilotButton
            originPage="backtest"
            originLabel="Backtest"
            symbol={symbol}
            snapshot={compactSnapshot({
              tab,
              run_id: runIdParam ?? activeResult?.run_id,
            })}
            suggestedPrompt="Interpret these backtest results and suggest the next validation step."
          />
        }
      />

      <SegmentControl
        options={TAB_OPTIONS}
        value={tab}
        onChange={(v) => setTab(v as TabKey)}
      />

      {tab === 'settlement' ? (
        <SettlementTab />
      ) : (
        <div className="space-y-3">
          <EventQueryBuilder
            onRun={(res) => {
              setLiveResult(res)
              if (res.run_id) {
                const next = new URLSearchParams(params)
                next.set('tab', 'event-query')
                next.set('run_id', res.run_id)
                setParams(next, { replace: true })
              }
            }}
          />
          {persistedRunQ.isError && runIdParam && !liveResult ? (
            <QueryErrorAlert
              error={persistedRunQ.error}
              onRetry={() => void persistedRunQ.refetch()}
            />
          ) : null}
          {activeResult ? (
            <BacktestRunResultCard response={activeResult} />
          ) : (
            <Card variant="elevated">
              <CardContent className="px-3 py-6">
                <EmptyState
                  icon={<History />}
                  title="No run yet"
                  description="Configure an event kind, strategy template, and lookback window, then Run event query. Result appears here."
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </PageShell>
  )
}

function SettlementTab() {
  const { symbol } = useResearchContext()
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const settlementsQ = useQuery({
    queryKey: ['backtest-settlements', symbol],
    queryFn: () => fetchSettlements(symbol.trim() || undefined),
    enabled: symbol.trim().length > 0,
  })

  const rows = (settlementsQ.data?.rows ?? []).filter((r) => {
    if (start && r.trade_date < start) return false
    if (end && r.trade_date > end) return false
    return true
  })

  const hitRate =
    rows.length > 0 ? rows.filter((r) => r.path_hit).length / rows.length : null

  return (
    <div className="space-y-3">
      <ResearchContextBar showDate={false} />

      <Card variant="elevated">
        <CardContent className="flex flex-wrap items-center gap-2 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Range:</span>
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
        </CardContent>
      </Card>

      {settlementsQ.isError && (
        <QueryErrorAlert error={settlementsQ.error} onRetry={() => void settlementsQ.refetch()} />
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card variant="elevated">
          <CardContent className="px-3 py-2">
            <span className="text-dense-caption text-muted-foreground">Sessions settled</span>
            <p className="font-mono text-xl font-semibold tabular-nums">{rows.length}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="px-3 py-2">
            <span className="text-dense-caption text-muted-foreground">Path hit rate</span>
            <p className="font-mono text-xl font-semibold tabular-nums text-success">
              {hitRate != null ? `${(hitRate * 100).toFixed(0)}%` : '—'}
            </p>
          </CardContent>
        </Card>
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
          description="Run intraday settlement Cron or settle sessions via Research API. Filter by symbol and date range."
        />
      ) : (
        <DenseDataTable scrollX>
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead className={denseTableCellPadding}>Date</DenseTableHead>
              <DenseTableHead className={denseTableCellPadding}>Session</DenseTableHead>
              <DenseTableHead className={denseTableNumCell}>Expected</DenseTableHead>
              <DenseTableHead className={denseTableNumCell}>Actual</DenseTableHead>
              <DenseTableHead className={denseTableNumCell}>Miss %</DenseTableHead>
              <DenseTableHead className={denseTableCellPadding}>Outcome</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {rows.map((r: ForecastSettlement) => {
              const fine = settlementFineGrain(r)
              return (
                <DenseTableRow key={r.settlement_id}>
                  <DenseTableCell className={denseTableCellPadding}>{r.trade_date}</DenseTableCell>
                  <DenseTableCell className="font-mono text-dense-meta">
                    {r.session_id}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {fmtNumLocale(r.expected_close)}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {fmtNumLocale(r.actual_close)}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {(r.close_miss_pct * 100).toFixed(2)}%
                  </DenseTableCell>
                  <DenseTableCell className={denseTableCellPadding}>
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
                  </DenseTableCell>
                </DenseTableRow>
              )
            })}
          </DenseTableBody>
        </DenseDataTable>
      )}
    </div>
  )
}
