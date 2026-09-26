import { cn } from '@/lib/utils'
import { SECTION_HEAD_CLASSES } from '@/components/layout/sectionHeadClasses'

/**
 * Positions and Backing & Model surfaces — the prototypes' `ps-*` / `bk2-*`
 * vocabulary, in the tokens Performance, Accounts and the Trade Ledger already
 * speak: a section heading (tier), solid raised panels with a raised2 header
 * bar, uppercase captions, and the prototype's 1.5 line height.
 */
export const positionsUi = {
  pageCard: 'flex flex-col gap-3 border p-4 mat-card',

  tierRow: 'flex flex-wrap items-center gap-x-2.5 gap-y-1',
  tierLabel: 'text-dense-caption font-bold uppercase tracking-[0.16em] text-foreground/85',
  tierToggle: cn(
    'flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-foreground',
    'focus-visible:outline-1 focus-visible:outline-ring',
  ),
  tierRule: 'h-px min-w-8 flex-1 bg-[var(--sk-line2)]',
  tierNote: 'text-dense-meta text-muted-foreground',
  /** §16 section heading (Rev 2026-09-23.21): a sentence-case h2, its note in the title, a quiet rule after. */
  tierHeadingRow: SECTION_HEAD_CLASSES.row,
  tierHeading: SECTION_HEAD_CLASSES.heading,
  tierHeadingRule: SECTION_HEAD_CLASSES.rule,

  /** Two panels side by side from 920px of content, one column below — the prototype's auto-fit 460. */
  bandGrid: 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,28.75rem),1fr))] items-start gap-3',
  /**
   * §16.5 band (Rev 2026-09-23.21, Positions first): panels in one row share its
   * height, and a panel that wraps takes the whole row rather than leaving a hole
   * — which an auto-fit grid cannot promise once three panels meet two columns.
   * Each item wraps one panel and stretches it both ways.
   */
  band: 'flex flex-wrap items-stretch gap-3',
  bandItem: 'flex min-w-0 flex-[1_1_20rem] *:min-w-0 *:flex-1',
  bandItemWide: 'flex min-w-0 flex-[1_1_28.75rem] *:min-w-0 *:flex-1',

  /**
   * The data card (design Rev .62, Page Look 1a — was §16.6's framed raised
   * card): no frame, ink 4%, radius 12. Rows inside tables keep their
   * dividers, which are for scanning, not decoration.
   */
  panel: 'min-w-0 border mat-card',
  // Rev .62: the head is a rule, not a band — no fill, the ink-6% line.
  panelHead: 'flex flex-wrap items-center gap-2.5 border-b px-3 py-1.75 text-dense-body leading-normal',
  panelTitle: 'text-dense-body font-semibold leading-normal text-foreground',
  panelNote: 'text-dense-meta leading-normal text-muted-foreground',

  cap: 'whitespace-nowrap text-dense-caption font-semibold uppercase leading-normal tracking-[0.1em] text-muted-foreground',
  mono: 'font-mono tabular-nums',
  link: 'cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 text-dense-meta leading-normal text-primary hover:underline',
  btn: cn(
    'inline-flex h-5.5 cursor-pointer items-center gap-1.25 whitespace-nowrap border mat-btn',
    'px-1.75 text-dense-meta text-secondary-foreground hover:text-foreground',
  ),
  /** The `?` that opens how a figure is built. */
  q: cn(
    'inline-flex h-4 w-4 flex-none cursor-pointer items-center justify-center border rounded-full bg-[var(--mat-btn-fill)] hover:bg-[color-mix(in_srgb,var(--sk-ink)_14%,transparent)] border-transparent',
    'p-0 text-dense-caption leading-none text-muted-foreground hover:text-primary',
  ),
  input: cn(
    'h-5.5 min-w-0 border px-1.75 mat-field',
    'font-mono text-xs text-foreground outline-none',
  ),

  // §17.2 (Rev .51, Owner 2026-09-25): the header is the DS one — uppercase,
  // 11px, mute — not the sentence-case soft header this family used to wear.
  th: 'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-meta font-semibold uppercase leading-[1.3] tracking-[0.05em] text-[var(--sk-mute)]',
  td: 'whitespace-nowrap border-b border-border/55 px-2 py-1.25 text-right font-mono text-xs leading-normal tabular-nums',
} as const
