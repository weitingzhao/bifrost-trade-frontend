import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface QuickActionButtonProps {
  icon: LucideIcon
  label: string
  hint?: string
  disabled?: boolean
  onClick: () => void
  className?: string
}

export function QuickActionButton({
  icon: Icon,
  label,
  hint,
  disabled,
  onClick,
  className,
}: QuickActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-2.5 rounded-md border border-border/50 bg-background/60 px-2.5 py-2 text-left transition-colors',
        'hover:border-border hover:bg-secondary/60',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block text-dense-label font-medium text-foreground">{label}</span>
        {hint ? (
          <span className="block text-dense-micro text-muted-foreground leading-snug">{hint}</span>
        ) : null}
      </span>
    </button>
  )
}
