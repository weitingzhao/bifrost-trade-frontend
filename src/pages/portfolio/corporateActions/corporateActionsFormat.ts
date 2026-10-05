/**
 * Corporate Actions' own formatting — shared by the page and its sibling
 * panels (split out at the §16 refinement, Rev .91, to keep the page file
 * under the size ratchet).
 */
export { amountLabel, fmtPerShare, kindLabel } from '@/utils/corporateActionEvents'

/** A foot is a rule, not a band (Rev .84): no fill, the ink-6% line above it. */
export const FOOT =
  'border-t border-border px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

/**
 * A band whose emptiness is not a reading wears an amber edge (the design's
 * pending mark, Rev .91 #4) — inline, because mat-card clears a border class.
 */
export const AMBER_EDGE = { borderColor: 'color-mix(in srgb, var(--color-warning) 45%, transparent)' } as const

/** The contract multiplier every leg in this book carries — and what a split changes. */
export const STANDARD_MULTIPLIER = 100

/** A share count that may be fractional, at the precision the broker holds it. */
export function fmtShares(v: number): string {
  const s = v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  return Number(s).toLocaleString('en-US', { maximumFractionDigits: 4 })
}
