import { cn } from '@/lib/utils'
import { denseTable } from './denseTableClasses'

type SourceVariant = {
  label: string
  className: string
  title?: string
}

const SOURCE_VARIANTS: Record<string, SourceVariant> = {
  flex_trades: {
    label: 'flex',
    className:
      'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  flex: {
    label: 'flex',
    className:
      'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  tws_event: {
    label: 'tws',
    className: 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-400',
  },
  tws_client: {
    label: 'tws-client',
    className: 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-400',
  },
  journal_closed: {
    label: 'journal',
    className: 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400',
    title: 'Manual accounting adjustment (journal entry)',
  },
  manual: {
    label: 'manual',
    className: 'border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-400',
  },
}

const BADGE_BASE =
  'inline-flex items-center rounded border px-2 py-0.5 font-mono text-xs font-semibold leading-none whitespace-nowrap'

export function ExecSourceBadge({
  source,
  className,
}: {
  source?: string | null
  className?: string
}) {
  const s = (source ?? '').trim()
  if (!s) return <span className={denseTable.mutedMeta}>—</span>

  const norm = s.toLowerCase()
  const variant = SOURCE_VARIANTS[norm] ?? SOURCE_VARIANTS[s]
  const label = variant?.label ?? s
  const title = variant?.title ?? s

  return (
    <span
      className={cn(
        BADGE_BASE,
        variant?.className ??
          'border-border bg-muted/50 text-muted-foreground',
        className,
      )}
      title={title}
    >
      {label}
    </span>
  )
}
