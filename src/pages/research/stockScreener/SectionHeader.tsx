import { cn } from '@/lib/utils'

interface Props {
  label: string
  variant: 'tech' | 'fund'
}

export function SectionHeader({ label, variant }: Props) {
  return (
    <div className="flex items-center gap-3 pb-0.5 border-b border-border">
      <span
        className={cn(
          'text-dense-label font-extrabold uppercase tracking-widest pb-2 -mb-px border-b-2',
          variant === 'tech'
            ? 'text-screener-tech border-screener-tech'
            : 'text-screener-fund border-screener-fund',
        )}
      >
        {label}
      </span>
    </div>
  )
}
