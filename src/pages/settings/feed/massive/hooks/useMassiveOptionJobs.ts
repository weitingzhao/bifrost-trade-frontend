import { useQuery } from '@tanstack/react-query'
import { fetchMassiveJobsList } from '@/api/ops'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { jobEvidenceLine, latestJobForKind } from '@/utils/massive/optionFeedJobHelpers'

export function useMassiveOptionJobs() {
  const q = useQuery({
    queryKey: [...QUERY_KEYS.ops.massiveJobs, { limit: 50 }] as const,
    queryFn: () => fetchMassiveJobsList({ limit: 50 }),
    refetchInterval: 15_000,
  })

  const jobs = q.data?.ok ? q.data.jobs : []

  const activeJobCount = jobs.filter(j => {
    const st = (j.status ?? '').toLowerCase()
    return st === 'pending' || st === 'running'
  }).length

  return {
    jobs,
    activeJobCount,
    evidenceForKind: (kind: string) => jobEvidenceLine(latestJobForKind(jobs, kind)),
    refetch: q.refetch,
    isLoading: q.isLoading,
  }
}
