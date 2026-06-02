import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { TickerOverview } from '@/types/research'
import styles from './stock-inspector.module.css'
import { inspectorShell } from '@/components/layout/rightInspectorUi'
import { fmtEmployees, fmtMarketCapChip } from './stockInspectorUtils'

interface Props {
  loading: boolean
  overview: TickerOverview | undefined
}

export function StockOverviewSection({ loading, overview }: Props) {
  const [descExpanded, setDescExpanded] = useState(false)

  if (loading) {
    return (
      <section className={inspectorShell.section}>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-full mt-2" />
        <Skeleton className="h-3 w-3/4 mt-1" />
      </section>
    )
  }

  if (!overview?.found) {
    return (
      <section className={inspectorShell.section}>
        <p className={styles.hint}>Ticker overview unavailable.</p>
      </section>
    )
  }

  return (
    <section className={inspectorShell.section}>
      <div className={styles.overviewMeta}>
        {overview.name && <span className={styles.overviewName}>{overview.name}</span>}
        {overview.sector && (
          <span className={cn(styles.chip, styles.chipSector)}>{overview.sector}</span>
        )}
        {overview.industry && overview.industry !== overview.sector && (
          <span className={styles.chip}>{overview.industry}</span>
        )}
        {(overview.primary_exchange || overview.exchange) && (
          <span className={cn(styles.chip, styles.chipExch)}>
            {overview.primary_exchange || overview.exchange}
          </span>
        )}
        {overview.market_cap != null && (
          <span className={cn(styles.chip, styles.chipNum)} title="Market cap">
            {fmtMarketCapChip(overview.market_cap)}
          </span>
        )}
        {overview.total_employees != null && (
          <span className={cn(styles.chip, styles.chipNum)} title="Employees">
            {fmtEmployees(overview.total_employees)}
          </span>
        )}
        {overview.list_date && (
          <span className={cn(styles.chip, styles.chipDim)} title="List date">
            est. {overview.list_date.slice(0, 4)}
          </span>
        )}
        {overview.homepage_url && (
          <a
            className={cn(styles.chip, styles.chipLink)}
            href={overview.homepage_url}
            target="_blank"
            rel="noopener noreferrer"
            title={overview.homepage_url}
          >
            ↗
          </a>
        )}
      </div>

      {overview.description && (
        <p
          className={
            descExpanded
              ? `${styles.overviewDesc} ${styles.overviewDescExpanded}`
              : styles.overviewDesc
          }
          onClick={() => setDescExpanded((v) => !v)}
          title={descExpanded ? 'Click to collapse' : 'Click to expand'}
        >
          {overview.description}
        </p>
      )}

      <div className={styles.relatedRow}>
        <span className={styles.relatedLabel}>Related</span>
        {overview.related_tickers && overview.related_tickers.length > 0
          ? overview.related_tickers.map((t) => (
              <span key={t} className={styles.chip}>
                {t}
              </span>
            ))
          : <span className={styles.hint}>No related tickers on record</span>}
      </div>
    </section>
  )
}