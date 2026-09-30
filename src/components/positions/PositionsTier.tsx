import type { ReactNode } from 'react'
import { SectionBand } from '@bifrost/ui'

/**
 * A band across Positions: what the panels below it answer (design Rev .117,
 * §17.8). It is the DS `SectionBand` — the whole row folds its section, open
 * by default and remembered per page; the note is the heading's title.
 *
 * Pressure points passes `open` / `onOpenChange` because a reading elsewhere
 * on the page opens it to show what it points at; its folded summary is the
 * legs, their premium range and the close the cushions are priced against.
 */
export function PositionsTier({
  label,
  note,
  summary,
  summaryWhenFolded = false,
  open,
  onOpenChange,
}: {
  label: string
  note: string
  summary?: ReactNode
  summaryWhenFolded?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <SectionBand
      id={label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
      title={label}
      note={note}
      summary={summary}
      summaryWhenFolded={summaryWhenFolded}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}
