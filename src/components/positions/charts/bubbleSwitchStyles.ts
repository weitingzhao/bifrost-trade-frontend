import { cn } from '@/lib/utils'

export type BubbleSwitchSize = 'sm' | 'md'

/** Default bubble control size for Positions / charts toolbars. */
export const POSITIONS_BUBBLE_SIZE: BubbleSwitchSize = 'sm'

const groupBySize: Record<BubbleSwitchSize, string> = {
  sm: 'gap-0.5 p-[3px]',
  md: 'gap-1 p-1',
}

const btnBySize: Record<BubbleSwitchSize, string> = {
  sm: 'px-3 py-1 text-[0.78rem]',
  md: 'px-3.5 py-1.5 text-sm',
}

/** Segmented pill group (legacy `.replay-bubble-switch`). */
export function bubbleGroupClass(size: BubbleSwitchSize = 'sm'): string {
  return cn(
    'inline-flex items-center rounded-full border border-border bg-secondary/80',
    groupBySize[size],
  )
}

export function bubbleButtonClass(active: boolean, size: BubbleSwitchSize = 'sm'): string {
  return cn(
    'rounded-full border-0 font-semibold leading-tight transition-colors cursor-pointer',
    'disabled:cursor-not-allowed disabled:opacity-70',
    btnBySize[size],
    active
      ? 'bg-card text-foreground shadow-sm'
      : 'bg-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground',
  )
}
