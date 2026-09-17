import { cn } from '@/lib/utils'
import { positionsUi } from './positionsUi'

/**
 * A section heading across the page: what the panels below it answer. With
 * `onToggle` the label folds the band away — Pressure points does.
 */
export function PositionsTier({
  label,
  note,
  open,
  onToggle,
}: {
  label: string
  note: string
  open?: boolean
  onToggle?: () => void
}) {
  return (
    <div className={positionsUi.tierRow}>
      {onToggle ? (
        <button type="button" className={positionsUi.tierToggle} onClick={onToggle} aria-expanded={open}>
          <span className="w-2.5 text-muted-foreground">{open ? '▾' : '▸'}</span>
          <span className={positionsUi.tierLabel}>{label}</span>
        </button>
      ) : (
        <span className={positionsUi.tierLabel}>{label}</span>
      )}
      <span className={positionsUi.tierRule} />
      <span className={cn(positionsUi.tierNote)}>{note}</span>
    </div>
  )
}
