import { cn } from '@/lib/utils'
import { positionsUi } from './positionsUi'

/**
 * A section heading across the page: what the panels below it answer. With
 * `onToggle` the label folds the band away — Pressure points does.
 *
 * `heading` is the §16 form (design Rev 2026-09-23.21), so far only on
 * Positions: a sentence-case h2 at 15px, its note moved into the title rather
 * than printed beside it. Pages not yet walked against §16 keep the small
 * uppercase label.
 */
export function PositionsTier({
  label,
  note,
  open,
  onToggle,
  heading = false,
}: {
  label: string
  note: string
  open?: boolean
  onToggle?: () => void
  heading?: boolean
}) {
  if (heading) {
    return (
      <div className={positionsUi.tierHeadingRow}>
        {onToggle ? (
          <button type="button" className={positionsUi.tierToggle} onClick={onToggle} aria-expanded={open} title={note}>
            <span className="w-2.5 self-center text-dense-meta text-muted-foreground">{open ? '▾' : '▸'}</span>
            <h2 className={positionsUi.tierHeading}>{label}</h2>
          </button>
        ) : (
          <h2 className={positionsUi.tierHeading} title={note}>
            {label}
          </h2>
        )}
        <span className={positionsUi.tierHeadingRule} />
      </div>
    )
  }
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
