import { cn } from '@/lib/utils'

export const daemonFormGridClass = cn('grid gap-4 sm:grid-cols-2')

export const daemonFormPanelClass = cn('space-y-3')

export const daemonFormHintClass = cn('text-xs text-muted-foreground')

export const daemonFormFieldRowClass = cn('flex items-center gap-2')

export function daemonFormSaveStatusClass(isErr: boolean): string {
  return cn('text-sm', isErr ? 'text-destructive' : 'text-success')
}
