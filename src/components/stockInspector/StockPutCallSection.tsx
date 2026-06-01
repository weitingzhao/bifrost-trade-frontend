import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { fetchSymbolOptionPcr } from '@/api/research'
import { postMassiveSync } from '@/api/research/optionDiscovery'
import { QUERY_KEYS } from '@/constants/queryKeys'
import styles from './stock-inspector.module.css'
import { fmtRatio } from './stockInspectorUtils'

const LOOKBACK_DAYS = 365

interface Props {
  symbol: string
}

export function StockPutCallSection({ symbol }: Props) {
  const sym = symbol.trim().toUpperCase()
  const [expanded, setExpanded] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.research.optionPcr(sym),
    queryFn: () => fetchSymbolOptionPcr(sym, LOOKBACK_DAYS),
    enabled: !!sym,
    staleTime: 120_000,
  })

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

  if (!sym) return null

  return (
    <section className={styles.section}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          type="button"
          className={cn(styles.sectionTitle, 'mb-0 cursor-pointer border-0 bg-transparent p-0')}
          onClick={() => setExpanded((v) => !v)}
        >
          <span>Put/Call Ratio</span>
          <span className="text-[10px] opacity-60" aria-hidden>{expanded ? '▴' : '▾'}</span>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {data?.as_of_date && (
            <span className="text-[10px] text-muted-foreground font-mono">as of {data.as_of_date}</span>
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
      </div>

      {expanded && (
        <>
          {isLoading && !data && <p className={styles.hint}>Loading put/call data…</p>}
          {error && <p className={cn(styles.hint, styles.hintErr)}>{(error as Error).message}</p>}
          {data?.ok && (
            <>
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
                  <span className={cn(styles.pcrKpiVal, 'text-foreground')}>{fmtRatio(data.avg_oi_5d)}</span>
                </div>
              </div>
              {(data.trend?.length ?? 0) > 0 && (
                <p className={styles.hint}>
                  P/C trend: {data.trend!.length} points over {data.lookback_days ?? LOOKBACK_DAYS} days.
                </p>
              )}
              {(data.chain_by_expiry?.length ?? 0) > 0 && (
                <div className="overflow-x-auto mt-2">
                  <table className={styles.rawTable}>
                    <thead>
                      <tr>
                        <th className="text-left">Expiry</th>
                        <th>DTE</th>
                        <th>P/C OI</th>
                        <th>P/C Vol</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.chain_by_expiry!.slice(0, 12).map((row) => (
                        <tr key={row.expiry}>
                          <td className="text-left">{row.expiration_label || row.expiry}</td>
                          <td>{row.dte ?? '—'}</td>
                          <td>{fmtRatio(row.pc_oi)}</td>
                          <td>{fmtRatio(row.pc_vol)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
          {data && !data.ok && data.error && (
            <p className={cn(styles.hint, styles.hintErr)}>{data.error}</p>
          )}
        </>
      )}
    </section>
  )
}
