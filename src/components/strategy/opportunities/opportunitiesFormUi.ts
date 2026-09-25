import { cn } from '@/lib/utils'

/** Opportunity create/edit panel — elevated card below opportunity table (Legacy visual parity) */
export const opportunitiesFormPanelClass = cn(
  'mt-3 overflow-hidden border mat-card',
  '',
)

export const opportunitiesFormHeaderClass = cn(
  'flex items-center justify-between gap-3 border-b border-border bg-secondary px-5 py-3',
)

export const opportunitiesFormTitleClass = cn(
  'm-0 text-base font-bold tracking-tight text-foreground',
)

export const opportunitiesFormCloseClass = cn(
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent',
  'text-lg leading-none text-muted-foreground transition-colors',
  'hover:bg-destructive/15 hover:text-destructive',
)

export const opportunitiesFormBodyClass = cn(
  'flex flex-col gap-3 px-4 py-3',
)

export const opportunitiesFormFooterClass = cn(
  'flex items-center justify-end gap-3 border-t border-border bg-secondary px-5 py-3',
)

export const opportunitiesFieldLabelClass = cn(
  'text-dense-caption font-semibold uppercase tracking-wider text-muted-foreground',
)

export const opportunitiesFormFieldClass = cn('flex flex-col gap-2')

export const opportunitiesFormHintClass = cn('m-0 text-xs text-muted-foreground')

export const opportunitiesFormErrorClass = cn(
  'flex items-center gap-2 rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2',
  'text-xs font-medium text-destructive',
)

export const opportunitiesIdentityRowClass = cn(
  'flex flex-wrap items-end gap-3',
)

export const opportunitiesNameFieldClass = cn('min-w-[16rem] flex-1')

export const opportunitiesAvailableFieldClass = cn('shrink-0 pb-0.5')

export const opportunitiesAvailableLabelClass = cn(
  'flex cursor-pointer items-center gap-2 text-xs text-muted-foreground',
)

export const opportunitiesNameInputClass = cn(
  'h-10 bg-background text-sm shadow-none focus-visible:ring-primary/30',
)

/** Structure picker — Legacy opp-structure-cards grid */
export const opportunitiesStructureGridClass = cn(
  'grid max-h-64 min-w-0 grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2 overflow-y-auto',
)

export const opportunitiesStructureCardClass = cn(
  'relative flex min-h-16 cursor-pointer flex-col border px-3 py-2.5 text-left mat-card',
  'transition-[border-color,box-shadow,background-color,color] duration-150',
  'hover:bg-[var(--mat-card-fill-hover)] hover:shadow-md',
)

export const opportunitiesStructureCardSelectedClass = cn(
  'border-primary bg-primary/10 text-primary shadow-[0_0_0_2px_hsl(var(--primary))]',
  'hover:border-primary hover:bg-primary/10',
)

export const opportunitiesStructureCardTitleClass = cn('text-sm font-semibold leading-snug')

export const opportunitiesStructureCardMetaClass = cn(
  'mt-0.5 text-xs leading-snug text-muted-foreground',
)

export const opportunitiesStructureCardMetaSelectedClass = cn('text-primary/90')

export const opportunitiesGatePillsClass = cn('flex flex-wrap gap-2')

export const opportunitiesGatePillClass = cn(
  'inline-flex cursor-pointer items-center gap-1 border px-3 py-1.5 text-xs text-muted-foreground mat-tag',
  'transition-colors select-none hover:text-foreground',
)

export const opportunitiesGatePillSelectedClass = cn(
  'border-primary bg-primary/10 font-semibold text-primary hover:border-primary hover:bg-primary/10 hover:text-primary',
)

export const opportunitiesGatePillVersionClass = cn('text-dense-caption opacity-70')

/** Scope + conditions — Legacy two-column bordered cols */
export const opportunitiesFormColumnsClass = cn(
  'grid grid-cols-1 gap-3 lg:grid-cols-2',
)

export const opportunitiesFormColClass = cn(
  'overflow-hidden border mat-card',
)

export const opportunitiesColHeaderClass = cn(
  'border-b border-border bg-secondary px-3 py-2',
)

export const opportunitiesColTitleClass = cn(
  'm-0 text-dense-caption font-bold uppercase tracking-wider text-muted-foreground',
)

export const opportunitiesColBodyClass = cn('flex flex-col gap-3 p-3')

export const opportunitiesAddBtnClass = cn(
  'inline-flex h-8 items-center gap-1 self-start rounded-md border border-dashed border-border px-3 text-xs text-muted-foreground',
  'transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary',
)

export const opportunitiesSymbolTagsClass = cn('flex flex-wrap gap-2')

export const opportunitiesSymbolTagClass = cn(
  'inline-flex overflow-hidden border transition-[border-color,box-shadow] mat-tag',
  'focus-within:ring-2 focus-within:ring-primary/20',
)

export const opportunitiesSymbolTagInputClass = cn(
  'h-7 w-[5.5rem] border-0 bg-transparent px-2 font-mono text-xs font-semibold uppercase shadow-none focus-visible:ring-0',
)

export const opportunitiesSymbolTagRemoveClass = cn(
  'flex h-7 w-[22px] items-center justify-center border-l border-border bg-transparent text-muted-foreground',
  'hover:bg-destructive/15 hover:text-destructive',
)

export const opportunitiesWatchlistActionsClass = cn(
  'mb-1 flex flex-wrap items-center gap-2',
)

export const opportunitiesWatchlistGridClass = cn(
  'm-0 max-h-56 list-none overflow-y-auto border p-2 mat-card',
  'columns-2 gap-x-4 sm:columns-3 lg:columns-4',
  '[&_li]:mb-1 [&_li]:break-inside-avoid',
)

export const opportunitiesWatchlistCheckClass = cn(
  'inline-flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 font-mono text-xs transition-colors',
  'hover:bg-muted',
  'has-[:checked]:bg-primary/15 has-[:checked]:text-primary',
)

export const opportunitiesWatchlistCheckboxClass = cn(
  'size-4 cursor-pointer accent-primary',
)

export const opportunitiesConditionsListClass = cn('flex flex-col gap-2')

export const opportunitiesConditionRowClass = cn(
  'flex items-center gap-2 border p-2 mat-card',
  '',
)

export const opportunitiesConditionSelectClass = cn(
  'h-8 min-w-[7rem] shrink-0 border px-2 text-xs mat-field',
)

export const opportunitiesConditionInputClass = cn(
  'h-8 min-w-0 flex-1 border px-2 text-xs mat-field',
)

export const opportunitiesConditionInputNumClass = cn(
  'h-8 w-20 shrink-0 font-mono tabular-nums',
)

export const opportunitiesConditionRemoveClass = cn(
  'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded text-muted-foreground',
  'hover:bg-destructive/15 hover:text-destructive',
)
