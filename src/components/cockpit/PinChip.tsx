import { X } from 'lucide-react'
import { DenseTag } from '@/components/data-display'
import { cn } from '@/lib/utils'

export interface PinChipProps {
  label: string
  meta?: string
  onJump?: () => void
  onRemove?: () => void
  className?: string
}

export function PinChip({ label, meta, onJump, onRemove, className }: PinChipProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-md border border-border/60 bg-background/70 px-1.5 py-1',
        className,
      )}
    >
      <button
        type="button"
        onClick={onJump}
        disabled={!onJump}
        className={cn(
          'min-w-0 flex-1 text-left',
          onJump && 'hover:text-foreground cursor-pointer',
          !onJump && 'cursor-default',
        )}
      >
        <span className="block truncate font-mono text-dense-label font-semibold text-entity-symbol">
          {label}
        </span>
        {meta ? (
          <span className="block truncate text-dense-micro text-muted-foreground">{meta}</span>
        ) : null}
      </button>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-60 hover:opacity-100 hover:text-destructive"
          aria-label={`Unpin ${label}`}
          title="Unpin"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  )
}

export function PinSectionHeader({
  title,
  count,
}: {
  title: string
  count: number
}) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <DenseTag variant="neutral" size="cell">
        {count}
      </DenseTag>
    </div>
  )
}
