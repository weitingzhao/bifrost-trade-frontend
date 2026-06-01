import type { OpsHostEnvPill as OpsHostEnvPillType } from '@/utils/ingestOpsShared'
import { cn } from '@/lib/utils'

const VARIANT_CLASS: Record<OpsHostEnvPillType['pillVariant'], string> = {
  dev: 'border-sky-500/40 bg-sky-500/10 text-sky-400',
  prod: 'border-green-600/40 bg-green-600/10 text-green-400',
  other: 'border-border bg-muted/40 text-muted-foreground',
}

const DOT_CLASS: Record<OpsHostEnvPillType['pillVariant'], string> = {
  dev: 'bg-sky-400',
  prod: 'bg-green-500',
  other: 'bg-muted-foreground/50',
}

export function OpsHostEnvPill({
  pill,
  className,
  title,
}: {
  pill: OpsHostEnvPillType
  className?: string
  title?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        VARIANT_CLASS[pill.pillVariant],
        className,
      )}
      aria-label={pill.ariaLabel}
      title={title ?? pill.ariaLabel}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', DOT_CLASS[pill.pillVariant])} aria-hidden />
      {pill.shortLabel}
    </span>
  )
}
