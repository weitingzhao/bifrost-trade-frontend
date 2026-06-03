import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchMarketTradingDay } from '@/api/market'
import { postMassiveSync } from '@/api/research/optionDiscovery'
import { useMassiveRefJobSession } from '@/components/massive/massiveRefJobContext'
import {
  StockOhlcCoverageTable,
  type CustomBarsPeriodGroup,
} from '@/components/massive/StockOhlcCoverageTable'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SegmentControl } from '@/components/data-display'
import type { BarCoverageItem } from '@/types/barsCoverage'
import type { StatusResponse } from '@/types/monitor'
import {
  STOCK_CUSTOM_BARS_DEFAULT_END_MS,
  STOCK_CUSTOM_BARS_DEFAULT_START_MS,
} from '@/pages/settings/feed/massive/stock/stockRestSections'
import { splitCoverageByReferenceIndices } from '@/utils/massive/coverageSymbolGroups'
import { findLastNyTradingDay, presetNyRegularSessionForDate } from '@/utils/massive/customBarsTimePresets'
import { nyCalendarDateIso } from '@/utils/optionDiscovery/strikePresets'

const CUSTOM_BARS_SYMBOL_BATCH = 50

type CustomBarsSyncMode = 'window' | 'daily_smart'

const OHLC_MODES = [
  { id: 'custom_bars' as const, navLabel: 'Custom Bars', panelTitle: 'Custom Bars' },
  { id: 'daily_market_summary' as const, navLabel: 'Daily Market', panelTitle: 'Daily Market Summary' },
  { id: 'daily_ticker_summary' as const, navLabel: 'Daily Ticker', panelTitle: 'Daily Ticker Summary' },
  { id: 'previous_day_bar' as const, navLabel: 'Previous Day', panelTitle: 'Previous Day Bar' },
]

function buildCustomBarsMultiPayload(
  startMs: number,
  endMs: number,
  group: CustomBarsPeriodGroup,
  extra: Record<string, unknown> = {},
  dailySyncMode: CustomBarsSyncMode = 'window',
): Record<string, unknown> {
  if (group === 'daily' && dailySyncMode === 'daily_smart') {
    const cap = Number.isFinite(endMs) && endMs > 0 ? endMs : 0
    return {
      mode: 'custom_bars',
      sync_all_periods: true,
      custom_bars_period_group: 'daily',
      custom_bars_sync_mode: 'daily_smart',
      start_ms: 0,
      end_ms: cap,
      ...extra,
    }
  }
  return {
    mode: 'custom_bars',
    start_ms: startMs,
    end_ms: endMs,
    sync_all_periods: true,
    custom_bars_period_group: group,
    custom_bars_sync_mode: 'window',
    ...extra,
  }
}

