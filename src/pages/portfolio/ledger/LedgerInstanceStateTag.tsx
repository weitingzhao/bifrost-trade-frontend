import { cn } from '@/lib/utils'

/** Open while any contract under the instance still has a net position; Closed otherwise. */
export function LedgerInstanceStateTag({ open }: { open: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-4 items-center whitespace-nowrap rounded-sm border px-1.25',
        'font-mono text-dense-micro font-bold tracking-[0.04em]',
        open
          ? 'border-[var(--color-profit)]/45 text-[var(--color-profit)]'
          : 'border-border text-muted-foreground',
      )}
    >
      {open ? 'Open' : 'Closed'}
    </span>
  )
}
