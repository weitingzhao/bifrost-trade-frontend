/**
 * The Symbol faces' little cap-over-value tile — promoted when the fourth
 * face grew its own copy (§14.2).
 */
import { cn } from '@/lib/utils'

export function FaceKv({
  label,
  value,
  cls,
  title,
}: {
  label: string
  value: string
  cls?: string
  title?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5" title={title}>
      <span className="whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      <b className={cn('font-mono text-dense-body font-semibold tabular-nums', cls ?? 'text-foreground')}>
        {value}
      </b>
    </div>
  )
}
