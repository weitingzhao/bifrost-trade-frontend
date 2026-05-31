import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: string
}

interface Props {
  options: Option[]
  value: string
  onChange: (value: string) => void
  className?: string
  size?: 'sm' | 'xs'
}

export function BubbleSwitch({ options, value, onChange, className, size = 'sm' }: Props) {
  return (
    <div
      className={cn('flex rounded-md border overflow-hidden', size === 'xs' ? 'text-[10px]' : 'text-xs', className)}
      role="group"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-2.5 py-1 transition-colors font-medium',
            size === 'xs' && 'px-2 py-0.5',
            value === opt.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
          )}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

interface TogglePairProps {
  label: string
  include: boolean
  onChange: (include: boolean) => void
}

export function IncludeExcludeToggle({ label, include, onChange }: TogglePairProps) {
  return (
    <div className="flex items-center justify-between gap-2 text-[10px]">
      <span className="text-muted-foreground whitespace-nowrap">{label}</span>
      <BubbleSwitch
        size="xs"
        options={[
          { value: 'exclude', label: 'Exclude' },
          { value: 'include', label: 'Include' },
        ]}
        value={include ? 'include' : 'exclude'}
        onChange={(v) => onChange(v === 'include')}
      />
    </div>
  )
}
