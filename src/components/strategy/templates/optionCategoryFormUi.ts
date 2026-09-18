import { cn } from '@/lib/utils'

export const optionCategoryCompactInputClass = cn('h-7 text-xs')

export const optionCategoryCompactInputMonoClass = cn(
  'h-7 font-mono text-xs',
)

export const optionCategoryCompactSelectClass = cn(
  'h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none',
)

export const optionCategoryDimFilterSelectClass = cn(
  'h-6 flex-1 rounded border border-input bg-background px-1 text-dense-caption focus:outline-none',
)

export const optionCategoryFormGridClass = cn('grid grid-cols-2 gap-3 sm:grid-cols-4')

export const optionCategoryDimGridClass = cn('grid grid-cols-3 gap-2 sm:grid-cols-6')

export const optionCategoryDimLabelClass = cn(
  'mb-1 flex items-center gap-1 text-dense-caption text-muted-foreground',
)

export const optionCategoryDimSectionLabelClass = cn(
  'mb-2 text-xs font-medium text-muted-foreground',
)

export const optionCategoryFieldLabelClass = cn('mb-1 block text-xs')

/** Table inline selects — full column width, no ellipsis on longest labels. */
export const optionCategoryTableSelectClass = cn(
  optionCategoryCompactSelectClass,
  'w-full min-w-0 max-w-none',
)

export const optionCategoryInlineSelectRoleClass = optionCategoryTableSelectClass

export const optionCategoryInlineSelectDirClass = optionCategoryTableSelectClass

export const optionCategoryInlineSelectRightClass = optionCategoryTableSelectClass

export const optionCategoryInlineSelectKeyClass = optionCategoryTableSelectClass

export const optionCategoryInlineSelectKindClass = optionCategoryTableSelectClass

export const optionCategoryInlineSelectDefaultClass = optionCategoryTableSelectClass

/** Legs / meta nested tables — room for "Underlying (stock)", "Fixed (no input)", etc. */
export const optionCategoryLegsTableClass = 'min-w-[36rem]'

export const optionCategoryMetaTableClass = 'min-w-[40rem]'

export const optionCategoryTableCellSelectClass = '!max-w-none overflow-visible'

export const optionCategoryInlineInputLabelClass = cn(optionCategoryCompactInputClass, 'w-28')

export const optionCategoryInlineInputDefaultClass = cn(optionCategoryCompactInputClass, 'w-28')

export const optionCategoryInlineInputQtyClass = cn(optionCategoryCompactInputClass, 'ml-auto w-16')

export const optionCategoryTextareaClass = cn(
  'w-full resize-none rounded border border-input bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring',
)

export const optionCategoryMonoCodeClass = cn(
  'flex-1 truncate rounded bg-muted px-1 font-mono text-dense-caption',
)

export const optionCategoryDimsColumnTitleClass = cn(
  'mb-2 flex items-center gap-1 text-xs font-medium',
)

export const optionCategoryMetaFooterClass = cn('mt-3 flex items-center justify-between')