function chunkStrings(list: string[], size: number): string[][] {
  const out: string[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

export interface MassiveStockOhlcDbEnqueueBlockProps {
  configured: boolean
  status: StatusResponse | null
  coverage: BarCoverageItem[] | null
  coverageLoading: boolean
  coverageError: string | null
  onRefreshCoverage: () => void
  dailyFullBackfillYears: number
}

export function MassiveStockOhlcDbEnqueueBlock({
  configured,
  status,
  coverage,
  coverageLoading,
  coverageError,
  onRefreshCoverage,
  dailyFullBackfillYears,
}: MassiveStockOhlcDbEnqueueBlockProps) {
  const refJobSession = useMassiveRefJobSession()
  const [priorityHigh, setPriorityHigh] = useState(false)
  const [delayDbOhlcTab, setDelayDbOhlcTab] = useState<(typeof OHLC_MODES)[number]['id']>('custom_bars')
  const [ohlcMsg, setOhlcMsg] = useState<string | null>(null)

  const [dbOhlcTicker, setDbOhlcTicker] = useState('AAPL')
  const [dbOhlcStartMs, setDbOhlcStartMs] = useState(String(STOCK_CUSTOM_BARS_DEFAULT_START_MS))
  const [dbOhlcEndMs, setDbOhlcEndMs] = useState(String(STOCK_CUSTOM_BARS_DEFAULT_END_MS))
  const [dbOhlcTs, setDbOhlcTs] = useState('minute')
  const [dbOhlcMult, setDbOhlcMult] = useState('1')
  const [customBarsSingleTimespanOnly, setCustomBarsSingleTimespanOnly] = useState(false)
  const [dbGdDate, setDbGdDate] = useState('2024-06-03')
  const [dbOcTicker, setDbOcTicker] = useState('AAPL')
  const [dbOcDate, setDbOcDate] = useState('2024-06-03')
  const [dbPrevTicker, setDbPrevTicker] = useState('AAPL')
  const [isTradingDay, setIsTradingDay] = useState<boolean | null>(null)

  useEffect(() => {
    fetchMarketTradingDay()
      .then(r => setIsTradingDay(r.is_trading_day))
      .catch(() => setIsTradingDay(true))
  }, [])

  useEffect(() => {
    if (!configured) return
    let cancelled = false
    void (async () => {
      const ymd = (await findLastNyTradingDay()) ?? nyCalendarDateIso()
      const w = presetNyRegularSessionForDate(ymd)
      if (cancelled || !w) return
      setDbOhlcStartMs(String(w.startMs))
      setDbOhlcEndMs(String(w.endMs))
    })()
    return () => {
      cancelled = true
    }
  }, [configured])

  const coverageGroups = useMemo(
    () => splitCoverageByReferenceIndices(coverage ?? [], status?.live_ui?.reference_indices),
    [coverage, status?.live_ui?.reference_indices],
  )

  const hasCustomBarsTableRows = useMemo(
    () => coverageGroups.some(g => g.rows.length > 0),
    [coverageGroups],
  )

  const showCustomBarsTable = hasCustomBarsTableRows && (!coverageLoading || coverage != null)

  const allCoverageSymbols = useMemo(() => {
    const rows = coverage ?? []
    const fromCov = [...new Set(rows.map(r => (r.symbol || '').trim().toUpperCase()).filter(Boolean))]
    const refSyms = (status?.live_ui?.reference_indices ?? [])
      .map(r => (r.symbol || '').trim().toUpperCase())
      .filter(Boolean)
    return [...new Set([...refSyms, ...fromCov])]
  }, [coverage, status?.live_ui?.reference_indices])

  const backfillYears =
    Number.isFinite(dailyFullBackfillYears) && dailyFullBackfillYears > 0 ? dailyFullBackfillYears : 5

  const runOhlcEnqueue = useCallback(
    async (payload: Record<string, unknown>) => {
      setOhlcMsg(null)
      await refJobSession.withStockOhlcHttp(async () => {
        try {
          const res = await postMassiveSync(
            'feed_stocks_aggregate',
            payload,
            priorityHigh ? { priority: 'high' } : undefined,
          )
          if (!res.ok) {
            setOhlcMsg(res.error ?? res.message ?? 'Enqueue failed')
            return
          }
          if (!res.job_id) {
            setOhlcMsg('Enqueue accepted but no job id returned.')
            return
          }
          refJobSession.trackStockOhlcSyncJob({
            job_id: res.job_id,
            deduplicated: res.deduplicated,
          })
          const tag = res.deduplicated ? `${res.job_id} (deduplicated)` : res.job_id
          setOhlcMsg(`Enqueued feed_stocks_aggregate: job ${tag}. Open Jobs for details.`)
        } catch (e: unknown) {
          setOhlcMsg(e instanceof Error ? e.message : 'Enqueue failed')
        }
      })
    },
    [priorityHigh, refJobSession],
  )

  const enqueueCustomBarsRow = useCallback(
    async (symbol: string, group: CustomBarsPeriodGroup) => {
      const startMs = parseInt(dbOhlcStartMs.trim(), 10)
      const endMs = parseInt(dbOhlcEndMs.trim(), 10)
      const t = symbol.trim().toUpperCase()
      if (!t) {
        setOhlcMsg('Custom bars: ticker is required.')
        return
      }
      if (group === 'daily') {
        await runOhlcEnqueue(buildCustomBarsMultiPayload(0, 0, 'daily', { ticker: t }, 'daily_smart'))
        return
      }
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        setOhlcMsg('Custom bars: Unix ms start/end are required for intraday.')
        return
      }
      await runOhlcEnqueue(
        buildCustomBarsMultiPayload(startMs, endMs, 'intraday', { ticker: t }, 'window'),
      )
    },
    [dbOhlcStartMs, dbOhlcEndMs, runOhlcEnqueue],
  )

  const enqueueCustomBarsAllSymbols = useCallback(
    async (group: CustomBarsPeriodGroup) => {
      if (allCoverageSymbols.length === 0) {
        setOhlcMsg('No symbols in coverage. Refresh coverage after configuring watchlist / indices.')
        return
      }
      const startMs = parseInt(dbOhlcStartMs.trim(), 10)
      const endMs = parseInt(dbOhlcEndMs.trim(), 10)
      if (group === 'intraday' && (!Number.isFinite(startMs) || !Number.isFinite(endMs))) {
        setOhlcMsg('Custom bars: Unix ms start/end are required for intraday.')
        return
      }
      const basePayload: Record<string, unknown> =
        group === 'daily'
          ? buildCustomBarsMultiPayload(0, 0, 'daily', {}, 'daily_smart')
          : buildCustomBarsMultiPayload(startMs, endMs, 'intraday', {}, 'window')
      setOhlcMsg(null)
      await refJobSession.withStockOhlcHttp(async () => {
        const chunks = chunkStrings(allCoverageSymbols, CUSTOM_BARS_SYMBOL_BATCH)
        const errors: string[] = []
        let jobs = 0
        try {
          for (let i = 0; i < chunks.length; i++) {
            const res = await postMassiveSync(
              'feed_stocks_aggregate',
              { ...basePayload, symbols: chunks[i] },
              priorityHigh ? { priority: 'high' } : undefined,
            )
            if (!res.ok) {
              errors.push(`Batch ${i + 1}/${chunks.length}: ${res.error ?? res.message ?? 'Enqueue failed'}`)
              continue
            }
            if (!res.job_id) {
              errors.push(`Batch ${i + 1}/${chunks.length}: no job id`)
              continue
            }
            refJobSession.trackStockOhlcSyncJob({
              job_id: res.job_id,
              deduplicated: res.deduplicated,
            })
            jobs += 1
          }
        } catch (e: unknown) {
          setOhlcMsg(e instanceof Error ? e.message : 'Enqueue failed')
          return
        }
        if (errors.length > 0 && jobs === 0) {
          setOhlcMsg(errors.join(' '))
        } else if (errors.length > 0) {
          setOhlcMsg(`${errors.join(' ')} (${jobs} job(s) enqueued). Open Jobs for details.`)
        } else {
          const scope =
            group === 'daily'
              ? `daily smart (~${backfillYears}y full if empty, else gap-fill)`
              : 'intraday (1m / 5m / 1h)'
          setOhlcMsg(
            `Enqueued ${jobs} feed_stocks_aggregate job(s) (${scope}) for ${allCoverageSymbols.length} symbol(s). Open Jobs for details.`,
          )
        }
      })
    },
    [allCoverageSymbols, backfillYears, dbOhlcStartMs, dbOhlcEndMs, priorityHigh, refJobSession],
  )

  const enqueueStockOhlcSyncAdvanced = useCallback(
    async (group: CustomBarsPeriodGroup, dailyMode: 'daily_smart' | 'window' = 'daily_smart') => {
      if (delayDbOhlcTab !== 'custom_bars') return
      const startMs = parseInt(dbOhlcStartMs.trim(), 10)
      const endMs = parseInt(dbOhlcEndMs.trim(), 10)
      const t = dbOhlcTicker.trim().toUpperCase()
      if (!t) {
        setOhlcMsg('Custom bars: ticker is required.')
        return
      }
      if (customBarsSingleTimespanOnly) {
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
          setOhlcMsg('Custom bars: Unix ms start/end are required.')
          return
        }
        await runOhlcEnqueue({
          mode: 'custom_bars',
          ticker: t,
          multiplier: parseInt(dbOhlcMult.trim(), 10) || 1,
          timespan: dbOhlcTs.trim() || 'minute',
          start_ms: startMs,
          end_ms: endMs,
          sync_all_periods: false,
        })
        return
      }
      if (group === 'daily' && dailyMode === 'daily_smart') {
        await runOhlcEnqueue(buildCustomBarsMultiPayload(0, 0, 'daily', { ticker: t }, 'daily_smart'))
        return
      }
      if (group === 'daily' && dailyMode === 'window') {
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
          setOhlcMsg('Custom bars: Unix ms start/end are required for manual daily window.')
          return
        }
        await runOhlcEnqueue(
          buildCustomBarsMultiPayload(startMs, endMs, 'daily', { ticker: t }, 'window'),
        )
        return
      }
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        setOhlcMsg('Custom bars: Unix ms start/end are required for intraday.')
        return
      }
      await runOhlcEnqueue(
        buildCustomBarsMultiPayload(startMs, endMs, 'intraday', { ticker: t }, 'window'),
      )
    },
    [
      delayDbOhlcTab,
      dbOhlcStartMs,
      dbOhlcEndMs,
      dbOhlcTicker,
      customBarsSingleTimespanOnly,
      dbOhlcMult,
      dbOhlcTs,
      runOhlcEnqueue,
    ],
  )

  const enqueueStockOhlcSync = useCallback(async () => {
    if (delayDbOhlcTab === 'daily_market_summary') {
      const d = dbGdDate.trim()
      if (!d) {
        setOhlcMsg('Date (YYYY-MM-DD) is required.')
        return
      }
      await runOhlcEnqueue({ mode: 'daily_market_summary', date: d })
      return
    }
    if (delayDbOhlcTab === 'daily_ticker_summary') {
      const t = dbOcTicker.trim().toUpperCase()
      const d = dbOcDate.trim()
      if (!t || !d) {
        setOhlcMsg('Ticker and date are required.')
        return
      }
      await runOhlcEnqueue({ mode: 'daily_ticker_summary', ticker: t, date: d })
      return
    }
    const t = dbPrevTicker.trim().toUpperCase()
    if (!t) {
      setOhlcMsg('Ticker is required.')
      return
    }
    await runOhlcEnqueue({ mode: 'previous_day_bar', ticker: t })
  }, [delayDbOhlcTab, dbGdDate, dbOcTicker, dbOcDate, dbPrevTicker, runOhlcEnqueue])

  const ohlcHttpBusy = refJobSession.jobBusyKind === 'feed_stocks_aggregate'
  const disabled = !configured || refJobSession.jobBusyKind != null
  const modeMeta = OHLC_MODES.find(m => m.id === delayDbOhlcTab)
  const queueCode = priorityHigh ? 'stocks_massive_high' : 'stocks_massive'

  return (
    <div className="space-y-4" role="region" aria-label="Stock OHLC PostgreSQL sync">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Celery job <code className="text-xs">feed_stocks_aggregate</code> upserts into{' '}
          <code className="text-xs">stock_day</code> / <code className="text-xs">stock_min</code> (source
          &quot;massive&quot;). Enqueued jobs appear in the same <strong>Jobs</strong> sheet as ticker reference
          tasks.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Label id="massive-delay-ohlc-queue-label" className="text-xs text-muted-foreground">
            Queue
          </Label>
          <SegmentControl
            ariaLabel="OHLC Celery queue priority"
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'high', label: 'High' },
            ]}
            value={priorityHigh ? 'high' : 'standard'}
            onChange={v => setPriorityHigh(v === 'high')}
            className="shrink-0"
          />
          <InfoTooltip text="Standard uses Celery queue stocks_massive. High uses stocks_massive_high for feed_stocks_aggregate." />
        </div>
      </div>

      <SegmentControl
        ariaLabel="Stock OHLC sync mode"
        options={OHLC_MODES.map(m => ({ value: m.id, label: m.navLabel }))}
        value={delayDbOhlcTab}
        onChange={v => setDelayDbOhlcTab(v as (typeof OHLC_MODES)[number]['id'])}
      />

      <div className="rounded-md border bg-card p-4 space-y-4">
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Job</dt>
            <dd>
              <strong>feed_stocks_aggregate</strong>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Mode</dt>
            <dd>{modeMeta?.panelTitle ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Queue</dt>
            <dd>
              <code className="text-xs">{queueCode}</code>
            </dd>
          </div>
        </dl>

        <h4 className="text-sm font-semibold">Enqueue</h4>

        {delayDbOhlcTab === 'custom_bars' ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong>Massive (delayed) → PostgreSQL</strong> — not IB Live in Redis.{' '}
              <strong>Daily:</strong> through NY <strong>today</strong>; ~<strong>{backfillYears}y</strong> when
              empty, else gap-fill + <strong>2</strong> US trading-day overlap. <strong>Intraday:</strong> latest
              regular session (09:30–16:00 ET), 1m / 5m / 1h.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={disabled || ohlcHttpBusy || allCoverageSymbols.length === 0}
                onClick={() => void enqueueCustomBarsAllSymbols('daily')}
              >
                {ohlcHttpBusy ? 'Enqueueing…' : 'Sync all (daily, smart)'}
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={disabled || ohlcHttpBusy || allCoverageSymbols.length === 0}
                onClick={() => void enqueueCustomBarsAllSymbols('intraday')}
              >
                {ohlcHttpBusy ? 'Enqueueing…' : 'Sync all (intraday)'}
              </Button>
            </div>

            {coverageError ? (
              <p className="text-sm text-destructive" role="alert">
                {coverageError}
              </p>
            ) : null}
            {coverageLoading && coverage == null ? (
              <p className="text-sm text-muted-foreground" role="status">
                Loading coverage…
              </p>
            ) : null}
            {!coverageLoading && !hasCustomBarsTableRows ? (
              <p className="text-sm text-muted-foreground" role="status">
                No coverage rows (empty watchlist / indices). Configure reference indices or add watchlist
                symbols, then refresh.
              </p>
            ) : null}

            {showCustomBarsTable ? (
              <StockOhlcCoverageTable
                groups={coverageGroups}
                referenceIndices={status?.live_ui?.reference_indices}
                isTradingDay={isTradingDay}
                disabled={disabled}
                ohlcHttpBusy={ohlcHttpBusy}
                onRefreshCoverage={onRefreshCoverage}
                onSyncRow={enqueueCustomBarsRow}
              />
            ) : null}

            <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Advanced — manual ticker and Unix ms
              </summary>
              <div className="mt-3 space-y-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={customBarsSingleTimespanOnly}
                    onChange={e => setCustomBarsSingleTimespanOnly(e.target.checked)}
                    disabled={disabled}
                  />
                  Single timespan only (one multiplier × timespan, no multi-period)
                </label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Stock ticker</span>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      value={dbOhlcTicker}
                      onChange={e => setDbOhlcTicker(e.target.value)}
                      disabled={disabled}
                      placeholder="AAPL"
                      autoComplete="off"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Start (Unix ms)</span>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      value={dbOhlcStartMs}
                      onChange={e => setDbOhlcStartMs(e.target.value)}
                      disabled={disabled}
                      placeholder={String(STOCK_CUSTOM_BARS_DEFAULT_START_MS)}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">End (Unix ms)</span>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      value={dbOhlcEndMs}
                      onChange={e => setDbOhlcEndMs(e.target.value)}
                      disabled={disabled}
                      placeholder={String(STOCK_CUSTOM_BARS_DEFAULT_END_MS)}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Timespan</span>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      value={dbOhlcTs}
                      onChange={e => setDbOhlcTs(e.target.value)}
                      disabled={disabled || !customBarsSingleTimespanOnly}
                      placeholder="minute"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Multiplier</span>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      value={dbOhlcMult}
                      onChange={e => setDbOhlcMult(e.target.value)}
                      disabled={disabled || !customBarsSingleTimespanOnly}
                      placeholder="1"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customBarsSingleTimespanOnly ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={disabled}
                      onClick={() => void enqueueStockOhlcSyncAdvanced('daily')}
                    >
                      {ohlcHttpBusy ? 'Enqueueing…' : 'Enqueue sync'}
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={disabled}
                        onClick={() => void enqueueStockOhlcSyncAdvanced('daily', 'daily_smart')}
                      >
                        {ohlcHttpBusy ? 'Enqueueing…' : 'Enqueue daily (smart)'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={disabled}
                        onClick={() => void enqueueStockOhlcSyncAdvanced('daily', 'window')}
                      >
                        {ohlcHttpBusy ? 'Enqueueing…' : 'Enqueue daily (manual window)'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={disabled}
                        onClick={() => void enqueueStockOhlcSyncAdvanced('intraday')}
                      >
                        {ohlcHttpBusy ? 'Enqueueing…' : 'Enqueue intraday (1m · 5m · 1h)'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </details>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 space-y-3 text-sm">
              {delayDbOhlcTab === 'daily_market_summary' ? (
                <>
                  <p className="text-muted-foreground">One trading day, all U.S. stocks — large payload.</p>
                  <label className="block max-w-xs space-y-1">
                    <span className="text-xs text-muted-foreground">Date (YYYY-MM-DD)</span>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      value={dbGdDate}
                      onChange={e => setDbGdDate(e.target.value)}
                      disabled={disabled}
                      placeholder="2024-06-03"
                    />
                  </label>
                </>
              ) : null}
              {delayDbOhlcTab === 'daily_ticker_summary' ? (
                <>
                  <p className="text-muted-foreground">Open / close and OHLC for one ticker on one date.</p>
                  <div className="grid max-w-md gap-3 sm:grid-cols-2">
                    <label className="block space-y-1">
                      <span className="text-xs text-muted-foreground">Stock ticker</span>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                        value={dbOcTicker}
                        onChange={e => setDbOcTicker(e.target.value)}
                        disabled={disabled}
                        placeholder="AAPL"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-muted-foreground">Date (YYYY-MM-DD)</span>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                        value={dbOcDate}
                        onChange={e => setDbOcDate(e.target.value)}
                        disabled={disabled}
                        placeholder="2024-06-03"
                      />
                    </label>
                  </div>
                </>
              ) : null}
              {delayDbOhlcTab === 'previous_day_bar' ? (
                <>
                  <p className="text-muted-foreground">
                    Previous trading session OHLC for one ticker (no calendar math client-side).
                  </p>
                  <label className="block max-w-xs space-y-1">
                    <span className="text-xs text-muted-foreground">Stock ticker</span>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      value={dbPrevTicker}
                      onChange={e => setDbPrevTicker(e.target.value)}
                      disabled={disabled}
                      placeholder="AAPL"
                    />
                  </label>
                </>
              ) : null}
            </div>
            <Button type="button" variant="secondary" disabled={disabled} onClick={() => void enqueueStockOhlcSync()}>
              {ohlcHttpBusy ? 'Enqueueing…' : 'Enqueue sync'}
            </Button>
          </div>
        )}

        {ohlcMsg ? <p className="text-sm text-muted-foreground">{ohlcMsg}</p> : null}
      </div>
    </div>
  )
}
