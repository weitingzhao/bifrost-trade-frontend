import { cn } from '@/lib/utils'

/**
 * Performance page surfaces (design Rev .82): panels on the card material, a
 * head that is a rule rather than a band, and 11/600 sentence-case captions.
 * Section headings are the shared `SectionHead`.
 */
export const perfUi = {
  /**
   * Prototype `.pf-panel`: the layer's raised surface, solid; the header one step up (raised2).
   * No `self-start`: the prototype's page is a grid, where it aligns vertically; in this
   * page's flex column it would shrink the panel to its content's width.
   */
  panel: 'min-w-0 border mat-card',
  /** Prototype `.pf-panel-h`: no fill, the ink-6% rule under it. */
  panelHead: 'flex flex-wrap items-center gap-2.5 border-b px-3 py-2',
  panelToggle: cn(
    'flex w-full cursor-pointer flex-wrap items-center gap-2.5 border-0 bg-transparent px-3 py-2',
    'text-left text-foreground hover:bg-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)]',
  ),
  panelTitle: 'text-dense-body font-semibold text-foreground',
  panelFoot: 'border-t border-border px-3 py-1.5 text-dense-meta text-muted-foreground text-pretty',

  /** Prototype `.pf-cap`: 11/600, sentence case. */
  cap: 'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground',
  note: 'text-dense-meta text-muted-foreground',
  /** Prototype ink steps on this page: soft for figures, mute for labels and prose. */
  soft: 'text-secondary-foreground',
  /** The prototype's lime and sky are literal, not the layer accent (Portfolio's accent is stone). */
  lime: 'text-[var(--chart-1)]',
  sky: 'text-[var(--color-entity-option)]',
  link: 'cursor-pointer border-0 bg-transparent p-0 text-dense-meta text-primary hover:underline',
  mono: 'font-mono tabular-nums',
} as const
