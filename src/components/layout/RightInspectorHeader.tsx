import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { inspectorShell } from './rightInspectorUi'

interface Props {
  title: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  onClose?: () => void
  closeLabel?: string
  className?: string
}

export function RightInspectorHeader({
  title,
  meta,
  actions,
  onClose,
  closeLabel = 'Close inspector',
  className,
}: Props) {
  return (
    <header className={cn(inspectorShell.header, className)}>
      <h3 className={inspectorShell.headerTitle}>
        {title}
        {meta != null && meta !== false ? (
          <span className={inspectorShell.headerMeta}>{meta}</span>
        ) : null}
      </h3>
      {(actions || onClose) && (
        <div className={inspectorShell.headerActions}>
          {actions}
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
