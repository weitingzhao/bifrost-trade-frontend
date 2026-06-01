import { cn } from '@/lib/utils'
import { POS_CTRL_ACTIVE, POS_CTRL_IDLE } from '../positionsControlClasses'

interface Option {
  value: string
  label: string
}

const BUBBLE_SIZE = {
  xs: { group: 'text-[10px]', btn: 'px-2 py-0.5 min-h-[1.35rem]' },
  sm: { group: 'text-xs', btn: 'px-2.5 py-1 min-h-[1.55rem]' },
  /** Between sm and md — default for Positions page bubbles */
  chart: { group: 'text-xs', btn: 'px-3 py-1 min-h-[1.7rem]' },
  md: { group: 'text-sm', btn: 'px-4 py-1.5 min-h-[2.125rem]' },
} as const

/** Positions charts + filter bars (compact but readable). */
export const POSITIONS_BUBBLE_SIZE = 'chart' as const

export type PositionsBubbleSize = keyof typeof BUBBLE_SIZE

export function bubbleGroupClass(size: PositionsBubbleSize = POSITIONS_BUBBLE_SIZE): string {
  return cn(
    'inline-flex rounded-md border border-border bg-muted/30 p-px gap-px shrink-0',
    BUBBLE_SIZE[size].group,
  )
}

export function bubbleButtonClass(active: boolean, size: PositionsBubbleSize = POSITIONS_BUBBLE_SIZE): string {
  const s = BUBBLE_SIZE[size]
  return cn(
    'rounded-[4px] transition-all duration-150 leading-none whitespace-nowrap',
    s.btn,
    active ? POS_CTRL_ACTIVE : POS_CTRL_IDLE,
  )
}

interface Props {
  options: Option[]
  value: string
  onChange: (value: string) => void
  className?: string
  size?: keyof typeof BUBBLE_SIZE
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
