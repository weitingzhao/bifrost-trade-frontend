import {
  Clock,
  Loader2,
  Trash2,
  XCircle,
  RotateCcw,
  Scissors,
  Layers,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type CeleryQueueIconVariant =
  | 'refresh'
  | 'delete-pending'
  | 'delete-running'
  | 'delete-done'
  | 'delete-failed'
  | 'trim'
  | 'scale-add-all'
  | 'scale-reset'
  | 'scale-remove-all'
  | 'instance-recreate'
  | 'instance-remove'

const VARIANT_CLASS: Record<CeleryQueueIconVariant, string> = {
  refresh:
    'border border-border bg-background text-muted-foreground shadow-sm hover:text-primary hover:border-primary/40 hover:bg-primary/5',
  'delete-pending':
    'border border-warning/35 bg-warning-soft text-warning hover:bg-warning/20',
  'delete-running':
    'border border-success/25 bg-success-soft text-success hover:bg-success/20',
  'delete-done':
    'border border-success/35 bg-success-soft text-success hover:bg-success/20',
  'delete-failed':
    'border border-danger/35 bg-danger-soft text-danger hover:bg-danger/20',
  trim:
    'border border-primary/45 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/55',
  'scale-add-all':
    'border border-success/38 bg-success-soft text-success hover:bg-success/20',
  'scale-reset':
    'border border-warning/40 bg-warning-soft text-warning hover:bg-warning/20',
  'scale-remove-all':
    'border border-danger/40 bg-danger-soft text-danger hover:bg-danger/20',
  'instance-recreate':
    'border border-warning/40 bg-warning-soft text-warning hover:bg-warning/20',
  'instance-remove':
    'border border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20',
}

const VARIANT_ICON: Record<CeleryQueueIconVariant, LucideIcon> = {
  refresh: RotateCcw,
  'delete-pending': Clock,
  'delete-running': Loader2,
  'delete-done': Trash2,
  'delete-failed': XCircle,
  trim: Scissors,
  'scale-add-all': Layers,
  'scale-reset': RotateCcw,
  'scale-remove-all': Trash2,
  'instance-recreate': RefreshCw,
  'instance-remove': Trash2,
}

export interface CeleryQueueIconButtonProps {
  variant: CeleryQueueIconVariant
  title: string
  'aria-label': string
  disabled?: boolean
  refreshing?: boolean
  onClick?: () => void
  className?: string
}

export function CeleryQueueIconButton({
  variant,
  title,
  'aria-label': ariaLabel,
  disabled = false,
  refreshing = false,
  onClick,
  className,
}: CeleryQueueIconButtonProps) {
  const Icon = VARIANT_ICON[variant]
  const spin = refreshing || (variant === 'refresh' && refreshing)

  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-0 transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASS[variant],
        className,
      )}
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className={cn('h-3.5 w-3.5', spin && 'animate-spin')} />
    </button>
  )
}
