import { InlinePnl } from '@/components/data-display'
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

function fmtUsdCompact(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function LiveStreamsSummaryBar({ sinceDollar, sincePct, dailyDollar, dailyPct, visible }: Props) {
  if (!visible) return null

  const showDaily = dailyPct != null || dailyDollar !== 0

  return (
    <div className={liveSummaryBarClass} role="status" aria-label="STK streams summary">
      <span className={liveSummaryLabelClass}>STK Streams</span>
      <span className={liveSummarySegClass}>
        <span className={liveSummaryKeyClass}>SINCE $</span>
        <span className={liveSummaryValClass}>
          <InlinePnl value={sinceDollar}>{fmtUsdCompact(sinceDollar)}</InlinePnl>
        </span>
      </span>
      {sincePct != null && Number.isFinite(sincePct) && (
        <span className={liveSummarySegClass}>
          <span className={liveSummaryKeyClass}>SINCE %</span>
          <span className={liveSummaryValClass}>
            <InlinePnl value={sincePct}>
              {sincePct >= 0 ? '+' : ''}
              {sincePct.toFixed(2)}%
            </InlinePnl>
          </span>
        </span>
      )}
      {showDaily && (
        <>
          <span className={liveSummaryDividerClass} aria-hidden>|</span>
          <span className={liveSummarySegClass}>
            <span className={liveSummaryKeyClass}>DAILY $</span>
            <span className={liveSummaryValClass}>
              <InlinePnl value={dailyDollar}>{fmtUsdCompact(dailyDollar)}</InlinePnl>
            </span>
          </span>
          {dailyPct != null && Number.isFinite(dailyPct) && (
            <span className={liveSummarySegClass}>
              <span className={liveSummaryKeyClass}>DAILY %</span>
              <span className={liveSummaryValClass}>
                <InlinePnl value={dailyPct}>
                  {dailyPct >= 0 ? '+' : ''}
                  {dailyPct.toFixed(2)}%
                </InlinePnl>
              </span>
            </span>
          )}
        </>
      )}
    </div>
  )
}
