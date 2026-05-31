import { cn } from '@/lib/utils'
import styles from '@/pages/strategy/WinRatePage.module.css'
import { kpiToneClass } from './toneClasses'
import type { ProfitLossTone, WinPctTone } from '@/utils/winRate'

export interface WinRateKpiProps {
  label: string
  value: string
  tone?: WinPctTone | ProfitLossTone
  highlight?: boolean
  winPctSize?: boolean
  title?: string
}

export function WinRateKpi({
  label,
  value,
  tone = 'muted',
  highlight = false,
  winPctSize = false,
  title,
}: WinRateKpiProps) {
  return (
    <div
      className={cn(styles.kpi, highlight && styles.kpiHighlight)}
      title={title}
    >
      <span className={styles.kpiLabel}>{label}</span>
      <span
        className={cn(
          styles.kpiValue,
          winPctSize && styles.kpiValueWinPct,
          kpiToneClass(tone),
        )}
      >
        {value}
      </span>
    </div>
  )
}
