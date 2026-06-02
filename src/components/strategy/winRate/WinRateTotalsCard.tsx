import type { WinRateStructureRow } from '@/types/strategy'
import { Card } from '@/components/ui/card'
import {
  winRateCardTitleClass,
  winRateTotalsBandClass,
  winRateTotalsPanelClass,
  winRateTotalsRowClass,
} from './winRateUi'
import { WinRateTradesBand } from './WinRateTradesBand'
import { WinRatePnlBand } from './WinRatePnlBand'
import { WinRateUnderlyingBand } from './WinRateUnderlyingBand'
import { WinRateAveragesBand } from './WinRateAveragesBand'

export function WinRateTotalsCard({ totals }: { totals: WinRateStructureRow }) {
  return (
    <Card variant="elevated" size="sm" className="gap-0 p-2.5">
      <h3 className={winRateCardTitleClass}>All structures</h3>
      <div className={winRateTotalsPanelClass}>
        <div className={winRateTotalsRowClass}>
          <div className={winRateTotalsBandClass}>
            <WinRateTradesBand row={totals} inTotals />
          </div>
          <div className={winRateTotalsBandClass}>
            <WinRatePnlBand row={totals} inTotals />
          </div>
          <div className={winRateTotalsBandClass}>
            <WinRateUnderlyingBand row={totals} inTotals />
          </div>
          <div className={winRateTotalsBandClass}>
            <WinRateAveragesBand row={totals} layout="totals" />
          </div>
        </div>
      </div>
    </Card>
  )
}
