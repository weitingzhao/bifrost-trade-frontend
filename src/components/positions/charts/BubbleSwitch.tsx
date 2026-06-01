import { cn } from '@/lib/utils'
import {
  POSITIONS_BUBBLE_SIZE,
  bubbleButtonClass,
  bubbleGroupClass,
  type BubbleSwitchSize,
} from './bubbleSwitchStyles'

interface Option {
  value: string
  label: string
}

interface Props {
  options: Option[]
  value: string
  onChange: (value: string) => void
  className?: string
  size?: BubbleSwitchSize
}

export function BubbleSwitch({ options, value, onChange, className, size = 'sm' }: Props) {
  return (
    <div className={cn(bubbleGroupClass(size), className)} role="group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={bubbleButtonClass(value === opt.value, size)}
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
  layout?: 'inline' | 'stacked'
}

export function IncludeExcludeToggle({ label, include, onChange, layout = 'inline' }: TogglePairProps) {
  if (layout === 'stacked') {
    return (
      <div className="flex flex-col items-stretch gap-1 w-full min-w-0">
        <span className="text-[11px] font-semibold text-muted-foreground leading-snug">{label}</span>
        <BubbleSwitch
          size={POSITIONS_BUBBLE_SIZE}
          className="w-full [&>button]:flex-1"
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

  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground whitespace-nowrap">{label}</span>
      <BubbleSwitch
        size={POSITIONS_BUBBLE_SIZE}
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
