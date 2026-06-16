import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'

export const OPTION_CATEGORY_INFO =
  'Structure templates: six dimensions, default legs, meta parameters, and characteristics. Used when creating option structures.'

export const optionCategoryPageHeaderClass = cn('shrink-0 border-b px-6 py-4')

export const optionCategoryLayoutClass = cn('flex flex-1 overflow-hidden')

export const optionCategorySidebarClass = cn(
  'flex w-64 shrink-0 flex-col overflow-hidden border-r',
)

export const optionCategorySidebarSearchClass = cn('space-y-2 border-b p-3')

export const optionCategorySidebarCountClass = cn('text-xs text-muted-foreground')

export const optionCategorySidebarListClass = cn('flex-1 overflow-y-auto py-1')

export const optionCategorySidebarRowClass = cn('group flex items-center gap-1 px-2 py-0.5')

export const optionCategorySidebarDragClass = cn(
  'shrink-0 cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-70',
)

export const optionCategorySidebarItemBtnClass = cn(
  'min-w-0 flex-1 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60',
)

export function optionCategorySidebarItemSelectedClass(selected: boolean): string {
  return cn(selected && 'bg-muted font-medium')
}

export const optionCategoryDetailMainClass = cn('flex-1 overflow-y-auto')

export const optionCategoryDetailEmptyClass = cn(
  'flex h-full flex-col items-center justify-center gap-3 p-8 text-muted-foreground',
)

export const optionCategoryDetailLoadingClass = cn('space-y-3 p-4')

export const optionCategoryDetailContentClass = cn('space-y-3 p-3')

export const optionCategorySectionHeaderClass = cn(
  'flex items-center justify-between border-b px-4 py-3',
)

export const optionCategorySectionTitleClass = cn('text-sm font-semibold')

export const optionCategorySectionActionsClass = cn('flex items-center gap-2')

export const optionCategorySectionBodyClass = cn('p-4')

export const optionCategorySectionBodyCompactClass = cn('px-4 py-3')

export const optionCategoryEmptyHintClass = denseTable.emptyHint

export const optionCategorySaveOkClass = cn('text-xs font-medium text-green-600')

export const optionCategorySaveErrClass = cn('text-xs font-medium text-red-500')

export function optionCategorySaveFeedbackClass(ok: boolean): string {
  return ok ? optionCategorySaveOkClass : optionCategorySaveErrClass
}

export const optionCategoryReorderHintClass = cn('ml-2')

export const optionCategoryDimsDialogGridClass = cn('grid grid-cols-3 gap-3 sm:grid-cols-6')

export const optionCategoryDimsDialogAddRowClass = cn(
  'mt-2 flex items-center gap-2 border-t pt-4',
)
