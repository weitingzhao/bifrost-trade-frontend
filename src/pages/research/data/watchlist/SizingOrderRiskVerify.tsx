import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { fmtUsd } from '@/utils/positions'
import {
  HELP_ORDER_RISK_VERIFY,
  sizingDashFootnoteClass,
  sizingDashRiskVerifyClass,
  sizingOrderAtrSheetClass,
  sizingOrderAtrSheetGroupClass,
  sizingOrderAtrSheetTitleClass,
  sizingOrderMetricSuffixClass,
  sizingOrderRiskHeadClass,
  sizingOrderSheetColClass,
  sizingOrderSheetTwoColClass,
  sizingOrderTwoColCardsClass,
  sizingDashSubtitleClass,
} from './sizingUi'
import { SizingMetricCard } from './SizingMetricCard'

export type ManualOrderAnalytics = {
  distance: number | null
  distancePctOfBid: number | null
  positionalDrawdownRatio: number | null
  riskPerShare: number | null
  orderRiskUsd: number | null
  riskPct: number | null
  investmentUsd: number | null
  investmentWeightPct: number | null
  cashLeftAfter: number | null
  atr14: number | null
  atrPctPercent: number | null
  atrRisk: number | null
  isComplete: boolean
}

interface Props {
  analytics: ManualOrderAnalytics
}

export function SizingOrderRiskVerify({ analytics }: Props) {
  const cashWarn = analytics.cashLeftAfter != null && analytics.cashLeftAfter < 0

  return (
    <section className={sizingDashRiskVerifyClass} aria-labelledby="watchlist-risk-verify-head">
      <div className={sizingOrderRiskHeadClass}>
        <h5 id="watchlist-risk-verify-head" className={cn(sizingDashSubtitleClass, 'mb-0')}>
          Order risk verify
        </h5>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground" aria-label="Order risk verify help">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">{HELP_ORDER_RISK_VERIFY}</TooltipContent>
        </Tooltip>
      </div>

      <div className={sizingOrderAtrSheetGroupClass}>
        <h6 className={sizingOrderAtrSheetTitleClass}>Risk sheet</h6>
        <div className={sizingOrderSheetTwoColClass}>
          <div className={sizingOrderSheetColClass}>
            <SizingMetricCard
              highlight
              label="Distance"
              value={
                analytics.distance != null ? (
                  <>
                    {fmtUsd(analytics.distance)}
                    {analytics.distancePctOfBid != null ? (
                      <span className={sizingOrderMetricSuffixClass}>
                        {' '}
                        ({(analytics.distancePctOfBid * 100).toFixed(2)}%)
                      </span>
                    ) : null}
                  </>
                ) : (
                  '—'
                )
              }
            />
            <SizingMetricCard
              highlight
              label="Positional drawdown"
              value={
                analytics.positionalDrawdownRatio != null
                  ? `${(analytics.positionalDrawdownRatio * 100).toFixed(2)}% of entry`
                  : '—'
              }
            />
            <SizingMetricCard
              highlight
              label="Risk per share"
              value={analytics.riskPerShare != null ? fmtUsd(analytics.riskPerShare) : '—'}
            />
          </div>
          <div className={sizingOrderSheetColClass}>
            <SizingMetricCard
              label="Order risk ($)"
              value={analytics.orderRiskUsd != null ? fmtUsd(analytics.orderRiskUsd) : '—'}
            />
            <SizingMetricCard
              label="Risk % of NAV"
              value={analytics.riskPct != null ? `${analytics.riskPct.toFixed(2)}%` : '—'}
            />
          </div>
        </div>
      </div>

      <div className={sizingOrderAtrSheetClass}>
        <h6 className={sizingOrderAtrSheetTitleClass}>Capital sheet</h6>
        <div className={sizingOrderTwoColCardsClass}>
          <SizingMetricCard
            label="Investment"
            value={analytics.investmentUsd != null ? fmtUsd(analytics.investmentUsd) : '—'}
          />
          <SizingMetricCard
            label="Investment weight"
            value={
              analytics.investmentWeightPct != null
                ? `${analytics.investmentWeightPct.toFixed(2)}% of NAV`
                : '—'
            }
          />
          <SizingMetricCard
            label="Cash left"
            warn={cashWarn}
            value={analytics.cashLeftAfter != null ? fmtUsd(analytics.cashLeftAfter) : '—'}
          />
        </div>
      </div>

      <div className={sizingOrderAtrSheetClass}>
        <h6 className={sizingOrderAtrSheetTitleClass}>ATR sheet</h6>
        <div className={sizingOrderTwoColCardsClass}>
          <SizingMetricCard
            highlight
            label="ATR(14)"
            value={analytics.atr14 != null ? fmtUsd(analytics.atr14) : '—'}
          />
          <SizingMetricCard
            highlight
            label="ATR % of entry"
            value={
              analytics.atrPctPercent != null ? `${analytics.atrPctPercent.toFixed(2)}%` : '—'
            }
          />
          <SizingMetricCard
            highlight
            label="ATR risk"
            value={analytics.atrRisk != null ? `${analytics.atrRisk.toFixed(2)} ATR` : '—'}
          />
        </div>
      </div>

      {!analytics.isComplete ? (
        <p className={sizingDashFootnoteClass}>
          Enter Entry price, Exit price, and Share amt above to complete the risk check.
        </p>
      ) : null}
    </section>
  )
}
