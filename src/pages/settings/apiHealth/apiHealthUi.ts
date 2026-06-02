import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'
import type { Lamp } from './apiHealthConfig'

export function worstLamp(lamps: Lamp[]): Lamp {
  if (lamps.includes('red')) return 'red'
  if (lamps.includes('yellow')) return 'yellow'
  return 'green'
}

/** Small glow for tab lamps and compact indicators. */
export const LAMP_GLOW: Record<Lamp, string> = {
  green: 'shadow-[0_0_5px_1px_var(--color-lamp-green)]',
  yellow: 'shadow-[0_0_5px_1px_var(--color-lamp-yellow)]',
  red: 'shadow-[0_0_5px_1px_var(--color-lamp-red)]',
}

export const apiHealthSectionTitleClass = denseTable.sectionTitle

export const apiHealthCategoryContentClass = cn('space-y-6')

export const apiHealthElevatedSectionClass = cn('gap-3 p-4')

export const apiHealthDocsSectionClass = cn('space-y-3')

export const apiHealthDetailsSectionClass = cn('space-y-3')

export function apiHealthServiceGridClass(serviceCount: number): string {
  if (serviceCount === 1) return 'grid-cols-1 max-w-xs'
  if (serviceCount === 2) return 'grid-cols-1 sm:grid-cols-2'
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
}

export const apiHealthServiceGridWrapClass = cn('grid gap-4')

export const API_DOCS_COL_WIDTHS = {
  api: '14%',
  baseUrl: '32%',
  swagger: '14%',
  redoc: '14%',
  openapi: '18%',
} as const

export const apiHealthDocsTableClass = 'min-w-[40rem]'

export const apiHealthDocLinkClass = cn(
  'inline-flex items-center gap-1 text-xs text-primary hover:underline',
)

export const apiHealthServiceCardContentClass = cn('space-y-3 px-4 pb-4 pt-4')

export const apiHealthServiceCardHeaderClass = cn(
  'flex min-w-0 items-center justify-between gap-2',
)

export const apiHealthServiceCardTitleRowClass = cn('flex min-w-0 items-center gap-2')

export const apiHealthServiceCardNameClass = cn('text-sm font-semibold')

export function apiHealthServiceStatusClass(lamp: Lamp): string {
  return cn(
    'shrink-0 font-mono text-xs tabular-nums',
    lamp === 'green' && 'text-green-600 dark:text-green-400',
    lamp === 'red' && 'text-red-500',
    lamp === 'yellow' && 'text-yellow-500',
  )
}

export const apiHealthServiceKvGridClass = cn(
  'grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 text-xs',
)

export const apiHealthServiceKvLabelClass = cn('text-muted-foreground')

export const apiHealthServiceKvValueClass = cn('font-mono tabular-nums')

export const apiHealthTabLampClass = cn('h-2 w-2')

export const apiHealthOverviewCardClass = cn('space-y-4 p-4')

export const apiHealthLastRefreshClass = cn('text-xs text-muted-foreground')

export const apiHealthShutdownMsgClass = cn(
  'rounded-md border px-3 py-2 text-xs',
  'border-destructive/30 bg-destructive/10 text-destructive',
)

export const apiHealthShutdownMsgOkClass = cn(
  'rounded-md border px-3 py-2 text-xs',
  'border-border bg-muted/40 text-muted-foreground',
)
