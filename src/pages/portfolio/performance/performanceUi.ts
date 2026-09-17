import { cn } from '@/lib/utils'

/**
 * Performance page surfaces, the same vocabulary Accounts, Transfer & Pay and the
 * Trade Ledger use: a section heading (tier), bordered panels with a header bar,
 * and uppercase captions.
 */
export const perfUi = {
  pageCard: 'flex flex-col gap-3.5 rounded-lg border border-border bg-card p-4',

  tierRow: 'flex flex-wrap items-center gap-x-2.5 gap-y-1',
  tierLabel: 'text-dense-caption font-bold uppercase tracking-[0.16em] text-foreground/85',
  tierRule: 'h-px min-w-8 flex-1 bg-border',
  tierNote: 'text-dense-meta text-muted-foreground',

  /** Prototype `.pf-panel`: the layer's raised surface, solid; the header one step up (raised2). */
  panel: 'min-w-0 self-start rounded-md border border-border bg-[var(--sk-raised)]',
  panelHead: cn(
    'flex flex-wrap items-center gap-2.5 rounded-t-md border-b border-border',
    'bg-[var(--sk-raised2)] px-3 py-2',
  ),
  panelToggle: cn(
    'flex w-full cursor-pointer flex-wrap items-center gap-2.5 border-0 bg-[var(--sk-raised2)] px-3 py-2',
    'text-left text-foreground hover:bg-secondary',
  ),
  panelTitle: 'text-dense-body font-semibold text-foreground',
  panelFoot: 'border-t border-border px-3 py-1.5 text-dense-meta text-muted-foreground text-pretty',

  cap: 'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground',
  note: 'text-dense-meta text-muted-foreground',
  /** Prototype ink steps on this page: soft for figures, mute for labels and prose. */
  soft: 'text-secondary-foreground',
  /** The prototype's lime and sky are literal, not the layer accent (Portfolio's accent is stone). */
  lime: 'text-[var(--chart-1)]',
  sky: 'text-[var(--color-entity-option)]',
  link: 'cursor-pointer border-0 bg-transparent p-0 text-dense-meta text-primary hover:underline',
  mono: 'font-mono tabular-nums',
} as const
