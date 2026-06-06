import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { fetchSymbolOptionPcr } from '@/api/research'
import { postMassiveSync } from '@/api/research/optionDiscovery'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { SectionCollapseToggle } from './SectionCollapseToggle'
import { INSPECTOR_SECTION_NAV_BY_ID } from './stockInspectorSections'
import styles from './stock-inspector.module.css'
import { inspectorShell } from '@/components/layout/rightInspectorUi'
import { fmtRatio } from './stockInspectorUtils'
import { PcrDualLineChart } from './charts/PcrDualLineChart'
import { OpenInterestTrendChart } from './charts/OpenInterestTrendChart'
import { PcrChainTable } from './charts/PcrChainTable'
import {
  PCR_DEFAULT_WINDOW_DAYS,
  PCR_FETCH_DAYS,
  PCR_WINDOW_OPTIONS,
  type PcrWindowDays,
  filterTrendInWindow,
  fmtCompact,
  ratioToneClass,
} from './charts/pcrChartUtils'

interface Props {
  symbol: string
  sectionId?: string
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

export function StockPutCallSection({
  symbol,
  sectionId = 'stock-inspector-put-call',
  expanded = true,
  onExpandedChange,
}: Props) {
  const sym = symbol.trim().toUpperCase()
  const [showTrendData, setShowTrendData] = useState(false)
  const [chartWindowDays, setChartWindowDays] = useState<PcrWindowDays>(PCR_DEFAULT_WINDOW_DAYS)
  const [refreshing, setRefreshing] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: QUERY_KEYS.research.optionPcr(sym),
    queryFn: () => fetchSymbolOptionPcr(sym, PCR_FETCH_DAYS),
    enabled: !!sym && expanded,
    staleTime: 120_000,
    retry: 0,
  })

  const loadError = data && !data.ok ? data.error : undefined

  async function handleRefresh() {
    if (!sym || refreshing) return
    setRefreshing(true)
    try {
      const res = await postMassiveSync('feed_option_snapshots', { mode: 'chain', underlying: sym })
      if (!res.ok) return
      await new Promise((r) => setTimeout(r, 2500))
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.research.optionPcr(sym) })
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }

  const trend = useMemo(() => data?.trend ?? [], [data?.trend])
  const chain = data?.chain_by_expiry ?? []
  const asOfDate = data?.as_of_date

  const trendInWindow = useMemo(
    () => filterTrendInWindow(trend, chartWindowDays, asOfDate),
    [trend, chartWindowDays, asOfDate],
  )

  if (!sym) return null

  return (
    <section id={sectionId} className={inspectorShell.section}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <SectionCollapseToggle
          navItem={INSPECTOR_SECTION_NAV_BY_ID.putCall}
          expanded={expanded}
          onToggle={() => onExpandedChange?.(!expanded)}
        />
        {expanded && (
        <div className="flex items-center gap-2 shrink-0">
          {asOfDate && (
            <span className="text-[10px] text-muted-foreground font-mono">as of {asOfDate}</span>
          )}
          {data?.stale_days != null && data.stale_days > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">
              {data.stale_days}d ago
            </span>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={refreshing || isLoading}
            onClick={() => void handleRefresh()}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
        )}
      </div>

      {expanded && (
        <>
          {isLoading && !data && <p className={styles.hint}>Loading put/call data…</p>}
          {loadError && <p className={cn(styles.hint, styles.hintErr)}>{loadError}</p>}

          {data?.ok && (
            <>
              <div className={styles.pcrBlock}>
                <div className={styles.pcrKpis}>
                  <div className={styles.pcrKpi}>
                    <span className={styles.pcrKpiLabel}>OI Ratio</span>
                    <span className={styles.pcrKpiVal}>{fmtRatio(data.oi_ratio)}</span>
                  </div>
                  <div className={styles.pcrKpi}>
                    <span className={styles.pcrKpiLabel}>Vol Ratio</span>
                    <span className={styles.pcrKpiVal}>{fmtRatio(data.vol_ratio)}</span>
                  </div>
                  <div className={styles.pcrKpi}>
                    <span className={styles.pcrKpiLabel}>5D Avg OI</span>
                    <span className={cn(styles.pcrKpiVal, 'text-foreground')}>
                      {fmtRatio(data.avg_oi_5d)}
                    </span>
                  </div>
                </div>

                <div className={styles.pcrWindowRow}>
                  <span className={styles.pcrWindowLabel}>Chart range</span>
                  <div className={styles.pcrWindowTabs} role="group" aria-label="P/C chart time range">
                    {PCR_WINDOW_OPTIONS.map(({ label, days }) => (
                      <button
                        key={days}
                        type="button"
                        className={cn(
                          styles.pcrWindowTab,
                          chartWindowDays === days && styles.pcrWindowTabActive,
                        )}
                        aria-pressed={chartWindowDays === days}
                        onClick={() => setChartWindowDays(days)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.pcrChartBlock}>
                  <div className={styles.pcrChartHead}>
                    <span className={styles.pcrChartTitle}>
                      <span className={styles.pcrTitleMark} aria-hidden />
                      P/C Ratio Trend
                    </span>
                    <div className={styles.pcrLegend}>
                      <span>
                        <span className={cn(styles.pcrLegendSwatch, styles.pcrLegendSwatchOi)} />
                        OI Ratio
                      </span>
                      <span>
                        <span className={cn(styles.pcrLegendSwatch, styles.pcrLegendSwatchVol)} />
                        Vol Ratio
                      </span>
                      <span className={styles.pcrLegendRef}>— — 1.0 ref</span>
                    </div>
                  </div>
                  <div className={styles.pcrChartFrame}>
                    <PcrDualLineChart
                      points={trend}
                      windowDays={chartWindowDays}
                      asOfDate={asOfDate}
                    />
                  </div>
                </div>

                <div className={styles.pcrChartBlock}>
                  <div className={styles.pcrChartHead}>
                    <span className={styles.pcrChartTitle}>
                      <span className={styles.pcrTitleMark} aria-hidden />
                      Open Interest
                    </span>
                    <div className={styles.pcrLegend}>
                      <span>
                        <span className={cn(styles.pcrLegendSwatch, styles.pcrLegendSwatchPut)} />
                        Put OI
                      </span>
                      <span>
                        <span className={cn(styles.pcrLegendSwatch, styles.pcrLegendSwatchCall)} />
                        Call OI
                      </span>
                    </div>
                  </div>
                  <div className={styles.pcrChartFrame}>
                    <OpenInterestTrendChart
                      points={trend}
                      windowDays={chartWindowDays}
                      asOfDate={asOfDate}
                    />
                  </div>
                </div>

                <div className={styles.pcrTrendFoot}>
                  <button
                    type="button"
                    className={cn(styles.pcrShowDataBtn, showTrendData && styles.pcrShowDataBtnOpen)}
                    onClick={() => setShowTrendData((v) => !v)}
                  >
                    {showTrendData ? '▴' : '▾'} Show Data · {chartWindowDays}d
                  </button>
                  <span className={styles.pcrHintItalic}>OI ratio &gt; 1 = more puts (bearish lean)</span>
                </div>

                {showTrendData && trendInWindow.length > 0 && (
                  <div className={styles.pcrTrendTableWrap}>
                    <table className={styles.pcrTrendTable}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>OI Ratio</th>
                          <th>Vol Ratio</th>
                          <th>Put OI</th>
                          <th>Call OI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...trendInWindow].reverse().map((p) => (
                          <tr key={p.trade_date}>
                            <td>{p.trade_date}</td>
                            <td className={ratioToneClass(p.oi_ratio, styles.ratioHigh, styles.ratioLow)}>
                              {fmtRatio(p.oi_ratio)}
                            </td>
                            <td className={ratioToneClass(p.vol_ratio, styles.ratioHigh, styles.ratioLow)}>
                              {fmtRatio(p.vol_ratio)}
                            </td>
                            <td>{fmtCompact(p.put_oi)}</td>
                            <td>{fmtCompact(p.call_oi)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className={styles.chainSection} aria-labelledby="stock-pcr-chain-head">
                <div className={styles.chainSectionHead}>
                  <h4 id="stock-pcr-chain-head" className={styles.chainSectionTitle}>
                    <span className={styles.pcrTitleMark} aria-hidden />
                    Option Chain by Expiry
                  </h4>
                  <span className={styles.chainNote}>Refreshed via Put/Call Ratio</span>
                </div>
                <PcrChainTable rows={chain} />
              </div>
            </>
          )}

        </>
      )}
    </section>
  )
}
