import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import {
  liveSummaryBarClass,
  liveSummaryDividerClass,
  liveSummaryKeyClass,
  liveSummaryLabelClass,
  liveSummarySegClass,
  liveSummaryValClass,
} from './liveUi'

interface Props {
  sinceDollar: number
  sincePct: number | null
  dailyDollar: number
  dailyPct: number | null
  visible: boolean
}

export function LiveStreamsSummaryBar({ sinceDollar, sincePct, dailyDollar, dailyPct, visible }: Props) {
  if (!visible) return null

  const showDaily = dailyPct != null || dailyDollar !== 0

  return (
    <div className={liveSummaryBarClass} role="status" aria-label="STK streams summary">
      <span className={liveSummaryLabelClass}>STK Streams</span>
      <span className={liveSummarySegClass}>
        <span className={liveSummaryKeyClass}>SINCE $</span>
        <span className={cn(liveSummaryValClass, pnlColorClass(sinceDollar))}>
          {sinceDollar.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
        </span>
      </span>
      {sincePct != null && Number.isFinite(sincePct) && (
        <span className={liveSummarySegClass}>
          <span className={liveSummaryKeyClass}>SINCE %</span>
          <span className={cn(liveSummaryValClass, pnlColorClass(sincePct))}>
            {sincePct >= 0 ? '+' : ''}{sincePct.toFixed(2)}%
          </span>
        </span>
      )}
      {showDaily && (
        <>
          <span className={liveSummaryDividerClass} aria-hidden>|</span>
          <span className={liveSummarySegClass}>
            <span className={liveSummaryKeyClass}>DAILY $</span>
            <span className={cn(liveSummaryValClass, pnlColorClass(dailyDollar))}>
              {dailyDollar.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
            </span>
          </span>
          {dailyPct != null && Number.isFinite(dailyPct) && (
            <span className={liveSummarySegClass}>
              <span className={liveSummaryKeyClass}>DAILY %</span>
              <span className={cn(liveSummaryValClass, pnlColorClass(dailyPct))}>
                {dailyPct >= 0 ? '+' : ''}{dailyPct.toFixed(2)}%
              </span>
            </span>
          )}
        </>
      )}
    </div>
  )
}
