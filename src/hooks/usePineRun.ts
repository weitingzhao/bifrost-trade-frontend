/**
 * Run one Pine script's build now (ledger S14, research 0.201.0). Research
 * runs it on its own side and keeps the job in memory; this polls the
 * script's latest job every two seconds while it runs, and when a run that
 * was going here finishes, refetches everything under the Pine key — the
 * library counts, the report, the chart marks — so the new signals show.
 */
import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fetchLatestPineRun, pineRunOf, runPineScript, type PineRunJob } from '@/api/research/pine'

const POLL_MS = 2_000

export function usePineRun(scriptId: string | null | undefined) {
  const qc = useQueryClient()
  const key = QUERY_KEYS.researchEngine.pineRun(scriptId ?? '')
  const q = useQuery({
    queryKey: key,
    queryFn: () => fetchLatestPineRun(scriptId!),
    enabled: Boolean(scriptId),
    staleTime: 10_000,
    refetchInterval: (query) => (query.state.data?.status === 'running' ? POLL_MS : false),
  })
  const start = useMutation({
    mutationFn: () => runPineScript(scriptId!),
    onSuccess: (job) => qc.setQueryData(key, job),
  })

  const seen = useRef<string | null>(null)
  const job = q.data ?? null
  useEffect(() => {
    const was = seen.current
    seen.current = job ? `${job.id}:${job.status}` : null
    if (job && was === `${job.id}:running` && job.status !== 'running') {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.researchEngine.pine })
    }
  }, [job, qc])

  return {
    job,
    /** Another script's run held the slot (409). */
    busyWith: start.isError ? pineRunOf(start.error) : null,
    start,
    /** After a save answered with a run: show it and poll it. */
    track: (id: string, run: PineRunJob) => qc.setQueryData(QUERY_KEYS.researchEngine.pineRun(id), run),
  }
}
