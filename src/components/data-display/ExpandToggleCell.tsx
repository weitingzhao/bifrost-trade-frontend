import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ExpandToggleCell({
  expanded,
  onToggle,
  label = 'Expand row',
}: {
  expanded: boolean
  onToggle?: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
      aria-expanded={expanded}
      aria-label={label}
      onClick={e => {
        e.stopPropagation()
        onToggle?.()
      }}
    >
      <ChevronRight
        className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')}
        aria-hidden
      />
    </button>
  )
}
