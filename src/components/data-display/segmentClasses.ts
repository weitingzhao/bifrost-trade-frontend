import { cn } from '@/lib/utils'

export type SegmentControlSize = 'sm' | 'md'

/** Default segment control size for toolbars and filters. */
export const DEFAULT_SEGMENT_SIZE: SegmentControlSize = 'sm'

/** Active segment chip — lifted card (readable on secondary track). */
export const SEGMENT_CTRL_ACTIVE =
  'bg-card text-foreground font-semibold shadow-sm z-[1]'

/** Idle segment chip. */
export const SEGMENT_CTRL_IDLE =
  'bg-transparent text-muted-foreground font-medium hover:bg-muted/40 hover:text-foreground'

const groupBySize: Record<SegmentControlSize, string> = {
  sm: 'gap-0.5 p-[3px]',
  md: 'gap-1 p-1',
}

const btnBySize: Record<SegmentControlSize, string> = {
  sm: 'px-3 py-1 text-[0.78rem]',
  md: 'px-3.5 py-1.5 text-sm',
}

export function segmentGroupClass(size: SegmentControlSize = 'sm'): string {
  return cn(
    'inline-flex items-center rounded-full border border-border bg-secondary/80',
    groupBySize[size],
  )
}

export function segmentButtonClass(active: boolean, size: SegmentControlSize = 'sm'): string {
  return cn(
    'rounded-full border-0 font-semibold leading-tight transition-colors cursor-pointer',
    'disabled:cursor-not-allowed disabled:opacity-70',
    btnBySize[size],
    active ? SEGMENT_CTRL_ACTIVE : SEGMENT_CTRL_IDLE,
  )
}

/** @deprecated Use segmentGroupClass */
export const bubbleGroupClass = segmentGroupClass

/** @deprecated Use segmentButtonClass */
export const bubbleButtonClass = segmentButtonClass
