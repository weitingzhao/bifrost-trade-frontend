/**
 * The vertical slice — one underlying → one plan → one order → one position →
 * one review — as the shell reads it (design Rev 2026-09-23.25).
 *
 * The design folded its StageRail into the breadcrumb: pages no longer carry a
 * row of their own, the top bar shows one quiet chip naming where on the slice
 * you stand, and the chip opens the whole chain. This side never built the
 * rail, so the chip is where the slice arrives here for the first time. The
 * table is the design's `SLICE` from `shell-registry.js`, kept as data so the
 * chip and the chain it opens read one list.
 *
 * Membership is by route: a page's sibling views count as its stage (Symbol's
 * faces, the Desk's fills and rules), so they do not fall out of the chain.
 */

export interface SliceStage {
  label: string
  /** Where the stage's chip goes. */
  to: string
  /** Every route that stands at this stage. */
  match: readonly string[]
  /** What the stage is for — the chip's title. */
  why: string
}

export const SLICE: readonly SliceStage[] = [
  {
    label: 'Analyze',
    to: '/research/symbol',
    match: [
      '/research/symbol',
      '/research/vol-regime',
      '/research/dealer-levels',
      '/research/scenario',
      '/research/flow',
      '/research/discovery',
      '/research/payoff',
      '/research/compare',
      '/research/history',
    ],
    why: 'Underlying and contract: is it worth doing',
  },
  {
    label: 'Plan',
    to: '/trade/plans',
    match: ['/trade/plans'],
    why: 'Entry, target and stop written down — the discipline measure depends on this existing',
  },
  {
    label: 'Order',
    to: '/trade/desk',
    match: ['/trade/desk', '/trade/fills', '/trade/rules'],
    why: 'Place and fill, recording the mid at submit',
  },
  {
    label: 'Position',
    to: '/portfolio/positions',
    match: ['/portfolio/positions'],
    why: 'Per-position greeks; the roll drawer opens from a row here',
  },
  {
    label: 'Review',
    to: '/review/fit',
    match: ['/review/fit', '/review', '/review/habits', '/review/proposals'],
    why: 'Actual vs plan vs best available',
  },
]

/**
 * The stage a route stands at, or -1 off the slice. An exact route wins over
 * a prefix, so `/review/fit` is Review by its own name before `/review` could
 * claim it; a prefix only counts at a path boundary, so `/review/fitness`
 * would not be `/review/fit`.
 */
export function sliceOf(pathname: string): number {
  const exact = SLICE.findIndex((s) => s.match.includes(pathname))
  if (exact >= 0) return exact
  return SLICE.findIndex((s) => s.match.some((m) => pathname.startsWith(`${m}/`)))
}

export type StageState = 'done' | 'current' | 'next' | 'future'

export function stageState(index: number, current: number): StageState {
  if (index < current) return 'done'
  if (index === current) return 'current'
  return index === current + 1 ? 'next' : 'future'
}
