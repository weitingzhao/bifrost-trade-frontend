/**
 * Segment / bubble controls — active = lifted card chip (Legacy + shadcn segment).
 * Avoids full primary fill (glare) and avoids outline-only text accent (readability).
 */
export const POS_CTRL_ACTIVE =
  'bg-card text-primary font-semibold shadow-sm z-[1]'

export const POS_CTRL_IDLE =
  'bg-transparent text-muted-foreground font-medium hover:bg-muted/40 hover:text-foreground'
