import { cn } from '@/lib/utils'
import type { ProfitLossTone, WinPctTone } from '@/utils/winRate'
import {
  winRateKpiHighlightClass,
  winRateKpiLabelClass,
  winRateKpiLabelCompactClass,
  winRateKpiShellClass,
  winRateKpiValueClass,
  winRateKpiValueCompactClass,
  winRateKpiWinPctValueClass,
} from './winRateUi'
import { profitLossToneClass, winPctToneClass } from './toneClasses'

export interface WinRateKpiProps {
  label: string
  value: string
  tone?: WinPctTone | ProfitLossTone
  highlight?: boolean
  winPctSize?: boolean
  compact?: boolean
  title?: string
}

function resolveToneClass(
  tone: WinPctTone | ProfitLossTone,
  winPctSize: boolean,
): string {
  if (winPctSize) return winPctToneClass(tone as WinPctTone)
  return profitLossToneClass(tone as ProfitLossTone)
}

export function WinRateKpi({
  label,
  value,
  tone = 'muted',
  highlight = false,
  winPctSize = false,
  compact = false,
  title,
}: WinRateKpiProps) {
  return (
    <div
      className={cn(winRateKpiShellClass, highlight && winRateKpiHighlightClass)}
      title={title}
    >
      <span className={compact ? winRateKpiLabelCompactClass : winRateKpiLabelClass}>
        {label}
      </span>
      <span
        className={cn(
          compact ? winRateKpiValueCompactClass : winRateKpiValueClass,
          winPctSize && !compact && winRateKpiWinPctValueClass,
          resolveToneClass(tone, winPctSize),
        )}
      >
        {value}
      </span>
    </div>
  )
}
