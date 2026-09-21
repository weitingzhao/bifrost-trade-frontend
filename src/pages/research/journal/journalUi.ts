/**
 * The Journal's vocabulary: which tag a type and an operator wear.
 *
 * Kept apart from the page so the trees, the Settled table and the Selected
 * panel cannot drift into three different colours for one word.
 */
import type { DenseTagVariant } from '@/components/data-display'
import type { JournalNodeType, JournalOperator, JournalStation } from './journalModel'

/**
 * The type tag. `patch` and `intent` are the two that change something
 * outside the Journal, so they carry the strategy ink the Lens uses for a
 * policy; a settlement is a verdict from the market and wears the outcome's.
 */
export const TYPE_TAG: Record<JournalNodeType, DenseTagVariant> = {
  run: 'instance',
  candidate: 'symbol',
  hypothesis: 'category',
  verdict: 'warning',
  decision: 'warning',
  patch: 'strategy',
  batch: 'info',
  digest: 'neutral',
  note: 'neutral',
  intent: 'danger',
  settlement: 'success',
}

export const OPERATOR_TAG: Record<JournalOperator, DenseTagVariant> = {
  hand: 'source-manual',
  loop: 'source-muted',
  copilot: 'info',
}

export const OPERATOR_LABEL: Record<JournalOperator, string> = {
  hand: 'hand',
  loop: 'loop',
  copilot: 'copilot',
}

/**
 * How a state reads. `in Inbox` is the only one that asks for anything, so it
 * is the only one that takes the warning ink — a history where every row
 * shouts says nothing.
 */
export function journalStateClass(state: string): string {
  if (state.startsWith('in Inbox')) return 'text-warning'
  if (state.endsWith('right')) return 'text-success'
  if (state.endsWith('wrong')) return 'text-destructive'
  if (state === 'dismissed' || state === 'expired') return 'text-muted-foreground/70'
  return 'text-muted-foreground'
}

/** `13:30Z` from an ISO instant; a date-only stamp stays a date. */
export function journalClock(at: string): string {
  if (!at) return '—'
  const t = at.indexOf('T')
  if (t < 0) return at
  return `${at.slice(t + 1, t + 6)}Z`
}


/**
 * The station a tree is capped with.
 *
 * The design caps a tree with the station rather than the kind at its root:
 * *which part of the machine wrote this* is what makes a day scannable.
 *
 * It gives each of the six its own colour; this side does not, because the
 * app already decided how a station is coloured and decided differently —
 * `ObjectiveLap` draws all six in one muted ink and spends colour on the one
 * distinction that matters, the two stations that leave the research loop.
 * Six hues here would be a second convention for the same word one click
 * away, so the cap is the word alone.
 */
export const STATION_LABEL: Record<JournalStation, string> = {
  scan: 'scan',
  nominate: 'nominate',
  judge: 'judge',
  decide: 'decide',
  settle: 'settle',
  feedback: 'feed back',
}

