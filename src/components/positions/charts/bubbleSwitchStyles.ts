import { cn } from '@/lib/utils'

export type BubbleSwitchSize = 'sm' | 'md'

/** Default bubble control size for Positions / charts toolbars. */
export const POSITIONS_BUBBLE_SIZE: BubbleSwitchSize = 'sm'

function resolvedSize(size?: BubbleSwitchSize): BubbleSwitchSize {
  return size ?? POSITIONS_BUBBLE_SIZE
}

/** Segmented control container (Legacy bubble group). */
export function bubbleGroupClass(size?: BubbleSwitchSize): string {
  const s = resolvedSize(size)
  return cn(
    'inline-flex shrink-0 items-stretch rounded-md border border-border bg-muted/30 p-0.5',
    s === 'md' ? 'gap-1 p-1' : 'gap-0.5',
  )
}

/** Single segment button; pass `active` when selected. */
export function bubbleButtonClass(active: boolean, size?: BubbleSwitchSize): string {
  const s = resolvedSize(size)
  return cn(
    'inline-flex items-center justify-center font-semibold uppercase tracking-wide transition-colors',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    s === 'sm' ? 'rounded px-2 py-0.5 text-[10px]' : 'rounded-md px-2.5 py-1 text-xs',
    active
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
  )
}
