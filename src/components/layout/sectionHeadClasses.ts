/**
 * The section-heading grammar (design §16.4, Rev .82): a sentence-case h2 at
 * 15/600 and a quiet rule after it. `SectionHead` draws it; Positions' tier
 * headings read the same classes.
 */
export const SECTION_HEAD_CLASSES = {
  row: 'flex items-baseline gap-2.5 pt-1.5',
  heading: 'm-0 type-section font-semibold tracking-[-0.005em] text-foreground',
  rule: 'h-px min-w-8 flex-1 bg-[var(--sk-line0)]',
} as const
