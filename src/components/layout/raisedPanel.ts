/**
 * The design's raised panel (`.st-panel`, `.os-panel` and their kin in the
 * System prototypes): a hairline border, the raised ground and a one-pixel
 * inner highlight along the top. Pages that draw their blocks this way share
 * the class rather than spelling it out, so a change to the recipe lands once.
 */
export const RAISED_PANEL =
  'min-w-0 border mat-card'

/** A raised panel's header row: the cap, the title and an aside on one line. */
export const RAISED_PANEL_HEAD = 'flex flex-wrap items-baseline gap-2.5 border-b border-[var(--sk-line0)] px-3.5 py-2.5'
