import { cn } from '@/lib/utils'
import {
  ledgerBookingKind,
  ledgerBookingKindForFill,
  ledgerBookingLabel,
  type LedgerBookingKind,
} from './ledgerBookingMark'
import type { Execution } from '@/types/positions'

const TONE: Record<LedgerBookingKind, string> = {
  exchange: 'text-muted-foreground border-border',
  book: 'text-[var(--color-warning)] border-[var(--color-warning)]/40',
  book_expired: 'text-[var(--color-warning)] border-[var(--color-warning)]/40',
  book_assigned: 'text-[var(--color-warning)] border-[var(--color-warning)]/40',
  mixed: 'text-sky-400 border-sky-400/40',
  unreported: 'text-muted-foreground/80 border-border',
}

export function LedgerBookingTag({
  kind,
  className,
}: {
  kind: LedgerBookingKind
  className?: string
}) {
  const label = ledgerBookingLabel(kind)
  if (!label) return null
  return (
    <span
      className={cn(
        // Wraps inside a narrow column: `not reported by this source` is the
        // ruling's wording (F-L3) and a clipped tag would hide half of it.
        'inline-flex max-w-full items-center rounded-sm border px-1 py-px',
        'whitespace-normal text-left font-mono text-dense-meta leading-tight',
        TONE[kind],
        className,
      )}
    >
      {label}
    </span>
  )
}

export function LedgerBookingTagForFills({
  fills,
  stockFills = [],
}: {
  fills: Execution[]
  stockFills?: Execution[]
}) {
  return <LedgerBookingTag kind={ledgerBookingKind(fills, stockFills)} />
}

export function LedgerBookingTagForFill({
  ex,
  stockFills = [],
}: {
  ex: Execution
  stockFills?: Execution[]
}) {
  return <LedgerBookingTag kind={ledgerBookingKindForFill(ex, stockFills)} />
}
