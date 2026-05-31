import { cn } from '@/lib/utils'

export type AvailabilityFilter = 'all' | 'active' | 'inactive'

const FILTER_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Available' },
  { value: 'inactive', label: 'Unavailable' },
]

interface AvailabilityFilterPillsProps {
  value: AvailabilityFilter
  onChange: (value: AvailabilityFilter) => void
  className?: string
}

/** Segmented All / Available / Unavailable control (legacy structure-active-filter-pills). */
export function AvailabilityFilterPills({ value, onChange, className }: AvailabilityFilterPillsProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border-strong bg-border p-0.5',
        className,
      )}
      role="group"
      aria-label="Filter by availability"
    >
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-full px-3 py-1 text-sm font-medium transition-colors',
            value === opt.value
              ? 'bg-secondary text-primary shadow-sm'
              : 'text-muted-foreground hover:bg-card hover:text-foreground',
          )}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
