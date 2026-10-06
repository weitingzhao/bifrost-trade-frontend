/**
 * Which signal-entry basis the research-api this page talks to runs: v2
 * (0.175.0+, offset 0 = the session after the signal) or v1 (offset 0 = the
 * signal's own session). Read from `/health`'s version before a run is posted,
 * so "1 session after" means the next session on either server.
 *
 * `v2` is null until the version is read — a Run waits rather than guess,
 * because a wrong guess on v1 is a same-day entry the signal could not know.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchResearchHealth } from '@/api/research/health'
import { SIM_ENTRY_V2_VERSION, versionAtLeast } from '@/api/research/backtestSim'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useSimEntryBasis(): { version: string | null; v2: boolean | null; failed: boolean } {
  const q = useQuery({
    queryKey: QUERY_KEYS.researchEngine.health,
    queryFn: fetchResearchHealth,
    staleTime: 60_000,
  })
  const version = q.data?.version ?? null
  return {
    version,
    v2: version == null ? null : versionAtLeast(version, SIM_ENTRY_V2_VERSION),
    failed: q.isError,
  }
}
