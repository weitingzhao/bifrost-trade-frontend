import { cn } from '@/lib/utils'
import type { LivePositionRow } from '@/types/positions'
import { fmtUsd, pnlColorClass } from '@/utils/positions'
import styles from './stock-inspector.module.css'

interface Props {
  accountId?: string
  position: LivePositionRow
}

export function StockPositionSection({ accountId, position }: Props) {
  const qty = Number(position.position)
  const avgCost = position.avgCost != null ? Number(position.avgCost) : null
  const lastPrice = position.price != null ? Number(position.price) : null
  const pnl = position.unrealized_pnl != null ? Number(position.unrealized_pnl) : null
  const prevClose = position.daily_prev_close != null ? Number(position.daily_prev_close) : null

  const dailyPnl = lastPrice != null && prevClose != null && Number.isFinite(qty)
    ? (lastPrice - prevClose) * qty
    : null
  const dailyPct = lastPrice != null && prevClose != null && prevClose !== 0
    ? ((lastPrice - prevClose) / prevClose) * 100
    : null
  const sincePct = pnl != null && avgCost != null && avgCost !== 0 && Number.isFinite(qty)
    ? (pnl / Math.abs(avgCost * qty)) * 100
    : null

  const rows: [string, string, string?][] = [
    ['Side', qty > 0 ? 'Long' : qty < 0 ? 'Short' : '—'],
    ['Qty', Number.isFinite(qty) ? String(qty) : '—'],
    ['Avg cost', fmtUsd(avgCost)],
    ['Last', fmtUsd(lastPrice)],
    ['Market value', lastPrice != null && Number.isFinite(qty) ? fmtUsd(lastPrice * qty) : '—'],
    ['Daily $', fmtUsd(dailyPnl), pnlColorClass(dailyPnl)],
    ['Daily %', dailyPct != null ? `${dailyPct >= 0 ? '+' : ''}${dailyPct.toFixed(2)}%` : '—', pnlColorClass(dailyPct)],
    ['Since $', fmtUsd(pnl), pnlColorClass(pnl)],
    ['Since %', sincePct != null ? `${sincePct >= 0 ? '+' : ''}${sincePct.toFixed(2)}%` : '—', pnlColorClass(sincePct)],
  ]

  return (
    <section className={styles.section} aria-labelledby="stock-inspector-position">
      <div id="stock-inspector-position" className={styles.sectionTitle}>
        <span>Position{accountId ? ` · ${accountId}` : ''}</span>
      </div>
      <div className={styles.kvGrid}>
        {rows.map(([k, v, colorClass]) => (
          <span key={k} className="contents">
            <span className={styles.kvKey}>{k}</span>
            <span className={cn(colorClass)}>{v}</span>
          </span>
        ))}
      </div>
    </section>
  )
}
