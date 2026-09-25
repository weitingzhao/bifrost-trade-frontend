/**
 * "Look at it yourself" — the row that carries one symbol out of a memo and
 * into the Workbench, seat and all.
 */
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { workbenchStops } from '@/lib/research/handoff'

export function SymbolHandoff({
  symbol,
  date,
  className,
}: {
  symbol: string
  date?: string | null
  className?: string
}) {
  const stops = workbenchStops(symbol, date)
  if (stops.length === 0) return null
  return (
    <div className={className}>
      <span className="text-dense-micro uppercase tracking-wide text-muted-foreground">
        See {symbol.toUpperCase()} yourself
      </span>
      <div className="mt-1 flex flex-wrap gap-1">
        {stops.map((stop) => (
          <Link
            key={stop.id}
            to={stop.to}
            title={stop.why}
            className="inline-flex items-center gap-1 border px-2 py-0.5 text-dense-caption transition-colors hover:bg-primary/10 mat-tag"
          >
            <ExternalLink className="size-3 text-muted-foreground" aria-hidden />
            {stop.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
