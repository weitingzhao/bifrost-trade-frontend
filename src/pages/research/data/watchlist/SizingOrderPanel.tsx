import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconActionButton } from '@/components/data-display'
import { fmtUsd } from '@/utils/positions'
import type { AtrResult, KellyMetrics, PositionSizeResult } from '@/utils/riskSizing'
import { WatchlistSizingCapTable } from './WatchlistSizingCapTable'
import { SizingMetricCard } from './SizingMetricCard'
import {
  sizingDashCardsClass,
  sizingDashFootnoteClass,
  sizingDashHintClass,
  sizingDashNestedClass,
  sizingDashSubtitleClass,
  sizingDashSubtitleSmClass,
  sizingKellyExactInputClass,
  sizingKellyExactLabelClass,
  sizingKellyExactRowClass,
  sizingKellyRangeBlockClass,
  sizingKellyRangeHeadClass,
  sizingKellyRangeLabelClass,
  sizingKellyRangeReadoutClass,
  sizingKellyRangeScaleClass,
  sizingPanelClass,
  sizingPanelControlsClass,
  sizingPanelHeadClass,
  sizingPanelTitleClass,
  sizingRangeElegantClass,
} from './sizingUi'

type CapRow = {
  key: string
  label: string
  maxRiskUsd: number | null
  maxShares: number | null
}

type SizingOrderAnalytics = {
  intendedShares: number
  intendedRiskPct: number | null
  investmentUsd: number | null
  investmentWeightPct: number | null
  cashLeftAfter: number | null
  capRows: CapRow[]
  cashCapShares: number | null
  availableMinShares: number | null
}

interface Props {
  symbol: string
  kellyFraction: number
  sizeAtrMultiplier: number
  sizeComputeLoading: boolean
  sizeComputeError: string | null
  sizeAtrResult: AtrResult | null
  sizePosResult: PositionSizeResult | null
  sizeCurrentPrice: number | null
  kellyMetrics: KellyMetrics
  sizingOrderAnalytics: SizingOrderAnalytics
  totalBuyingPower: number
  onKellyFractionChange: (v: number) => void
  onAtrMultiplierChange: (v: number) => void
  onRecompute: () => void
  onClose: () => void
}

