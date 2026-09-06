import type { ReactNode } from 'react'

/**
 * The per-view actions (Ask Copilot, Save as hypothesis) that used to sit in
 * each lab's own page header. The hub owns the header now; the view keeps its
 * actions, right-aligned above its content.
 */
export function LabToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-1.5">{children}</div>
}
