import type { ReactNode } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useInspectorWide } from '@/hooks/useInspectorWide'
import { inspectorShell } from './rightInspectorUi'

interface Props {
  title: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  onClose?: () => void
  closeLabel?: string
  className?: string
  /**
   * Hide the width toggle for a panel that sets its own width.
   * The run inspector has S/M/L and instance compare measures its own; a Wide
   * button there would be a second control for one thing.
   */
  hideWide?: boolean
}

export function RightInspectorHeader({
  title,
  meta,
  actions,
  onClose,
  closeLabel = 'Close inspector',
  className,
  hideWide,
}: Props) {
  const { wide, toggle } = useInspectorWide()
  return (
    <header className={cn(inspectorShell.header, className)}>
      <h3 className={inspectorShell.headerTitle}>
        {title}
        {meta != null && meta !== false ? (
          <span className={inspectorShell.headerMeta}>{meta}</span>
        ) : null}
      </h3>
      {(actions || onClose || !hideWide) && (
        <div className={inspectorShell.headerActions}>
          {actions}
          {hideWide ? null : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={inspectorShell.headerClose}
                  onClick={toggle}
                  aria-pressed={wide}
                  aria-label={wide ? 'Narrow the inspector' : 'Widen the inspector'}
                >
                  {wide ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {wide ? 'Back to reading width' : 'Widen — for a compare or a long read'}
              </TooltipContent>
            </Tooltip>
          )}
          {onClose ? (
            <button
              type="button"
              className={inspectorShell.headerClose}
              onClick={onClose}
              aria-label={closeLabel}
            >
              ✕
            </button>
          ) : null}
        </div>
      )}
    </header>
  )
}
