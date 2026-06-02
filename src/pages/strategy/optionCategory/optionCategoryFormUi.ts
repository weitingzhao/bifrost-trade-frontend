import { cn } from '@/lib/utils'

export const optionCategoryCompactInputClass = cn('h-7 text-xs')

export const optionCategoryCompactInputMonoClass = cn(
  'h-7 font-mono text-xs',
)

export const optionCategoryCompactSelectClass = cn(
  'h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none',
)

export const optionCategoryDimFilterSelectClass = cn(
  'h-6 flex-1 rounded border border-input bg-background px-1 text-[10px] focus:outline-none',
)

export const optionCategoryFormGridClass = cn('grid grid-cols-2 gap-3 sm:grid-cols-4')

export const optionCategoryDimGridClass = cn('grid grid-cols-3 gap-2 sm:grid-cols-6')

export const optionCategoryDimLabelClass = cn(
  'mb-1 flex items-center gap-1 text-[10px] text-muted-foreground',
)

export const optionCategoryDimSectionLabelClass = cn(
  'mb-2 text-xs font-medium text-muted-foreground',
)

export const optionCategoryFieldLabelClass = cn('mb-1 block text-xs')

export const optionCategoryInlineSelectRoleClass = cn(optionCategoryCompactSelectClass, 'w-28')

export const optionCategoryInlineSelectDirClass = cn(optionCategoryCompactSelectClass, 'w-24')

export const optionCategoryInlineSelectRightClass = cn(optionCategoryCompactSelectClass, 'w-20')

export const optionCategoryInlineSelectKeyClass = cn(optionCategoryCompactSelectClass, 'w-32')

export const optionCategoryInlineSelectKindClass = cn(optionCategoryCompactSelectClass, 'w-24')

export const optionCategoryInlineInputLabelClass = cn(optionCategoryCompactInputClass, 'w-28')

export const optionCategoryInlineInputDefaultClass = cn(optionCategoryCompactInputClass, 'w-28')

export const optionCategoryInlineInputQtyClass = cn(optionCategoryCompactInputClass, 'ml-auto w-16')

export const optionCategoryTextareaClass = cn(
  'w-full resize-none rounded border border-input bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring',
)

export const optionCategoryMonoCodeClass = cn(
  'flex-1 truncate rounded bg-muted px-1 font-mono text-[10px]',
)

export const optionCategoryDimsColumnTitleClass = cn(
  'mb-2 flex items-center gap-1 text-xs font-medium',
)

export const optionCategoryMetaFooterClass = cn('mt-3 flex items-center justify-between')
