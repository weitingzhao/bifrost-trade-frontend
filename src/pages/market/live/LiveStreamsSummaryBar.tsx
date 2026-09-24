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
  /** The design's right edge: what the bar sums — `stocks · Host + Secondary`. */
  scopeLabel: string
}

function fmtUsdCompact(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function LiveStreamsSummaryBar({ sinceDollar, sincePct, dailyDollar, dailyPct, visible, scopeLabel }: Props) {
  if (!visible) return null

  const showDaily = dailyPct != null || dailyDollar !== 0
  const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`

  return (
    <div className={liveSummaryBarClass} role="status" aria-label="STK streams summary">
      <span className={liveSummaryLabelClass}>STK Streams</span>
      {/* The design pairs each reading’s $ and % in one segment — «Since
          +$4,671.00 +6.94%» — and names the sum’s scope at the right edge. */}
      <span className={liveSummarySegClass}>
        <span className={liveSummaryKeyClass}>Since</span>
        <span className={liveSummaryValClass}>
          <InlinePnl value={sinceDollar}>{fmtUsdCompact(sinceDollar)}</InlinePnl>{' '}
          {sincePct != null && Number.isFinite(sincePct) ? (
            <InlinePnl value={sincePct}>{pct(sincePct)}</InlinePnl>
          ) : null}
        </span>
      </span>
      {showDaily && (
        <>
          <span className={liveSummaryDividerClass} aria-hidden>|</span>
          <span className={liveSummarySegClass}>
            <span className={liveSummaryKeyClass}>Daily</span>
            <span className={liveSummaryValClass}>
              <InlinePnl value={dailyDollar}>{fmtUsdCompact(dailyDollar)}</InlinePnl>{' '}
              {dailyPct != null && Number.isFinite(dailyPct) ? (
                <InlinePnl value={dailyPct}>{pct(dailyPct)}</InlinePnl>
              ) : null}
            </span>
          </span>
        </>
      )}
      <span className="ml-auto whitespace-nowrap text-dense-meta text-muted-foreground">{scopeLabel}</span>
    </div>
  )
}
