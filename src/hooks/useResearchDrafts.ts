/**
 * TanStack Query hooks for Research Cockpit draft inbox (Wave RS-E3).
 */
import { useCallback } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useHeldRemoval } from '@/hooks/useHeldRemoval'
import { notify } from '@/lib/shellNotify'
import { settleDraftWrites } from '@/lib/harness/draftWriteFailures'
import {
  BRIEFING_QUEUE_KINDS,
  combineInboxQueue,
  INBOX_QUEUE_KINDS,
} from '@/lib/harness/inboxQueue'
import {
  approveResearchDraft,
  createResearchDraft,
  dismissResearchDraft,
  listAllResearchDrafts,
  listResearchDrafts,
  runEodAgent,
  runMorningAgent,
  type CreateResearchDraftBody,
  type DraftKind,
  type DraftStatus,
} from '@/api/researchDrafts'

export const researchDraftsQueryKey = ['research-engine', 'drafts'] as const

/**
 * Pending drafts.
 *
 * `limit` is part of the query key on purpose. The Decision Inbox computed its
 * "to decide", "briefings" and "repeats folded in" counts from whatever this
 * returned, and this returned fifty — so with seventy-seven pending it said
 * twenty-four to decide, twenty-seven cards never rendered, and the true total
 * sat in the same line as a number counted off a different set. A page that
 * has to be complete asks for the whole queue; a banner that only wants a
 * count keeps the small page.
 */
export function useResearchDrafts(opts?: {
  status?: DraftStatus
  kind?: DraftKind
  refetchIntervalMs?: number
  limit?: number
}) {
  const status = opts?.status ?? 'pending'
  const kind = opts?.kind
  const limit = opts?.limit ?? 50
  return useQuery({
    queryKey: [...researchDraftsQueryKey, status, kind ?? 'all', limit],
    queryFn: () => listResearchDrafts({ status, kind, limit }),
    refetchInterval: opts?.refetchIntervalMs ?? 30_000,
    staleTime: 10_000,
  })
}

/** The API's own ceiling (`api/agents.py`: `le=200`). */
export const DRAFTS_PAGE_MAX = 200

/**
 * The whole pending queue for the Decision Inbox, read one kind at a time
 * (see `lib/harness/inboxQueue`). Under the drafts prefix, so every write that
 * invalidates the drafts refreshes this too. Briefings poll at half the rate:
 * there are hundreds of them and none needs an answer.
 */
export function useInboxQueue() {
  return useQueries({
    queries: INBOX_QUEUE_KINDS.map((kind) => ({
      queryKey: [...researchDraftsQueryKey, 'pending', kind, 'every-page'] as const,
      queryFn: () => listAllResearchDrafts({ status: 'pending', kind }),
      refetchInterval: BRIEFING_QUEUE_KINDS.includes(kind) ? 60_000 : 30_000,
      staleTime: 10_000,
    })),
    combine: combineInboxQueue,
  })
}

export function useApproveDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approveResearchDraft(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: researchDraftsQueryKey })
      void qc.invalidateQueries({ queryKey: ['research-engine', 'hypothesis'] })
    },
  })
}

export function useDismissDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dismissResearchDraft(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: researchDraftsQueryKey })
    },
  })
}

export interface HeldWriteOptions {
  /** Called once the write has gone out and at least one draft landed. */
  onCommitted?: (landed: readonly string[]) => void
}

/**
 * Held writes on drafts (design Rev .75/.79; Record answer since Owner
 * 2026-10-04 #9). Neither write can be taken back on the server — a dismissal
 * also marks the linked action rejected, an approval moves the draft out of
 * the queue for good — so the draft leaves every list at once, the toast offers
 * Undo for 5s (and ⌘Z while it is up), and the write goes out when the toast
 * does. One scope for the store, so a draft held on the Inbox is gone from the
 * Copilot queue and the Hypothesis board too.
 *
 * Several ids are one toast and one request each. When some land and some do
 * not, the ones that did not come back on their card with the reason
 * (`draftWriteFailures`).
 */
export function useHeldDraftWrites() {
  const { isHeld, hold } = useHeldRemoval('research-draft')
  const dismiss = useCallback(
    (ids: string | readonly string[], msg = 'Draft dismissed', opts: HeldWriteOptions = {}) => {
      const list: readonly string[] = typeof ids === 'string' ? [ids] : ids
      if (list.length === 0) return
      hold(list, {
        msg,
        commit: async () => {
          const { landed, failed } = await settleDraftWrites(list, 'Dismiss', (id) => dismissResearchDraft(id))
          if (failed.length > 0) notify(`Dismissed ${landed.length} of ${list.length} — the rest stay on the card`)
          opts.onCommitted?.(landed)
        },
        invalidate: [researchDraftsQueryKey],
        failed: 'Dismiss did not save',
      })
    },
    [hold],
  )
  /**
   * Record answer on a call (Rev .144): the server's approve for
   * `decision_draft` / `order_intent` is an advisory pass-through — it writes
   * the draft's status and an action-log row, nothing in Trade (D10) — but it
   * is still final, so it waits behind the same toast as Dismiss.
   */
  const record = useCallback(
    (
      ids: string | readonly string[],
      msg: string,
      opts: HeldWriteOptions & { onLanded?: (result: Awaited<ReturnType<typeof approveResearchDraft>>) => void } = {},
    ) => {
      const list: readonly string[] = typeof ids === 'string' ? [ids] : ids
      if (list.length === 0) return
      hold(list, {
        msg,
        commit: async () => {
          const { landed, failed } = await settleDraftWrites(
            list,
            'Record answer',
            (id) => approveResearchDraft(id),
            (_id, result) => opts.onLanded?.(result),
          )
          if (failed.length > 0) notify(`Recorded ${landed.length} of ${list.length} — the rest stay on the card`)
          opts.onCommitted?.(landed)
        },
        invalidate: [researchDraftsQueryKey, ['research-engine', 'hypothesis']],
        failed: 'Record answer did not save',
      })
    },
    [hold],
  )
  return { isHeld, dismiss, record }
}

/** Dismiss with Undo, for the surfaces that only dismiss. */
export function useHeldDraftDismiss() {
  const { isHeld, dismiss } = useHeldDraftWrites()
  return { isHeld, dismiss }
}

export function useCreateResearchDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateResearchDraftBody) => createResearchDraft(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: researchDraftsQueryKey })
    },
  })
}

export function useRunMorningAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => runMorningAgent(false),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: researchDraftsQueryKey })
    },
  })
}

export function useRunEodAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => runEodAgent(false),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: researchDraftsQueryKey })
    },
  })
}
