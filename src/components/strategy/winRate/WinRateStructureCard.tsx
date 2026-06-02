import type { WinRateStructureRow } from '@/types/strategy'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { winRateCardClickableClass, winRateCardTitleClass } from './winRateUi'
import { WinRateTradesBand } from './WinRateTradesBand'
import { WinRatePnlBand } from './WinRatePnlBand'
import { WinRateUnderlyingBand } from './WinRateUnderlyingBand'
import { WinRateAveragesBand } from './WinRateAveragesBand'

export interface WinRateStructureCardProps {
  row: WinRateStructureRow
  onOpenInstances?: (structureName: string) => void
}

export function WinRateStructureCard({ row, onOpenInstances }: WinRateStructureCardProps) {
  const name = (row.structure_name ?? '').trim()
  const canDrill = onOpenInstances != null && name !== ''

  const body = (
    <>
      <h3 className={winRateCardTitleClass}>{row.structure_name}</h3>
      <WinRateTradesBand row={row} />
      <WinRatePnlBand row={row} />
      <WinRateUnderlyingBand row={row} />
      <WinRateAveragesBand row={row} layout="wrap" />
    </>
  )

  if (!canDrill) {
    return (
      <Card variant="elevated" size="sm" className="gap-0 p-2.5">
        {body}
      </Card>
    )
  }

  return (
    <Card variant="elevated" size="sm" className="gap-0 p-0">
      <button
        type="button"
        className={cn(winRateCardClickableClass, 'rounded-lg border-0 bg-transparent p-2.5')}
        onClick={() => onOpenInstances(name)}
        title={`Open Instances filtered by structure: ${row.structure_name}`}
        aria-label={`Open Instances for structure ${row.structure_name}`}
      >
        {body}
      </button>
    </Card>
  )
}
