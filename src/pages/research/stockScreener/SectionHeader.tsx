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
          'text-[0.72rem] font-extrabold uppercase tracking-widest pb-2 -mb-px border-b-2',
          variant === 'tech'
            ? 'text-violet-400 border-violet-400'
            : 'text-emerald-400 border-emerald-400',
        )}
      >
        {label}
      </span>
    </div>
  )
}
