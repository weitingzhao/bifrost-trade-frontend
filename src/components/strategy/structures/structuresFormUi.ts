import { cn } from '@/lib/utils'

export const structuresFormPanelClass = cn(
  'space-y-3 rounded-lg border border-border bg-secondary/20 p-3',
)

export const structuresFormSubheadingClass = cn('text-sm font-medium')

export const structuresFormHintClass = cn(
  'text-xs text-muted-foreground',
)

export function structuresWizardStepClass(active: boolean, done: boolean): string {
  return cn(
    'rounded-full border px-3 py-1 text-xs transition-colors',
    active && 'border-primary bg-primary text-primary-foreground',
    !active && done && 'border-border text-foreground',
    !active && !done && 'border-border text-muted-foreground',
  )
}

export function structuresTemplateOptionClass(selected: boolean): string {
  return cn(
    'w-full rounded-lg border p-3 text-left transition-colors',
    selected
      ? 'border-primary bg-accent-soft'
      : 'border-border hover:border-primary/40',
  )
}
