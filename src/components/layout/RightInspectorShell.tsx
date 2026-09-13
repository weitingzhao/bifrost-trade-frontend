import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useWindowWidth } from '@/hooks/useIsNarrowViewport'
import { inspectorShell } from './rightInspectorUi'
import { INSPECTOR_WIDTH_DEFAULT_PX, inspectorDocksAt } from './inspectorDock'
import { useInspectorSlot } from './inspectorSlot'

interface Props {
  open: boolean
  ariaLabel?: string
  children: ReactNode
  /** Override the reading width — e.g. instance compare mode, the run inspector's S/M/L. */
  panelWidthPx?: number
}

/**
 * The right-hand inspector: a docked column where the page can spare the
 * width, a floating panel where it cannot.
 *
 * One shell, two placements — never two components. Which one you get is
 * `inspectorDocksAt`, and the only thing that changes is whether the page
 * moves over or is covered; the panel's own contents do not know the
 * difference.
 */
export function RightInspectorShell({
  open,
  ariaLabel = 'Inspector',
  children,
  panelWidthPx,
}: Props) {
  const slot = useInspectorSlot()
  const viewport = useWindowWidth()

  if (!open) return null

  const width = panelWidthPx ?? INSPECTOR_WIDTH_DEFAULT_PX
  const docked = slot != null && inspectorDocksAt(width, viewport)

  const panel = (
    <aside
      className={cn(
        'flex min-h-0 max-w-full flex-col border-l border-border bg-card',
        docked
          ? 'h-svh shrink-0'
          : 'pointer-events-auto h-svh shadow-[-4px_0_24px_rgba(0,0,0,0.15)]',
      )}
      style={{ width: docked ? `${width}px` : `min(${width}px, 96vw)` }}
      role="dialog"
      aria-modal="false"
      aria-label={ariaLabel}
    >
      <div className={cn(inspectorShell.body, inspectorShell.panel)}>{children}</div>
    </aside>
  )

  if (docked) return createPortal(panel, slot)

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex justify-end" role="presentation">
      {panel}
    </div>
  )
}
