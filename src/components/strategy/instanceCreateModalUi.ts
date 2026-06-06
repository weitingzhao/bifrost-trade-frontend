import { cn } from '@/lib/utils'

/** Legacy `create-instance-modal` — 440px panel, label-left / control-right rows. */
export const instanceCreateDialogClass = 'max-w-[440px] gap-0 p-5 sm:max-w-[440px]'

export const instanceCreateTitleClass =
  'text-lg font-semibold tracking-tight text-foreground'

export const instanceCreateHeaderClass = 'border-b border-border pb-3'

export const instanceCreateErrorClass =
  'rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive'

export const instanceCreateSectionClass = 'flex flex-col gap-3'

export const instanceCreateOptionalSectionClass = cn(
  instanceCreateSectionClass,
  'border-t border-dashed border-border pt-3',
)

export const instanceCreateFormRowLabelClass =
  'min-w-[96px] shrink-0 text-sm font-medium text-foreground'

export const instanceCreateInputClass =
  'h-9 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm shadow-none'

/** Legacy date field — high-contrast calendar control on dark modal. */
export const instanceCreateDateInputClass = cn(
  instanceCreateInputClass,
  'bg-white text-black dark:bg-white dark:text-black [color-scheme:light]',
)

export const instanceCreateSelectTriggerClass = cn(
  instanceCreateInputClass,
  'flex items-center justify-between font-normal',
)

export const instanceCreateAccountPillsClass =
  'inline-flex w-full min-w-0 flex-1 items-center gap-0 rounded-full border border-border bg-secondary/60 p-0.5'

export const instanceCreateAccountPillClass = cn(
  'rounded-full border-0 bg-transparent px-3 py-1 font-mono text-sm font-medium',
  'text-muted-foreground transition-colors',
  'hover:bg-card/50 hover:text-foreground',
)

export const instanceCreateAccountPillActiveClass =
  'bg-card font-semibold text-primary shadow-sm hover:bg-card hover:text-primary'

export const instanceCreateActionsClass =
  'mt-4 flex justify-end gap-2 border-t border-border pt-3'
