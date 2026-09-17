import { cn } from '@/lib/utils'

/**
 * Positions and Backing & Model surfaces — the prototypes' `ps-*` / `bk2-*`
 * vocabulary, in the tokens Performance, Accounts and the Trade Ledger already
 * speak: a section heading (tier), solid raised panels with a raised2 header
 * bar, uppercase captions, and the prototype's 1.5 line height.
 */
export const positionsUi = {
  pageCard: 'flex flex-col gap-3 rounded-lg border border-border bg-card p-4',

  tierRow: 'flex flex-wrap items-center gap-x-2.5 gap-y-1',
  tierLabel: 'text-dense-caption font-bold uppercase tracking-[0.16em] text-foreground/85',
  tierToggle: cn(
    'flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-foreground',
    'focus-visible:outline-1 focus-visible:outline-ring',
  ),
  tierRule: 'h-px min-w-8 flex-1 bg-[var(--sk-line2)]',
  tierNote: 'text-dense-meta text-muted-foreground',

  /** Two panels side by side from 920px of content, one column below — the prototype's auto-fit 460. */
  bandGrid: 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,28.75rem),1fr))] items-start gap-3',

  panel: 'min-w-0 rounded-md border border-border bg-[var(--sk-raised)]',
  panelHead: cn(
    'flex flex-wrap items-center gap-2.5 rounded-t-md border-b border-border',
    'bg-[var(--sk-raised2)] px-3 py-1.75 text-dense-body leading-normal',
  ),
  panelTitle: 'text-dense-body font-semibold leading-normal text-foreground',
  panelNote: 'text-dense-meta leading-normal text-muted-foreground',

  cap: 'whitespace-nowrap text-dense-caption font-semibold uppercase leading-normal tracking-[0.1em] text-muted-foreground',
  mono: 'font-mono tabular-nums',
  link: 'cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 text-dense-meta leading-normal text-primary hover:underline',
  btn: cn(
    'inline-flex h-5.5 cursor-pointer items-center gap-1.25 whitespace-nowrap rounded-[5px] border border-border',
    'bg-transparent px-1.75 text-dense-meta text-secondary-foreground hover:bg-[var(--sk-surface)] hover:text-foreground',
  ),
  /** The `?` that opens how a figure is built. */
  q: cn(
    'inline-flex h-4 w-4 flex-none cursor-pointer items-center justify-center rounded-full border border-[var(--sk-line2)]',
    'bg-transparent p-0 text-dense-caption leading-none text-muted-foreground hover:border-primary hover:text-primary',
  ),
  input: cn(
    'h-5.5 min-w-0 rounded-[5px] border border-border bg-[var(--sk-raised)] px-1.75',
    'font-mono text-xs text-foreground outline-none focus-visible:border-ring',
  ),

  th: 'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption font-semibold leading-normal text-secondary-foreground',
  td: 'whitespace-nowrap border-b border-border/55 px-2 py-1.25 text-right font-mono text-xs leading-normal tabular-nums',
} as const
