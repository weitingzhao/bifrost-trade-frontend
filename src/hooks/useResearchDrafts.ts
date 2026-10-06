/**
 * TanStack Query hooks for Research Cockpit draft inbox (Wave RS-E3).
 */
import { useCallback } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useHeldRemoval } from '@/hooks/useHeldRemoval'
import { notify } from '@/lib/shellNotify'
import { settleDraftWrites, settledLine } from '@/lib/harness/draftWriteFailures'
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

/**
 * Drafts that expired lately (design Rev .156): the Inbox keeps them in place,
 * inert. The newest 200 by creation are plenty for a three-day window; the
 * page filters by when they expired (`lib/harness/expiredDrafts`).
 */
export function useExpiredDrafts() {
  return useQuery({
    queryKey: [...researchDraftsQueryKey, 'expired', 'all', DRAFTS_PAGE_MAX] as const,
    queryFn: () => listResearchDrafts({ status: 'expired', limit: DRAFTS_PAGE_MAX }),
    refetchInterval: 60_000,
    staleTime: 30_000,
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
  /**
   * Drafts that leave the list with the answered ones but are not written —
   * an objective's earlier runs, which its newest run covers (Owner
   * 2026-10-04 #11). Undo brings them back with the rest; once the write
   * lands, `onCommitted` is where they are hidden for good.
   */
  alsoHide?: readonly string[]
}

type ApproveResult = Awaited<ReturnType<typeof approveResearchDraft>>

export interface HeldApproveOptions extends HeldWriteOptions {
  /** Each draft that landed, with what the server wrote for it. */
  onLanded?: (result: ApproveResult) => void
}

/** Approve and Record answer are the same request; only the words differ. */
const APPROVE_WORDS = {
  approve: { verb: 'Approve', partial: 'Approved', failed: 'Approve did not save' },
  record: { verb: 'Record answer', partial: 'Recorded', failed: 'Record answer did not save' },
} as const

/**
 * Held writes on drafts (design Rev .75/.79; Record answer since Owner
 * 2026-10-04 #9, Approve since batch 4's follow-up). None of the three can be
 * taken back on the server — a dismissal also marks the linked action
 * rejected, an approval writes into The Book and moves the draft out of the
 * queue for good — so the draft leaves every list at once, the toast offers
 * Undo for 5s (and ⌘Z while it is up), and the write goes out when the toast
 * does. One scope for the store, so a draft held on the Inbox is gone from
 * the Copilot queue and the Hypothesis board too.
 *
 * Several ids are one toast and one request each. When some land and some do
 * not, the ones that did not come back on their card with the reason
 * (`draftWriteFailures`). A draft that expired while it waited (409, Research
 * 0.166.0) is not a failure: it leaves the card and a neutral line says why.
 */
export function useHeldDraftWrites() {
  const { isHeld, hold } = useHeldRemoval('research-draft')
  const dismiss = useCallback(
    (ids: string | readonly string[], msg = 'Draft dismissed', opts: HeldWriteOptions = {}) => {
      const list: readonly string[] = typeof ids === 'string' ? [ids] : ids
      if (list.length === 0) return
      hold([...list, ...(opts.alsoHide ?? [])], {
        msg,
        commit: async () => {
          const settled = await settleDraftWrites(list, 'Dismiss', (id) => dismissResearchDraft(id))
          const line = settledLine('Dismissed', list.length, settled)
          if (line) notify(line)
          if (settled.landed.length > 0) opts.onCommitted?.(settled.landed)
        },
        invalidate: [researchDraftsQueryKey],
        failed: 'Dismiss did not save',
      })
    },
    [hold],
  )
  const approveHeld = useCallback(
    (words: (typeof APPROVE_WORDS)[keyof typeof APPROVE_WORDS], ids: string | readonly string[], msg: string, opts: HeldApproveOptions) => {
      const list: readonly string[] = typeof ids === 'string' ? [ids] : ids
      if (list.length === 0) return
      hold([...list, ...(opts.alsoHide ?? [])], {
        msg,
        commit: async () => {
          const settled = await settleDraftWrites(
            list,
            words.verb,
            (id) => approveResearchDraft(id),
            (_id, result) => opts.onLanded?.(result),
          )
          const line = settledLine(words.partial, list.length, settled)
          if (line) notify(line)
          if (settled.landed.length > 0) opts.onCommitted?.(settled.landed)
        },
        invalidate: [researchDraftsQueryKey, ['research-engine', 'hypothesis']],
        failed: words.failed,
      })
    },
    [hold],
  )
  /**
   * Approve (batch 4 follow-up): accepts the draft into The Book — a batch
   * into the Pool, a patch into its policy, a playbook entry into the
   * Playbook. Final on the server, so it waits behind the same toast.
   */
  const approve = useCallback(
    (ids: string | readonly string[], msg: string, opts: HeldApproveOptions = {}) =>
      approveHeld(APPROVE_WORDS.approve, ids, msg, opts),
    [approveHeld],
  )
  /**
   * Record answer on a call (Rev .144): the server's approve for
   * `decision_draft` / `order_intent` is an advisory pass-through — it writes
   * the draft's status and an action-log row, nothing in Trade (D10) — but it
   * is still final, so it waits behind the same toast as Dismiss.
   */
  const record = useCallback(
    (ids: string | readonly string[], msg: string, opts: HeldApproveOptions = {}) =>
      approveHeld(APPROVE_WORDS.record, ids, msg, opts),
    [approveHeld],
  )
  return { isHeld, dismiss, approve, record }
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
