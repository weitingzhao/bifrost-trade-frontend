/**
 * The win rate's ink, one rule for both cuts (Rev .90): a win rate is a
 * quality reading, not a signed figure, so it never wears the profit green or
 * the loss red. At 70% and over it is ink, from 55% the soft grey, under 55%
 * amber — thin, not a fault.
 */
export function winRateInk(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return 'text-muted-foreground'
  if (rate >= 0.7) return 'text-foreground'
  if (rate >= 0.55) return 'text-[var(--sk-soft)]'
  return 'text-warning'
}
