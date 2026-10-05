/**
 * Calendar · Draft expiry (future) — what leaves the loop unanswered on a day
 * (Owner plan #17): pending drafts by their own `expires_at`, read through the
 * Decision Inbox's queue (`useInboxQueue`, its keys), and open candidates by
 * `ttl_at`, read through the Candidate Pool's own query (`useCandidates({ status:
 * 'open' })`) — `GET /research/candidates` expires stale rows as it reads, so
 * the Calendar asks nothing the Pool has not already asked.
 *
 * `expires_at` is the server's rule (research 0.166+ writes it on new drafts;
 * the first carry it after the next EOD run). Nothing here estimates an expiry
 * from a draft's kind: until a draft carries one, the drafts half is empty and
 * the note says why. Day: New York.
 */
import { useMemo } from 'react'
import type { AiDraft } from '@/api/researchDrafts'
import type { ResearchCandidate } from '@/api/research/candidates'
import { useCandidates } from '@/hooks/useCandidates'
import { useInboxQueue } from '@/hooks/useResearchDrafts'
import { draftTitle } from '@/lib/harness/draftText'
import { firstResearchAuthGapError } from '@/lib/auth/researchAuthGap'
import { layerStateOf, type CalendarItem, type CalendarLayerReading, type CalendarLayerState } from './calendarLayers'
import { nyDayOf } from './decisionsLayer'

export function draftExpiryItems(pending: readonly AiDraft[], openCandidates: readonly ResearchCandidate[]): CalendarItem[] {
  const out: CalendarItem[] = []
  for (const d of pending) {
    const day = nyDayOf(d.expires_at)
    if (!day || d.status !== 'pending') continue
    out.push({
      key: `drafts:draft:${d.id}`,
      d: day,
      layer: 'drafts',
      cell: 'Inbox · 1 expires',
      text: `${d.kind.replace(/_/g, ' ')} · ${draftTitle(d)} · expires unanswered`,
      syms: [],
      ink: 'mute',
      to: `/research/loop/decisions?card=${encodeURIComponent(d.id)}`,
    })
  }
  for (const c of openCandidates) {
    const day = nyDayOf(c.ttl_at)
    if (!day || c.status !== 'open') continue
    out.push({
      key: `drafts:candidate:${c.id}`,
      d: day,
      layer: 'drafts',
      cell: `${c.symbol} candidate expires`,
      text: `candidate ${c.symbol} · leaves the Pool unpromoted`,
      syms: [c.symbol.toUpperCase()],
      ink: 'mute',
      to: '/research/loop/candidates',
    })
  }
  return out.sort((a, b) => a.d.localeCompare(b.d))
}

export function useCalendarDraftExpiry(): CalendarLayerReading {
  const queue = useInboxQueue()
  const pool = useCandidates({ status: 'open' })
  const pending = useMemo(() => [...queue.decisions, ...queue.briefings], [queue.decisions, queue.briefings])
  const items = useMemo(() => draftExpiryItems(pending, pool.data?.items ?? []), [pending, pool.data?.items])
  const queueState: CalendarLayerState =
    queue.error != null && !queue.complete && queue.listed === 0
      ? firstResearchAuthGapError(queue.error) !== undefined
        ? 'signed-out'
        : 'failed'
      : queue.decisionsLoading || queue.briefingsLoading
        ? 'loading'
        : 'ready'
  const poolState = layerStateOf([pool])
  const state: CalendarLayerState = [queueState, poolState].includes('signed-out')
    ? 'signed-out'
    : [queueState, poolState].includes('failed')
      ? 'failed'
      : [queueState, poolState].includes('loading')
        ? 'loading'
        : 'ready'
  const draftsDated = pending.filter((d) => d.expires_at).length
  return {
    layer: 'drafts',
    items,
    state,
    note:
      state === 'signed-out'
        ? 'The Inbox and the Pool are the research user’s — sign in to read them.'
        : state === 'ready' && pending.length > 0 && draftsDated === 0
          ? `None of the ${pending.length} pending drafts carries an expiry yet — Research writes expires_at on drafts from the next EOD run on; candidates’ ttl_at stand meanwhile.`
          : null,
  }
}
