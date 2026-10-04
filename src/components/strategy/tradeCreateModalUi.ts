import { cn } from '@/lib/utils'

/** Legacy `create-instance-modal` — 440px panel, label-left / control-right rows. */
export const tradeCreateDialogClass = 'max-w-[440px] gap-0 p-5 sm:max-w-[440px]'

export const tradeCreateTitleClass =
  'text-lg font-semibold tracking-tight text-foreground'

export const tradeCreateHeaderClass = 'border-b border-border pb-3'

export const tradeCreateErrorClass =
  'rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive'

export const tradeCreateSectionClass = 'flex flex-col gap-3'

export const tradeCreateOptionalSectionClass = cn(
  tradeCreateSectionClass,
  'border-t border-dashed border-border pt-3',
)

export const tradeCreateFormRowLabelClass =
  'min-w-[96px] shrink-0 text-sm font-medium text-foreground'

export const tradeCreateInputClass =
  'h-9 w-full min-w-0 border px-3 text-sm shadow-none mat-field'

/** Legacy date field — high-contrast calendar control on dark modal. */
export const tradeCreateDateInputClass = cn(
  tradeCreateInputClass,
  'bg-white text-black dark:bg-white dark:text-black [color-scheme:light]',
)

export const tradeCreateSelectTriggerClass = cn(
  tradeCreateInputClass,
  'flex items-center justify-between font-normal',
)

// Rev .154 (§17.10): a segmented track is an ink 7% fill, not a framed band;
// the border keeps its width, transparent, so nothing moves.
export const tradeCreateAccountPillsClass =
  'inline-flex w-full min-w-0 flex-1 items-center gap-0 rounded-full border border-transparent bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] p-0.5'

export const tradeCreateAccountPillClass = cn(
  'rounded-full border-0 bg-transparent px-3 py-1 font-mono text-sm font-medium',
  'text-muted-foreground transition-colors',
  'hover:bg-card/50 hover:text-foreground',
)

export const tradeCreateAccountPillActiveClass =
  'bg-card font-semibold text-primary shadow-sm hover:bg-card hover:text-primary'

export const tradeCreateActionsClass =
  'mt-4 flex justify-end gap-2 border-t border-border pt-3'
