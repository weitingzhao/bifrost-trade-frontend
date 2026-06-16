import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  DEFAULT_SEGMENT_SIZE,
  segmentButtonClass,
  segmentGroupClass,
  type SegmentControlSize,
} from './segmentClasses'

export interface SegmentOption {
  value: string
  label: ReactNode
  disabled?: boolean
}

export function SegmentControl({
  options,
  value,
  onChange,
  className,
  size = DEFAULT_SEGMENT_SIZE,
  ariaLabel,
  role = 'group',
}: {
  options: SegmentOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  size?: SegmentControlSize
  ariaLabel?: string
  role?: string
}) {
  return (
    <div
      className={cn(segmentGroupClass(size), className)}
      role={role}
      aria-label={ariaLabel}
    >
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          disabled={opt.disabled}
          onClick={() => onChange(opt.value)}
          className={segmentButtonClass(value === opt.value, size)}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function IncludeExcludeToggle({
  label,
  include,
  onChange,
  layout = 'inline',
  size = DEFAULT_SEGMENT_SIZE,
}: {
  label: string
  include: boolean
  onChange: (include: boolean) => void
  layout?: 'inline' | 'stacked'
  size?: SegmentControlSize
}) {
  const control = (
    <SegmentControl
      size={size}
      className={layout === 'stacked' ? 'w-full [&>button]:flex-1' : undefined}
      options={[
        { value: 'exclude', label: 'Exclude' },
        { value: 'include', label: 'Include' },
      ]}
      value={include ? 'include' : 'exclude'}
      onChange={v => onChange(v === 'include')}
    />
  )

  if (layout === 'stacked') {
    return (
      <div
        className={cn(
          'flex flex-col items-stretch w-full min-w-0',
          size === 'xs' ? 'gap-0.5' : 'gap-1',
        )}
      >
        <span
          className={cn(
            'font-semibold text-muted-foreground leading-snug',
            size === 'xs'
              ? 'text-dense-meta'
              : 'text-dense-meta',
          )}
        >
          {label}
        </span>
        {control}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground whitespace-nowrap">{label}</span>
      {control}
    </div>
  )
}