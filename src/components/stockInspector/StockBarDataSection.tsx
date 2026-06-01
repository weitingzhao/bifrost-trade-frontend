import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { BarsCandlestickChart } from '@/components/charts/BarsCandlestickChart'
import { fetchBarStats, fetchBars } from '@/api/market'
import { postMassiveSync, pollMassiveJobUntilDone, resolveMassiveSyncJobId } from '@/api/research/optionDiscovery'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { Bar } from '@/types/market'
import styles from './stock-inspector.module.css'

type ChartPeriod = '1 D' | '1 min'

interface Props {
  symbol: string
}

export function StockBarDataSection({ symbol }: Props) {
  const sym = symbol.trim().toUpperCase()
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('1 D')
  const barLimit = chartPeriod === '1 D' ? 120 : 390
  const [fetchStep, setFetchStep] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showVolume, setShowVolume] = useState(true)
  const [showVwap, setShowVwap] = useState(false)
  const [showMacd, setShowMacd] = useState(true)
  const [showBb, setShowBb] = useState(true)
  const [showRsi, setShowRsi] = useState(true)
  const [showSr, setShowSr] = useState(false)

  const { data: stats } = useQuery({
    queryKey: QUERY_KEYS.research.barStats(sym),
    queryFn: () => fetchBarStats(sym),
    enabled: !!sym,
    staleTime: 60_000,
  })

  const {
    data: barsRes,
    isLoading: chartLoading,
    error: chartQueryError,
    refetch: refetchBars,
  } = useQuery({
    queryKey: ['market', 'bars', sym, chartPeriod, barLimit],
    queryFn: () => fetchBars(sym, chartPeriod, barLimit),
    enabled: !!sym,
  })

  const chartBars = useMemo(() => (barsRes?.bars ?? []) as Bar[], [barsRes?.bars])
  const chartError = chartQueryError instanceof Error ? chartQueryError.message : chartQueryError ? String(chartQueryError) : null
  const chartInfo =
    !chartLoading && chartBars.length === 0
      ? barsRes?.message?.trim() ||
        `No ${chartPeriod} bars in database. Use Fetch, wait for the job, then reload.`
      : null

  async function reloadChart() {
    await refetchBars()
  }

  const chartBarsSorted = useMemo(
    () => [...chartBars].filter((b) => b.time != null).sort((a, b) => (a.time ?? 0) - (b.time ?? 0)),
    [chartBars],
  )

  async function handleFetch() {
    if (!sym || fetchStep) return
    setFetchError(null)
    setFetchStep('Enqueue daily OHLC…')
    try {
      const res = await postMassiveSync('feed_stocks_aggregate', {
        mode: 'custom_bars',
        sync_all_periods: true,
        custom_bars_period_group: 'daily',
        custom_bars_sync_mode: 'daily_smart',
        start_ms: 0,
        end_ms: 0,
        symbols: [sym],
      })
      const jobId = resolveMassiveSyncJobId(res)
      if (!jobId) {
        setFetchError(res.error ?? 'Enqueue failed')
        return
      }
      setFetchStep('Waiting for job…')
      const polled = await pollMassiveJobUntilDone(jobId, { maxAttempts: 90, intervalMs: 1000 })
      if (!polled.ok) {
        setFetchError(polled.error ?? 'Job failed')
        return
      }
      await reloadChart()
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Fetch failed')
    } finally {
      setFetchStep(null)
    }
  }

  if (!sym) return null

  return (
    <section className={styles.barSection} aria-labelledby="stock-bar-data-head">
      <div className={styles.barTopRow}>
        <span id="stock-bar-data-head" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Bar Data
        </span>
        {stats != null && (
          <div className="flex flex-wrap gap-1">
            <span className={styles.barKpiPill}>
              <span className="text-muted-foreground">Daily</span>
              <span>{stats.stock_day.toLocaleString()}</span>
            </span>
            {Object.entries(stats.stock_min ?? {}).map(([period, count]) => (
              <span key={period} className={styles.barKpiPill}>
                <span className="text-muted-foreground">{period}</span>
                <span>{count.toLocaleString()}</span>
              </span>
            ))}
          </div>
        )}
        <Button
          type="button"
          size="sm"
          variant="default"
          className="h-7 text-xs ml-auto"
          disabled={!!fetchStep}
          onClick={() => void handleFetch()}
        >
          {fetchStep ?? 'Fetch'}
        </Button>
      </div>

      {fetchError && <p className={cn(styles.hint, styles.hintErr)}>{fetchError}</p>}

      <div className={styles.barControls}>
        <div className="flex gap-1" role="tablist" aria-label="Period">
          {(['1 D', '1 min'] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={chartPeriod === p}
              className={chartPeriod === p ? `${styles.periodTab} ${styles.periodTabActive}` : styles.periodTab}
              onClick={() => setChartPeriod(p)}
            >
              {p === '1 D' ? 'Daily' : '1 min'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { label: 'Vol', state: showVolume, set: setShowVolume },
              { label: 'VWAP', state: showVwap, set: setShowVwap },
              { label: 'MACD', state: showMacd, set: setShowMacd },
              { label: 'BB', state: showBb, set: setShowBb },
              { label: 'RSI', state: showRsi, set: setShowRsi },
              { label: 'S/R', state: showSr, set: setShowSr },
            ] as const
          ).map(({ label, state, set }) => (
            <label key={label} className={styles.layerToggle}>
              <input
                type="checkbox"
                checked={state}
                onChange={(e) => set(e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          disabled={chartLoading || !!fetchStep}
          onClick={() => void reloadChart()}
          title="Reload chart"
        >
          ↻
        </Button>
      </div>

      {chartError && <p className={cn(styles.hint, styles.hintErr)} role="alert">{chartError}</p>}
      {chartInfo && !chartError && <p className={styles.hint}>{chartInfo}</p>}
      {chartLoading && chartBarsSorted.length === 0 && (
        <p className={styles.hint}>Loading chart from database…</p>
      )}
      {chartBarsSorted.length > 0 && (
        <div className="min-w-0 overflow-x-auto">
          <BarsCandlestickChart
            bars={chartBarsSorted}
            period={chartPeriod}
            showVolume={showVolume}
            showVwap={showVwap}
            showMacd={showMacd}
            showBollinger={showBb}
            showRsi={showRsi}
            showSr={showSr}
          />
        </div>
      )}
    </section>
  )
}
