import { cn } from '@/lib/utils'

interface Props {
  label: string
  variant: 'tech' | 'fund'
}

export function SectionHeader({ label, variant }: Props) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 pb-0.5">
      <span
        className={cn(
          'text-dense-caption font-medium uppercase tracking-[0.06em]',
          variant === 'tech' ? 'text-screener-tech' : 'text-screener-fund',
        )}
      >
        {label}
      </span>
    </div>
  )
}
