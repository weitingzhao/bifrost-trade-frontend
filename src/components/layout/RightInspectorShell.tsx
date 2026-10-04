import { usePanelWidth } from '@/layout/equipSurface'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useWindowWidth } from '@/hooks/useIsNarrowViewport'
import { inspectorShell } from './rightInspectorUi'
import { inspectorDocksAt, inspectorOverlayInsetRightPx, sidePanelPushes, INSPECTOR_WIDTH_READ_PX, INSPECTOR_WIDTH_WIDE_PX } from './inspectorDock'
import { registerInspectorEscape } from '@/lib/cockpit/inspectorEscape'
import { useSurfaces } from '@/layout/equipSurface'
import { useDockColumn } from '@/layout/symbolDock/dockState'
import { useInspectorWide } from '@/hooks/useInspectorWide'
import { useInspectorSlot } from './inspectorSlot'
import { useStuckMarks } from '@bifrost/ui'

interface Props {
  open: boolean
  ariaLabel?: string
  children: ReactNode
  /** Override the reading width — e.g. instance compare mode, the run inspector's S/M/L. */
  panelWidthPx?: number
  /** Bound to Escape while the panel is open, ahead of the float's. */
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
  const surfaces = useSurfaces()
  // The Symbol list's column is the outermost one; the inspector measures its
  // room without it and, floating, stands off it.
  const dock = useDockColumn()
  // The panel's column moves with its width (Rev .72 §6): re-read it.
  usePanelWidth()
  // The head and any sticky bar inside paint their band only while stuck (0.10.0).
  // A callback ref: docking and floating mount different elements.
  const [asideEl, setAsideEl] = useState<HTMLElement | null>(null)
  const asideRef = useMemo(() => ({ current: asideEl }), [asideEl])
  useStuckMarks(asideRef, open && asideEl != null)

  useEffect(() => {
    if (!open || !onClose) return
    return registerInspectorEscape(onClose)
  }, [open, onClose])

  if (!open) return null

  const width = panelWidthPx ?? (wide ? INSPECTOR_WIDTH_WIDE_PX : INSPECTOR_WIDTH_READ_PX)
  // While the side panel is pushing the page, the inspector always floats —
  // the page never pays for two docked columns at once (Design 09-14 ③).
  const panelOpen = surfaces.panel != null
  const room = viewport - dock.width
  const docked = slot != null && !sidePanelPushes(panelOpen, room) && inspectorDocksAt(width, room)

  const panel = (
    <aside
      ref={setAsideEl}
      className={cn(
        'flex min-h-0 max-w-full flex-col',
        docked
          ? 'h-svh shrink-0 border-l border-border bg-card'
          : // The floating inspector (Rev .142): off the edge by 8, radius 14,
            // the side glass (fill over rim, lens, drop, blur), sliding in over
            // 240ms. Solid / reduced transparency come from data-glass-surface.
            'sr-glass-side pointer-events-auto my-2 mr-2 h-[calc(100svh-16px)] overflow-hidden rounded-[14px] animate-in fade-in-0 slide-in-from-right-4 duration-[240ms] motion-reduce:animate-none',
      )}
      data-glass-surface={docked ? undefined : 'surface'}
      // Frost (Rev .151–.152, index.css): the inspector reads on its glass —
      // vibrancy ink, group fills for the opaque inks; docked, it is thick
      // glass detached 8px like the page (Owner #8). Off with ?frost=0 / solid.
      data-frost-host="inspector"
      data-inspector-dock={docked ? '' : undefined}
      style={{ width: docked ? `${width}px` : `min(${width}px, 96vw)` }}
      role="dialog"
      aria-modal="false"
      aria-label={ariaLabel}
    >
      <div className={cn(inspectorShell.body, inspectorShell.panel)}>{children}</div>
    </aside>
  )

  if (docked) return createPortal(panel, slot)

  const overlayRight = inspectorOverlayInsetRightPx(panelOpen, room) + dock.width
  return (
    <div
      className="pointer-events-none fixed inset-y-0 left-0 z-[200] flex justify-end"
      style={{ right: overlayRight }}
      role="presentation"
    >
      {panel}
    </div>
  )
}
