import { cn } from '@/lib/utils'
import type { CheckStatus } from '@/types/stockDataReadiness'

const STAGE_BORDER: Record<CheckStatus, string> = {
  ok: 'border-l-lamp-green',
  warn: 'border-l-lamp-yellow',
  error: 'border-l-lamp-red',
  loading: 'border-l-sky-400',
  unknown: 'border-l-border',
  void: 'border-l-muted-foreground',
}

export function stageHeadBorderClass(status: CheckStatus): string {
  return cn('border-l-[3px]', STAGE_BORDER[status])
}
