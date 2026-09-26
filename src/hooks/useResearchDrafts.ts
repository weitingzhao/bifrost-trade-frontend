/**
 * TanStack Query hooks for Research Cockpit draft inbox (Wave RS-E3).
 */
import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useHeldRemoval } from '@/hooks/useHeldRemoval'
import {
  approveResearchDraft,
  createResearchDraft,
  dismissResearchDraft,
  listResearchDrafts,
  runEodAgent,
  runMorningAgent,
  type CreateResearchDraftBody,
  type DraftKind,
  type DraftStatus,
} from '@/api/researchDrafts'

export const researchDraftsQueryKey = ['research', 'drafts'] as const

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

export function usePendingDraftCount() {
  const q = useResearchDrafts({ status: 'pending' })
  return {
    count: q.data?.pending_count ?? q.data?.count ?? 0,
    isLoading: q.isLoading,
    refetch: q.refetch,
  }
}

export function useApproveDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approveResearchDraft(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: researchDraftsQueryKey })
      void qc.invalidateQueries({ queryKey: ['research', 'hypothesis'] })
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

/**
 * Dismiss with Undo (design Rev .75/.79). The server has no way to take a
 * dismissal back — it also marks the linked action rejected — so the draft
 * leaves every list at once and the write goes out when the toast does. One
 * scope for the store, so a draft held on the Inbox is gone from the Copilot
 * queue and the Hypothesis board too.
 */
export function useHeldDraftDismiss() {
  const { isHeld, hold } = useHeldRemoval('research-draft')
  const dismiss = useCallback(
    (ids: string | readonly string[], msg = 'Draft dismissed') => {
      const list: readonly string[] = typeof ids === 'string' ? [ids] : ids
      if (list.length === 0) return
      hold(list, {
        msg,
        commit: () => Promise.all(list.map((id) => dismissResearchDraft(id))),
        invalidate: [researchDraftsQueryKey],
        failed: 'Dismiss did not save',
      })
    },
    [hold],
  )
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
