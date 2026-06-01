import type { WinRateStructureRow } from '@/types/strategy'
import { cn } from '@/lib/utils'
import styles from './winRate.module.css'
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
      <h3 className={styles.cardTitle}>{row.structure_name}</h3>
      <WinRateTradesBand row={row} />
      <WinRatePnlBand row={row} />
      <WinRateUnderlyingBand row={row} />
      <WinRateAveragesBand row={row} layout="wrap" />
    </>
  )

  if (!canDrill) {
    return <article className={styles.card}>{body}</article>
  }

  return (
    <button
      type="button"
      className={cn(styles.card, styles.cardClickable)}
      onClick={() => onOpenInstances(name)}
      title={`Open Instances filtered by structure: ${row.structure_name}`}
      aria-label={`Open Instances for structure ${row.structure_name}`}
    >
      {body}
    </button>
  )
}
