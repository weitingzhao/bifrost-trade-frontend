import { useCallback, useEffect, useMemo, useState } from 'react'
import { DiscoveryHint } from '@/components/optionDiscovery/DiscoveryHint'
import { DiscoveryIconButton } from '@/components/optionDiscovery/DiscoveryIconButton'
/* eslint-disable react-hooks/set-state-in-effect -- contract chart sync/load */
import type { Bar } from '@/types/market'
import { pollMassiveJobUntilDone, postMassiveSync, resolveMassiveSyncJobId } from '@/api/research/optionDiscovery'
import { fetchOptionBars } from '@/api/market'
import { BarsCandlestickChart } from '@/components/charts/BarsCandlestickChart'
import { finiteVwap } from '@/utils/chart/finiteVwap'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { SegmentControl } from '@/components/data-display'
import { cn } from '@/lib/utils'
import { OdChartExpandOnHover } from './OdChartExpandOnHover'
import { buildPolygonOptionsTicker } from '@/utils/polygonOptionsTicker'
import { OPTION_BAR_PERIODS } from '@/utils/optionBarPeriods'

/** Option Discovery chart always reads Massive-backed rows in PostgreSQL (option_min / option_day). */
const BAR_SOURCE = 'massive' as const

/** Massive aggregates backfill: intraday job window (option_min). */
const AGG_LOOKBACK_MS_INTRADAY = 7 * 24 * 60 * 60 * 1000
/** Massive aggregates backfill: daily bars → option_day (plan default: ~2 years). */
const AGG_LOOKBACK_MS_DAILY = 730 * 24 * 60 * 60 * 1000

function sortBarsAsc(bars: Bar[]): Bar[] {
  return [...bars].sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
}

