import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'
import type { DaemonLamp } from '@/utils/daemonLamps'

export const daemonSectionTitleClass = denseTable.sectionTitle

export const daemonElevatedCardClass = cn('gap-3 p-4')

export const daemonPageIntroClass = cn('text-xs text-muted-foreground max-w-2xl')

export const daemonThreeColGridClass = cn('grid grid-cols-1 gap-3 lg:grid-cols-3')

export const daemonGroupTitleClass = cn(
  'text-xs font-medium uppercase tracking-wide text-muted-foreground',
)

export const daemonKvRowClass = cn('flex items-center justify-between gap-2 text-sm')

export const daemonKvLabelClass = cn('shrink-0 text-muted-foreground')

export const daemonKvValueClass = cn('text-right font-mono text-xs tabular-nums')

export const daemonIbServiceListClass = cn(
  'divide-y divide-border overflow-hidden rounded border',
)

export const daemonIbServiceRowClass = cn('flex items-center justify-between px-3 py-1 text-xs')

export const daemonIbServiceRowInnerClass = cn('flex items-center gap-1.5')

export function daemonLampTextClass(lamp: DaemonLamp): string {
  return cn(
    'font-mono text-xs tabular-nums',
    lamp === 'green' && 'text-success',
    (lamp === 'red' || lamp === 'none') && 'text-red-500',
    lamp === 'yellow' && 'text-yellow-500',
  )
}

export const daemonBlockReasonClass = cn('text-destructive')

export const daemonControlBarClass = cn('flex flex-wrap items-center gap-2 pt-2')

export const daemonResumeButtonClass = cn(
  'h-8 border-success/50 text-xs text-success',
)

export const daemonEmptyHintClass = denseTable.emptyHint

export const daemonOpsTableClass = 'min-w-[36rem]'

export const DAEMON_OPS_COL_WIDTHS = {
  time: '22%',
  type: '14%',
  side: '10%',
  qty: '12%',
  price: '14%',
  reason: '28%',
} as const

export const daemonOpsTimeCellClass = cn('font-mono text-xs')

export const daemonOpsSideCellClass = cn('whitespace-nowrap')

export const daemonCardTitleRowClass = cn('flex flex-wrap items-center gap-2 text-base')

export const daemonCardStatusSubtitleClass = cn('text-sm font-normal text-muted-foreground')

export const daemonMetricGridClass = cn('grid grid-cols-2 gap-x-3 gap-y-1 text-xs')

export const daemonMetricLabelClass = cn('text-muted-foreground')

export const daemonMetricValueClass = cn('truncate text-right font-mono')

export const daemonConnectionsBlockClass = cn('space-y-1')

export const daemonIbGroupSummaryClass = cn('mb-2 flex items-center gap-1.5')

export const daemonIbGroupSummaryTextClass = cn('line-clamp-2 text-xs text-muted-foreground')

export const daemonSocketLinkClass = cn(
  'text-xs text-link underline underline-offset-2 hover:text-link-hover',
)

export const daemonHedgeStatusRowClass = cn('flex flex-wrap items-center gap-2 text-xs')

export const daemonSyncDetailsGridClass = cn('grid grid-cols-2 gap-x-4 gap-y-1 text-xs')

export const daemonSyncLagWarnClass = cn('font-mono text-destructive')

export const daemonManualHintClass = cn('text-xs text-muted-foreground')

export const daemonProcessSectionClass = cn('space-y-3')

export const daemonOpsToolbarClass = cn(
  'flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4',
)

export const daemonDialogErrorClass = cn(
  'rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',
)
