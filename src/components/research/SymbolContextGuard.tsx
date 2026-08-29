import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@bifrost/ui'
import { Crosshair, ListFilter, Star } from 'lucide-react'

export type SymbolContextGuardProps = {
  /** Current dive symbol. Empty / whitespace → show pick CTA. */
  symbol: string | null | undefined
  children: ReactNode
  /** Optional title override for empty state. */
  title?: string
  /** Optional description override. */
  description?: string
}

/**
 * Wave Z — Analyze entry contract.
 * Single-symbol dive pages must not render fallback cross-symbol lists
 * when no symbol is selected. Show CTAs into Discover / Watchlist instead.
 */
export function SymbolContextGuard({
  symbol,
  children,
  title = 'Pick a symbol to dive in',
  description = 'Analyze focuses on one symbol. Choose from Scan, Watchlist, or Candidate Pool — then come back here.',
}: SymbolContextGuardProps) {
  const trimmed = (symbol ?? '').trim()
  if (trimmed) {
    return <>{children}</>
  }

  return (
    <EmptyState
      icon={<Crosshair />}
      title={title}
      description={description}
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/research/scan"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-dense-meta font-medium text-foreground hover:bg-accent"
          >
            <ListFilter className="size-3.5" aria-hidden />
            Open Scan
          </Link>
          <Link
            to="/research/watchlist"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-dense-meta font-medium text-foreground hover:bg-accent"
          >
            <Star className="size-3.5" aria-hidden />
            Watchlist
          </Link>
          <Link
            to="/research/loop/candidates"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-dense-meta font-medium text-foreground hover:bg-accent"
          >
            Candidate Pool
          </Link>
        </div>
      }
    />
  )
}
