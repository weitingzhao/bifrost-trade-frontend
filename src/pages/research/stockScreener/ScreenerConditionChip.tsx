import { cn } from '@/lib/utils'
import {
  screenerChipActiveCheckClass,
  screenerChipActiveClass,
  screenerChipCheckClass,
  screenerChipClass,
} from './stockScreenerUi'

type Props = {
  active: boolean
  label: string
  hueClass?: string
  title?: string
  onToggle: () => void
}

export function ScreenerConditionChip({
  active,
  label,
  hueClass,
  title,
  onToggle,
}: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={title ?? (active ? `Remove ${label}` : `Add ${label}`)}
      className={cn(screenerChipClass, hueClass, active && screenerChipActiveClass)}
    >
      <span
        className={cn(screenerChipCheckClass, active && screenerChipActiveCheckClass)}
        aria-hidden
      >
        {active ? '✓' : ''}
      </span>
      <span>{label}</span>
    </button>
  )
}
