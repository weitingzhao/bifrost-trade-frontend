import { cn } from '@/lib/utils'
import type { CheckStatus } from '@/types/stockDataReadiness'

const STATUS_CLASS: Record<CheckStatus, string> = {
  ok: 'bg-lamp-green',
  warn: 'bg-lamp-yellow',
  error: 'bg-lamp-red',
  loading: 'bg-sky-400 animate-pulse',
  unknown: 'bg-lamp-gray',
  void: 'bg-lamp-gray opacity-60',
}

const STAGE_BORDER: Record<CheckStatus, string> = {
  ok: 'border-l-lamp-green',
  warn: 'border-l-lamp-yellow',
  error: 'border-l-lamp-red',
  loading: 'border-l-sky-400',
  unknown: 'border-l-border',
  void: 'border-l-muted-foreground',
}

export function CheckStatusDot({
  status,
  className,
}: {
  status: CheckStatus
  className?: string
}) {
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 rounded-full shrink-0', STATUS_CLASS[status], className)}
      aria-hidden
    />
  )
}

export function stageHeadBorderClass(status: CheckStatus): string {
  return cn('border-l-[3px]', STAGE_BORDER[status])
}
