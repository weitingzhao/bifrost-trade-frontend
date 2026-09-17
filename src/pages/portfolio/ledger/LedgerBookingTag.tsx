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
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-1 py-px',
        'font-mono text-dense-meta leading-none',
        TONE[kind],
        className,
      )}
    >
      {ledgerBookingLabel(kind)}
    </span>
  )
}

export function LedgerBookingTagForFills({ fills }: { fills: Execution[] }) {
  return <LedgerBookingTag kind={ledgerBookingKind(fills)} />
}

export function LedgerBookingTagForFill({ ex }: { ex: Execution }) {
  return <LedgerBookingTag kind={ledgerBookingKindForFill(ex)} />
}
