/** Live page layout + filter class tokens (Tailwind). */

export const livePageStackClass = 'flex flex-col gap-3 min-w-0'

export const liveStreamsBlockClass = 'flex flex-col gap-3 min-w-0'

export const liveCardClass = 'rounded-lg border border-border bg-card min-w-0'
export const liveCardHeaderRowClass =
  'flex flex-wrap items-start justify-between gap-3 border-b border-border px-3 py-2'
export const liveCardTitleRowClass = 'flex items-center gap-2 min-w-0'
export const liveCardTitleClass = 'text-base font-semibold tracking-tight'
export const liveHeaderActionsClass = 'flex flex-wrap items-center gap-2 shrink-0'

export const liveSummaryBarClass =
  'flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-[0.78rem]'
export const liveSummaryLabelClass =
  'text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground mr-1'
export const liveSummarySegClass = 'inline-flex items-baseline gap-1.5'
export const liveSummaryKeyClass =
  'text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground'
export const liveSummaryValClass = 'font-mono font-bold tabular-nums text-[0.85rem]'
export const liveSummaryDividerClass = 'text-border-strong select-none'

export const liveFiltersInlineClass = 'flex flex-wrap items-center gap-3 min-w-0'
export const liveFilterGroupClass = 'flex flex-wrap items-center gap-2 min-w-0'
export const liveFilterHintClass = 'text-xs font-medium text-muted-foreground shrink-0'
export const liveFilterPillsClass = 'flex flex-wrap items-center gap-1'
export const liveFilterPillGripClass = 'cursor-grab text-[10px] leading-none opacity-50'

export const liveFeedbackHintClass = 'text-xs text-muted-foreground animate-pulse'

export const liveIconBtnClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground'

export const liveEmptyHintClass = 'text-sm text-muted-foreground py-2'

/** Bottom split: one card wraps Watching Stocks / Options / Open Orders (matches Legacy live-open-watchlist-split). */
export const liveSplitOuterCardClass = liveCardClass
export const liveSplitBodyClass = 'px-3 pb-3 pt-3'
export const liveSplitGridClass =
  'grid gap-3 items-start min-w-0 lg:grid-cols-2'
export const liveSplitWatchingColClass = 'min-w-0'
export const liveSplitRightColClass = 'min-w-0 flex flex-col gap-3'

export const livePaneClass = 'min-w-0'
export const livePaneHeaderRowClass = 'flex flex-wrap items-start justify-between gap-2 mb-2'
export const livePaneTitleRowClass = 'flex items-center gap-2 min-w-0'
export const livePaneTitleClass = 'text-sm font-semibold tracking-tight'
export const livePaneHeaderActionsClass = 'flex items-center gap-2 shrink-0'
export const liveFreshnessBadgeClass =
  'inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground'
export const liveSourceHintClass = 'text-[11px] text-muted-foreground mb-2'

export const liveOpenOrdersWrapClass = 'space-y-3'
export const liveOpenOrdersSectionClass = 'min-w-0'
export const liveOpenOrdersSubtitleClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1'
