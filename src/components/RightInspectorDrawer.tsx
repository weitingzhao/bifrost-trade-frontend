import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Fixed right-hand inspector; backdrop is pointer-events-none so page stays interactive. */
export function RightInspectorDrawer({
  open,
  ariaLabel = 'Inspector',
  children,
  variant = 'default',
}: {
  open: boolean
  ariaLabel?: string
  children: ReactNode
  variant?: 'default' | 'instance-detail'
}) {
  if (!open) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex justify-end" role="presentation">
      <aside
        className={cn(
          'pointer-events-auto flex min-h-0 flex-col border-l border-border bg-background shadow-[-4px_0_24px_rgba(0,0,0,0.15)]',
          variant === 'instance-detail'
            ? 'w-[min(var(--instance-detail-sidebar-width,960px),100vw)]'
            : 'w-[min(72rem,96vw)] max-w-full',
        )}
        role="dialog"
        aria-modal="false"
        aria-label={ariaLabel}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
      </aside>
    </div>
  )
}