export function OptionDiscoveryContractChartPanel({
  symbol,
  expiration,
  strike,
  optionRight,
}: {
  symbol: string
  expiration: string
  strike: number
  optionRight: 'C' | 'P'
}) {
  const [period, setPeriod] = useState<string>('1 min')
  const [bars, setBars] = useState<Bar[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncHint, setSyncHint] = useState<string | null>(null)
  /** K-line VWAP overlay; default on. */
  const [showVwap, setShowVwap] = useState(true)

  const load = useCallback(async () => {
    const sym = symbol.trim().toUpperCase()
    const exp = expiration.trim()
    if (!sym || !exp || !Number.isFinite(strike)) {
      setBars([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetchOptionBars({
        symbol: sym,
        expiry: exp,
        strike,
        option_right: optionRight,
        period,
        limit: 200,
        source: BAR_SOURCE,
      })
      const raw = res.bars ?? []
      setBars(raw)
      if (raw.length === 0) {
        const msg = (res.message || '').trim()
        setError(
          msg ||
            (period === '1 D'
              ? 'No bars in the database for this contract. Click Backfill from Massive to enqueue daily aggregates (option_day), or run the same job from Feed → Massive Option.'
              : 'No bars in the database for this contract. Click Backfill from Massive to enqueue aggregates (option_min), or run the same job from Feed → Massive Option.'),
        )
      }
    } catch (e) {
      setBars([])
      setError(e instanceof Error ? e.message : 'Failed to load option bars')
    } finally {
      setLoading(false)
    }
  }, [symbol, expiration, strike, optionRight, period])

  useEffect(() => {
    void load()
  }, [load])

  const runMassiveAggregatesBackfill = useCallback(async () => {
    const sym = symbol.trim().toUpperCase()
    const exp = expiration.trim()
    if (!sym || !exp || !Number.isFinite(strike)) return
    setSyncBusy(true)
    setSyncHint(null)
    setError(null)
    try {
      const optionsTicker = buildPolygonOptionsTicker(sym, exp, strike, optionRight)
      const endMs = Date.now()
      const isDaily = period === '1 D'
      const lookbackMs = isDaily ? AGG_LOOKBACK_MS_DAILY : AGG_LOOKBACK_MS_INTRADAY
      const startMs = endMs - lookbackMs
      let timespan = 'minute'
      let multiplier = 1
      if (isDaily) {
        timespan = 'day'
        multiplier = 1
      } else if (period === '1 hour') {
        timespan = 'hour'
        multiplier = 1
      } else if (period === '5 mins') {
        timespan = 'minute'
        multiplier = 5
      } else {
        timespan = 'minute'
        multiplier = 1
      }
      const res = await postMassiveSync('feed_options_aggregate', {
        options_ticker: optionsTicker,
        symbol: sym,
        expiry: exp,
        strike,
        option_right: optionRight,
        timespan,
        multiplier,
        start_ms: startMs,
        end_ms: endMs,
      })
      const jobId = resolveMassiveSyncJobId(res)
      if (!res.ok || !jobId) {
        setError(res.error ?? res.message ?? 'Failed to enqueue Massive aggregates job')
        return
      }
      const polled = await pollMassiveJobUntilDone(jobId, { maxAttempts: 120, intervalMs: 1000 })
      if (!polled.ok) {
        setError(polled.error ?? 'Massive job failed')
        return
      }
      if (period === '5 mins') {
        setSyncHint('Backfill wrote 5-minute bars (option_min, period=5 mins). Reloading bars from PostgreSQL.')
        await load()
      } else {
        setSyncHint(isDaily ? 'Daily backfill finished (option_day, ~2y window). Reloading bars from PostgreSQL.' : 'Backfill finished. Reloading bars from PostgreSQL.')
        await load()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Backfill failed')
    } finally {
      setSyncBusy(false)
    }
  }, [symbol, expiration, strike, optionRight, period, load])

  const chartBars = useMemo(() => sortBarsAsc(bars), [bars])

  /** BarsCandlestickChart draws VWAP only when `vwap` is present on bars from GET /bars. */
  const chartHasVwap = useMemo(
    () => chartBars.some(b => finiteVwap(b.vwap) != null),
    [chartBars],
  )

  return (
    <div className="min-w-0">
      <div className="mb-2 flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Period</span>
          <SegmentControl
            value={period}
            onChange={v => {
              if (v) setPeriod(v)
            }}
            ariaLabel="Bar period"
            options={OPTION_BAR_PERIODS.map(p => ({ value: p.value, label: p.label }))}
          />
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <DiscoveryIconButton
            disabled={loading || syncBusy}
            onClick={() => void load()}
            title={loading ? 'Loading bars' : 'Reload bars'}
            aria-label={loading ? 'Loading bars' : 'Reload bars'}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          </DiscoveryIconButton>
          <DiscoveryIconButton
            disabled={loading || syncBusy}
            title={
              syncBusy
                ? 'Backfilling bars from Massive'
                : period === '1 D'
                ? 'Enqueue Celery job: Massive /v2/aggs (1 day) → option_day (~2 years lookback)'
                : 'Enqueue Celery job: Massive /v2/aggs → option_min (last 7 days)'
            }
            aria-label={syncBusy ? 'Backfilling bars from Massive' : 'Backfill bars from Massive'}
            onClick={() => void runMassiveAggregatesBackfill()}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 7h10" />
              <path d="M7 12h10" />
              <path d="M7 17h6" />
              <path d="M16 14l3 3-3 3" />
            </svg>
          </DiscoveryIconButton>
          <InfoTooltip text="Reads OHLC from PostgreSQL (option_day for Daily, option_min for intraday). Backfill enqueues Massive /v2/aggs on the Celery queue: daily bars upsert option_day (~2y window); intraday upserts option_min (7 days). You can also use Feed → Massive Option → Aggregate Bars (OHLC)." />
          <label
            className={cn(
              'inline-flex cursor-pointer select-none items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              'border-border bg-card hover:border-border',
              showVwap && !(chartBars.length === 0 || !chartHasVwap) && 'border-primary/60 bg-primary/10 shadow-[0_0_0_1px] shadow-primary/35',
              (chartBars.length === 0 || !chartHasVwap) && 'cursor-not-allowed opacity-55',
            )}
            title={
              chartBars.length > 0 && !chartHasVwap
                ? 'No VWAP in loaded bars'
                : 'Show or hide volume-weighted average price on the chart'
            }
          >
            <input
              type="checkbox"
              className="size-3.5 accent-primary"
              checked={showVwap}
              disabled={chartBars.length === 0 || !chartHasVwap}
              onChange={e => setShowVwap(e.target.checked)}
              aria-label="Show VWAP on chart"
            />
            <span>VWAP</span>
          </label>
        </div>
      </div>
      {syncHint && <DiscoveryHint className="" role="status">{syncHint}</DiscoveryHint>}
      {error && <DiscoveryHint className="" role="status">{error}</DiscoveryHint>}
      {chartBars.length > 0 && (
        <OdChartExpandOnHover
          title={`${symbol.trim().toUpperCase()} ${optionRight === 'C' ? 'Call' : 'Put'} ${strike.toFixed(2)} · ${period}`}
        >
          <div className="data-bars-chart-container" style={{ marginTop: '0.75rem' }}>
            <div className="data-bars-chart-header">
              <span className="data-bars-chart-title">
                {symbol.trim().toUpperCase()} {optionRight === 'C' ? 'Call' : 'Put'} {strike.toFixed(2)} · {period} · Massive (DB) · {chartBars.length} bars
              </span>
            </div>
            {!chartHasVwap && (
              <DiscoveryHint className="mt-0 od-chart-vwap-missing" role="alert">
                VWAP data missing: loaded bars do not include <code>vwap</code> from the Market API, so the chart cannot draw the VWAP line. OHLC and volume still use returned fields. Re-fetch bars after backfill, or verify GET /bars returns <code>vwap</code> for <code>asset=option</code>.
              </DiscoveryHint>
            )}
            <BarsCandlestickChart
              bars={chartBars}
              period={period}
              showVwap={showVwap}
              enableTimeRangeBrush
            />
          </div>
        </OdChartExpandOnHover>
      )}
      {!loading && chartBars.length === 0 && !error && (
        <DiscoveryHint className="" role="status">No bars returned.</DiscoveryHint>
      )}
    </div>
  )
}
