import { cn } from '@/lib/utils'

/**
 * Open while any contract under the instance still has a net position; Closed otherwise.
 * A tag takes the lamp green, never the P&L green: those only go on signed numbers (§14.7).
 */
export function LedgerInstanceStateTag({ open }: { open: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-4 items-center whitespace-nowrap rounded-sm border px-1.25',
        'font-mono text-dense-micro font-bold tracking-[0.04em]',
        open
          ? 'border-lamp-green/45 text-lamp-green'
          : 'border-border text-muted-foreground',
      )}
    >
      {open ? 'Open' : 'Closed'}
    </span>
  )
}
