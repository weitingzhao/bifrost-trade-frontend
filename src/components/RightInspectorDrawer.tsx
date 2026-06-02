import type { ReactNode } from 'react'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'

/** Fixed right-hand inspector; backdrop is pointer-events-none so page stays interactive. */
export function RightInspectorDrawer({
  open,
  ariaLabel = 'Inspector',
  children,
}: {
  open: boolean
  ariaLabel?: string
  children: ReactNode
}) {
  return (
    <RightInspectorShell open={open} ariaLabel={ariaLabel}>
      {children}
    </RightInspectorShell>
  )
}
