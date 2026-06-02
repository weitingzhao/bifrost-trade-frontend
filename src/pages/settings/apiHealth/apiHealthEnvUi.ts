import { cn } from '@/lib/utils'
import type { EnvLamp } from '@/utils/apiHealthEnv'

export const apiHealthOverviewSectionClass = cn('space-y-4')

export const apiHealthConfiguredStripClass = cn('flex flex-col gap-3')

export const apiHealthConfiguredCategoryClass = cn('flex flex-wrap items-start gap-2')

export const apiHealthConfiguredCatLabelClass = cn(
  'w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-1',
)

export const apiHealthConfiguredChipsClass = cn('flex flex-wrap gap-2')

export const apiHealthConfiguredChipClass = cn(
  'inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs',
)

export const apiHealthConfiguredServiceNameClass = cn('font-medium')

export const apiHealthEnvGridClass = cn(
  'grid gap-4 md:grid-cols-2',
)

export const apiHealthEnvColumnClass = cn(
  'rounded-md border border-border bg-background/50 p-3 space-y-3',
)

export const apiHealthEnvColumnHeadClass = cn('space-y-0.5')

export const apiHealthEnvTitleClass = cn('text-sm font-semibold')

export const apiHealthEnvOriginClass = cn('text-xs text-muted-foreground font-mono break-all')

export const apiHealthEnvHintClass = cn('text-xs text-muted-foreground')

export const apiHealthEnvGroupClass = cn('space-y-2')

export const apiHealthEnvGroupTitleClass = cn(
  'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
)

export const apiHealthDiagramClass = cn('space-y-0')

export const apiHealthDiagramStepClass = cn('flex items-start gap-2 min-w-0')

export const apiHealthDiagramLineClass = cn(
  'w-px h-3 bg-border shrink-0 ml-[5px]',
)

export function apiHealthDiagramNodeClass(lamp: EnvLamp): string {
  return cn(
    'h-2.5 w-2.5 shrink-0 rounded-full mt-1',
    lamp === 'green' && 'bg-green-500 shadow-[0_0_5px_1px_var(--color-lamp-green)]',
    lamp === 'red' && 'bg-red-500 shadow-[0_0_5px_1px_var(--color-lamp-red)]',
    lamp === 'none' && 'bg-muted-foreground/30',
  )
}

export const apiHealthDiagramLabelClass = cn('text-xs font-medium shrink-0 w-24')

export const apiHealthDiagramDetailClass = cn(
  'text-[10px] text-muted-foreground font-mono break-all min-w-0 flex-1',
)

export const apiHealthEmptyHintClass = cn('text-xs text-muted-foreground')
