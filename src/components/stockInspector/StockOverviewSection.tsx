import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { TickerOverview } from '@/types/research'
import styles from './stock-inspector.module.css'
import { fmtEmployees, fmtMarketCapChip } from './stockInspectorUtils'

interface Props {
  loading: boolean
  overview: TickerOverview | undefined
}

export function StockOverviewSection({ loading, overview }: Props) {
  const [descExpanded, setDescExpanded] = useState(false)

  if (loading) {
    return (
      <section className={styles.section}>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-full mt-2" />
        <Skeleton className="h-3 w-3/4 mt-1" />
      </section>
    )
  }

  if (!overview?.found) {
    return (
      <section className={styles.section}>
        <p className={styles.hint}>Ticker overview unavailable.</p>
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <div className={styles.overviewMeta}>
        {overview.name && <span className={styles.overviewName}>{overview.name}</span>}
        {(overview.primary_exchange || overview.exchange) && (
          <span className={cn(styles.chip, styles.chipExch)}>
            {overview.primary_exchange || overview.exchange}
          </span>
        )}
        {overview.market_cap != null && (
          <span className={styles.chip} title="Market cap">
            {fmtMarketCapChip(overview.market_cap)}
          </span>
        )}
        {overview.total_employees != null && (
          <span className={styles.chip} title="Employees">
            {fmtEmployees(overview.total_employees)}
          </span>
        )}
        {overview.list_date && (
          <span className={styles.chip} title="List date">
            est. {overview.list_date.slice(0, 4)}
          </span>
        )}
      </div>

      {overview.description && (
        <p
          className={descExpanded ? `${styles.overviewDesc} ${styles.overviewDescExpanded}` : styles.overviewDesc}
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
              <span key={t} className={styles.chip}>{t}</span>
            ))
          : <span className={styles.hint}>No related tickers on record</span>}
      </div>
    </section>
  )
}
