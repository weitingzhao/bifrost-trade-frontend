import { cn } from '@/lib/utils'
import type { EffectiveServiceStatus } from '../checklist/types'
import { checklistEffectiveStatusLabel } from '../checklist/stockStatus'

const DOT_CLASS: Record<EffectiveServiceStatus, string> = {
  implemented: 'bg-emerald-500',
  partial: 'bg-amber-500',
  'not-on-tier': 'bg-sky-500',
  'not-implemented': 'bg-red-500',
}

export function CapabilityStatusDot({ status }: { status: EffectiveServiceStatus }) {
  const label = checklistEffectiveStatusLabel(status)
  return (
    <span
      className={cn('inline-block size-2 shrink-0 rounded-full', DOT_CLASS[status])}
      title={label}
      aria-label={`Status: ${label}`}
      role="img"
    />
  )
}
