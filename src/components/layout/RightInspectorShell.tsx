import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { inspectorShell } from './rightInspectorUi'

interface Props {
  open: boolean
  ariaLabel?: string
  children: ReactNode
}

/** Fixed right-hand inspector shell — unified width (72rem), opaque card surface. */
export function RightInspectorShell({ open, ariaLabel = 'Inspector', children }: Props) {
  if (!open) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex justify-end" role="presentation">
      <aside
        className={cn(
          'pointer-events-auto flex min-h-0 w-[min(72rem,96vw)] max-w-full flex-col',
          'border-l border-border bg-card shadow-[-4px_0_24px_rgba(0,0,0,0.15)]',
        )}
        role="dialog"
        aria-modal="false"
        aria-label={ariaLabel}
      >
        <div className={cn(inspectorShell.body, inspectorShell.panel)}>{children}</div>
      </aside>
    </div>
  )
}
