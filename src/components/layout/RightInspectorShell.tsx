import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useWindowWidth } from '@/hooks/useIsNarrowViewport'
import { inspectorShell } from './rightInspectorUi'
import { inspectorDocksAt, INSPECTOR_WIDTH_READ_PX, INSPECTOR_WIDTH_WIDE_PX } from './inspectorDock'
import { registerInspectorEscape } from '@/lib/cockpit/inspectorEscape'
import { copilotDockPushes, useCopilotDock } from '@/hooks/useCopilotDock'
import { useInspectorWide } from '@/hooks/useInspectorWide'
import { useInspectorSlot } from './inspectorSlot'

interface Props {
  open: boolean
  ariaLabel?: string
  children: ReactNode
  /** Override the reading width — e.g. instance compare mode, the run inspector's S/M/L. */
  panelWidthPx?: number
  /** Bound to Escape while the panel is open, ahead of the Copilot's. */
  onClose?: () => void
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
  onClose,
}: Props) {
  const slot = useInspectorSlot()
  const viewport = useWindowWidth()
  const { wide } = useInspectorWide()
  const copilot = useCopilotDock()

  useEffect(() => {
    if (!open || !onClose) return
    return registerInspectorEscape(onClose)
  }, [open, onClose])

  if (!open) return null

  const width = panelWidthPx ?? (wide ? INSPECTOR_WIDTH_WIDE_PX : INSPECTOR_WIDTH_READ_PX)
  // While the Copilot is pushing the page, the inspector always floats — the
  // page never pays for two docked columns at once (Design 09-14 ③).
  const docked =
    slot != null && !copilotDockPushes(copilot, viewport) && inspectorDocksAt(width, viewport)

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