export function SizingOrderPanel({
  symbol,
  kellyFraction,
  sizeAtrMultiplier,
  sizeComputeLoading,
  sizeComputeError,
  sizeAtrResult,
  sizePosResult,
  sizeCurrentPrice,
  kellyMetrics,
  sizingOrderAnalytics,
  totalBuyingPower,
  onKellyFractionChange,
  onAtrMultiplierChange,
  onRecompute,
  onClose,
}: Props) {
  const cashWarn =
    sizingOrderAnalytics.cashLeftAfter != null && sizingOrderAnalytics.cashLeftAfter < 0

  return (
    <div className={sizingPanelClass}>
      <div className={sizingPanelHeadClass}>
        <h4 className={sizingPanelTitleClass}>Order sizing — {symbol}</h4>
        <IconActionButton
          onClick={onClose}
          title="Close order sizing"
          ariaLabel="Close order sizing"
          className="ml-auto"
        >
          <X className="h-3.5 w-3.5" />
        </IconActionButton>
      </div>

      <div className={sizingPanelControlsClass}>
        <div className={sizingKellyRangeBlockClass}>
          <div className={sizingKellyRangeHeadClass}>
            <label className={sizingKellyRangeLabelClass} htmlFor="watchlist-kelly-fraction">
              Kelly fraction
            </label>
            <span className={sizingKellyRangeReadoutClass} aria-live="polite">
              {kellyFraction.toFixed(2)}
            </span>
          </div>
          <input
            id="watchlist-kelly-fraction"
            type="range"
            className={sizingRangeElegantClass}
            min={0.05}
            max={1}
            step={0.05}
            value={kellyFraction}
            onChange={e => onKellyFractionChange(Number.parseFloat(e.target.value))}
            aria-valuemin={0.05}
            aria-valuemax={1}
            aria-valuenow={kellyFraction}
            aria-label="Kelly fraction"
          />
          <div className={sizingKellyRangeScaleClass} aria-hidden>
            <span>0.05</span>
            <span>1.00</span>
          </div>
          <div className={sizingKellyExactRowClass}>
            <label className={sizingKellyExactLabelClass} htmlFor="watchlist-kelly-exact">
              Exact
            </label>
            <input
              id="watchlist-kelly-exact"
              type="number"
              className={sizingKellyExactInputClass}
              min={0.05}
              max={1}
              step={0.05}
              value={kellyFraction}
              onChange={e =>
                onKellyFractionChange(
                  Math.max(0.05, Math.min(1, Number.parseFloat(e.target.value) || 0.5)),
                )
              }
              aria-label="Kelly fraction numeric"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="whitespace-nowrap text-xs text-muted-foreground" htmlFor="watchlist-atr-mult">
            ATR multiplier
          </label>
          <input
            id="watchlist-atr-mult"
            type="number"
            min={0.5}
            max={5}
            step={0.5}
            value={sizeAtrMultiplier}
            onChange={e => onAtrMultiplierChange(Number.parseFloat(e.target.value) || 2)}
            className="h-8 w-[4.1rem] rounded-md border border-input bg-background px-2 font-mono text-sm"
          />
        </div>

        <Button type="button" variant="secondary" size="sm" disabled={sizeComputeLoading} onClick={onRecompute}>
          {sizeComputeLoading ? 'Computing…' : 'Recompute'}
        </Button>
      </div>

      {sizeComputeError ? (
        <p className="mb-2 text-sm text-destructive" role="alert">
          {sizeComputeError}
        </p>
      ) : null}

      {sizeComputeLoading ? (
        <p className={sizingDashHintClass}>Fetching bars and quote…</p>
      ) : null}

      {!sizeComputeLoading && sizeAtrResult ? (
        <>
          <section className={sizingDashNestedClass} aria-labelledby="watchlist-order-sizing-head">
            <h5 id="watchlist-order-sizing-head" className={sizingDashSubtitleClass}>
              Order sizing
            </h5>
            <p className={sizingDashHintClass}>
              Auto sizing suggestion from ATR + Kelly. Portfolio <strong>Max drawdown %</strong> and{' '}
              <strong>static risk budget</strong> are set in <strong>Portfolio risk power</strong> (expand if
              collapsed); the ladder row <em>Portfolio max DD budget</em> uses the same percentage.
            </p>
            <div className={sizingDashCardsClass}>
              <SizingMetricCard
                label="Intended shares"
                value={
                  sizingOrderAnalytics.intendedShares > 0
                    ? sizingOrderAnalytics.intendedShares.toLocaleString()
                    : '—'
                }
              />
              <SizingMetricCard
                label="Intended risk %"
                value={
                  sizingOrderAnalytics.intendedRiskPct != null
                    ? `${sizingOrderAnalytics.intendedRiskPct.toFixed(2)}%`
                    : '—'
                }
              />
              <SizingMetricCard
                label="Investment"
                value={
                  sizingOrderAnalytics.investmentUsd != null
                    ? fmtUsd(sizingOrderAnalytics.investmentUsd)
                    : '—'
                }
              />
              <SizingMetricCard
                label="Investment weight"
                value={
                  sizingOrderAnalytics.investmentWeightPct != null
                    ? `${sizingOrderAnalytics.investmentWeightPct.toFixed(2)}% of NAV`
                    : '—'
                }
              />
              <SizingMetricCard
                label="Cash left (after notional)"
                warn={cashWarn}
                value={
                  sizingOrderAnalytics.cashLeftAfter != null
                    ? fmtUsd(sizingOrderAnalytics.cashLeftAfter)
                    : '—'
                }
              />
            </div>

            <h6 className={sizingDashSubtitleSmClass}>Constraint ladder (max shares @ stop)</h6>
            <WatchlistSizingCapTable
              capRows={sizingOrderAnalytics.capRows}
              cashCapShares={sizingOrderAnalytics.cashCapShares}
              availableMinShares={sizingOrderAnalytics.availableMinShares}
            />
            <p className={sizingDashFootnoteClass}>
              Buying power (aggregate): {fmtUsd(totalBuyingPower)}. History losses use GET /performance summary
              (same window as Kelly).
            </p>
          </section>

          <h5 className={`${sizingDashSubtitleSmClass} mt-3`}>Kelly &amp; ATR summary</h5>
          <div className={sizingDashCardsClass}>
            <SizingMetricCard label="ATR(14)" value={fmtUsd(sizeAtrResult.atr14)} />
            <SizingMetricCard
              label="Current price"
              value={sizeCurrentPrice != null ? fmtUsd(sizeCurrentPrice) : '—'}
            />
            <SizingMetricCard
              label="Raw Kelly %"
              value={kellyMetrics.is_valid ? `${(kellyMetrics.kelly_pct * 100).toFixed(2)}%` : '—'}
            />
            <SizingMetricCard
              label={`Eff. Kelly % (${kellyFraction.toFixed(2)}×)`}
              value={kellyMetrics.is_valid ? `${(kellyMetrics.effective_kelly * 100).toFixed(2)}%` : '—'}
            />
            <SizingMetricCard
              label={`Stop dist. (${sizeAtrMultiplier}× ATR)`}
              value={sizePosResult ? fmtUsd(sizePosResult.stop_distance) : '—'}
            />
            <SizingMetricCard
              label="Shares"
              value={sizePosResult?.is_valid ? sizePosResult.shares.toLocaleString() : '—'}
            />
            <SizingMetricCard
              label="Dollar risk"
              value={sizePosResult?.is_valid ? fmtUsd(sizePosResult.dollar_risk) : '—'}
            />
            <SizingMetricCard
              label="Risk %"
              value={sizePosResult?.is_valid ? `${sizePosResult.risk_pct.toFixed(2)}%` : '—'}
            />
            <SizingMetricCard
              label="Stop loss (long)"
              value={sizePosResult?.is_valid ? fmtUsd(sizePosResult.stop_loss_long) : '—'}
            />
            <SizingMetricCard
              label="Stop loss (short)"
              value={sizePosResult?.is_valid ? fmtUsd(sizePosResult.stop_loss_short) : '—'}
            />
          </div>

          {sizePosResult && !sizePosResult.is_valid ? (
            <p className={`${sizingDashHintClass} mt-2`}>
              Sizing unavailable: requires valid Kelly (win_rate &gt; 0 &amp; profit_factor &gt; 0), ATR &gt; 0,
              and capital &gt; 0.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
