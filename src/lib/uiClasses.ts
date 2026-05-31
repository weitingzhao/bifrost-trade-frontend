/**
 * Shared Tailwind classes for destructive UI actions (delete, remove, clear).
 * Red is always visible — not hover-only.
 */
export const dangerIconBtnClass =
  'text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors'

export const dangerGhostBtnClass =
  'text-destructive hover:text-destructive hover:bg-destructive/10'

export const dangerTextBtnClass =
  'text-destructive hover:text-destructive transition-colors'

/** Outline Button bulk delete (e.g. Celery Del Pending). */
export const dangerOutlineBtnClass =
  'text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive'
