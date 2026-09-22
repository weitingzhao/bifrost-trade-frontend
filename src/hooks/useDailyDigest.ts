/**
 * The day's digest — one artifact, read by three surfaces.
 *
 * The Inbox banner, the Copilot's digest panel and the Daily Brief page all
 * want the same thing: the newest `daily_digest` draft in the pending queue.
 * Three copies of "fetch the drafts, sort the digest first, find it" is three
 * chances for one of them to read yesterday's.
 */
import { useResearchDrafts } from '@/hooks/useResearchDrafts'
import { digestFirst, isDailyDigest } from '@/lib/harness/dailyDigest'
import type { AiDraft } from '@/api/researchDrafts'

export function useDailyDigest(opts?: { refetchIntervalMs?: number }) {
  const q = useResearchDrafts({ status: 'pending', refetchIntervalMs: opts?.refetchIntervalMs })
  const rows = digestFirst(q.data?.rows ?? [])
  const digest: AiDraft | undefined = rows.find(isDailyDigest)
  return {
    digest,
    payload: (digest?.payload ?? null) as Record<string, unknown> | null,
    rows,
    pendingCount: q.data?.pending_count ?? rows.length,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: q.refetch,
  }
}
