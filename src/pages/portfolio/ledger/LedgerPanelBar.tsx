import type { ReactNode } from 'react'

/** The bar that opens a block inside a view panel: a title, what it holds, and a hint on the right. */
export function LedgerPanelBar({
  title,
  subject,
  hint,
}: {
  title: ReactNode
  subject?: ReactNode
  hint?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border bg-secondary/40 px-3 py-2 first:border-t-0">
      <span className="text-dense-body font-semibold text-foreground">{title}</span>
      {subject ? <span className="font-mono text-dense-meta text-muted-foreground">{subject}</span> : null}
      {hint ? <span className="ml-auto text-dense-meta text-muted-foreground">{hint}</span> : null}
    </div>
  )
}
