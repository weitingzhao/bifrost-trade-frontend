/**
 * The Decision Inbox's cards, for every surface that counts them.
 *
 * The Inbox page and the Copilot's waiting queue both draw "what is waiting on
 * you". They read the same queue (`useInboxQueue`, every kind in full), leave
 * out the same drafts — those held behind a toast's Undo, and the earlier runs
 * hidden in this browser — and fold what is left into the same cards
 * (`buildInboxCards`). One hook, so the two numbers cannot drift apart again.
 */
import { useMemo } from 'react'
import { useHeldDraftWrites, useInboxQueue } from '@/hooks/useResearchDrafts'
import { buildInboxCards } from '@/lib/harness/inboxCards'
import { useHiddenEarlier } from '@/lib/harness/inboxRead'

export function useInboxCards() {
  const queue = useInboxQueue()
  const writes = useHeldDraftWrites()
  const { isHeld } = writes

  const decisionRows = useMemo(() => queue.decisions.filter((d) => !isHeld(d.id)), [queue.decisions, isHeld])
  const briefingRows = useMemo(() => queue.briefings.filter((d) => !isHeld(d.id)), [queue.briefings, isHeld])
  /** Listed but held behind a toast: gone from the page, not yet from the server. */
  const heldCount = queue.listed - decisionRows.length - briefingRows.length

  // Stored ids are pruned only against the whole queue — a partial read would
  // drop every id it did not happen to contain.
  const pendingKey = queue.complete ? [...queue.decisions, ...queue.briefings].map((d) => d.id).join(',') : null
  const pendingIds = useMemo(() => (pendingKey == null ? null : pendingKey.split(',').filter(Boolean)), [pendingKey])
  const hidden = useHiddenEarlier(pendingIds)

  const cards = useMemo(() => buildInboxCards(decisionRows, hidden.ids), [decisionRows, hidden.ids])

  return { queue, decisionRows, briefingRows, heldCount, pendingIds, hidden, cards, ...writes }
}
