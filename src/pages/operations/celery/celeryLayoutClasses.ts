/** Shared 7:5 split used for Queue Summary / Situation and Queues tab worker sidebar. */
export const CELERY_SPLIT_GRID =
  'grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-4 items-start'

/** Legacy-style underline main tabs (shadcn TabsTrigger). */
export const CELERY_MAIN_TAB_TRIGGER =
  'rounded-none border-b-2 border-transparent px-3 pb-2 pt-1 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none'

export const CELERY_MAIN_TABS_LIST =
  'h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0'

/** Queue Summary row highlighted by worker queue filter. */
export const CELERY_QUEUE_ROW_FILTERED =
  'border-l-2 border-l-primary bg-primary/5'

/** Page-level flash message enter animation. */
export const CELERY_FLASH_ENTER =
  'animate-in fade-in slide-in-from-top-1 duration-300'
