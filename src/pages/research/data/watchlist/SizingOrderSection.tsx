import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { fmtUsd } from '@/utils/positions'
import {
  HELP_ORDER_SECTION,
  sizingOrderBidLabelClass,
  sizingOrderBidRowClass,
  sizingOrderBidSymClass,
  sizingOrderBidValueClass,
  sizingOrderCompactGridClass,
  sizingOrderFieldClass,
  sizingOrderFieldHintClass,
  sizingOrderFieldInputClass,
  sizingOrderFieldLabelClass,
  sizingOrderRiskHeadClass,
  sizingOrderSectionDangerClass,
  sizingOrderSectionTitleClass,
} from './sizingUi'

interface Props {
  symbol: string
  bid: number | null
  entry: string
  exit: string
  shares: string
  onEntryChange: (v: string) => void
  onExitChange: (v: string) => void
  onSharesChange: (v: string) => void
}

export function SizingOrderSection({
  symbol,
  bid,
  entry,
  exit,
  shares,
  onEntryChange,
  onExitChange,
  onSharesChange,
}: Props) {
  return (
    <section className={sizingOrderSectionDangerClass} aria-labelledby="watchlist-order-section-head">
      <div className={sizingOrderRiskHeadClass}>
        <h5 id="watchlist-order-section-head" className={sizingOrderSectionTitleClass}>
          Order section
        </h5>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-destructive/80" aria-label="Order section help">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">{HELP_ORDER_SECTION}</TooltipContent>
        </Tooltip>
      </div>

      <div className={sizingOrderBidRowClass}>
        <span className={sizingOrderBidLabelClass}>Current bid</span>
        <span className={sizingOrderBidValueClass}>{bid != null ? fmtUsd(bid) : '—'}</span>
        <span className="text-muted-foreground" aria-hidden>
          ,
        </span>
        <span className={sizingOrderBidSymClass}>{symbol}</span>
      </div>

      <div className={sizingOrderCompactGridClass}>
        <label className={sizingOrderFieldClass} htmlFor="watchlist-order-entry">
          <span className={sizingOrderFieldLabelClass}>Entry</span>
          <input
            id="watchlist-order-entry"
            type="number"
            min={0}
            step="0.01"
            value={entry}
            onChange={e => onEntryChange(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            className={sizingOrderFieldInputClass}
          />
        </label>
        <label className={sizingOrderFieldClass} htmlFor="watchlist-order-exit">
          <span className={sizingOrderFieldLabelClass}>Exit</span>
          <input
            id="watchlist-order-exit"
            type="number"
            min={0}
            step="0.01"
            value={exit}
            onChange={e => onExitChange(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            className={sizingOrderFieldInputClass}
          />
        </label>
        <label className={sizingOrderFieldClass} htmlFor="watchlist-order-shares">
          <span className={sizingOrderFieldLabelClass}>
            Amt
            <span className={sizingOrderFieldHintClass}>step 100</span>
          </span>
          <input
            id="watchlist-order-shares"
            type="number"
            min={0}
            step={100}
            value={shares}
            onChange={e => onSharesChange(e.target.value)}
            placeholder="100"
            inputMode="numeric"
            className={sizingOrderFieldInputClass}
          />
        </label>
      </div>
    </section>
  )
}
