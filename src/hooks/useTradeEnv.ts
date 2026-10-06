/**
 * Which Trade environment this frontend talks to — `config_profile` on the
 * account API's /health (`dev`, `stg`, `prod`). Research is one deployment for
 * all three, so a read that joins Research to Trade must name the environment:
 * a DEV trade id is not a PROD one (the hypothesis → trade link, TD-143).
 */
import { useQuery } from '@tanstack/react-query'
import type { TradeEnv } from '@/api/researchHypothesis'
import { domainOrigin } from '@/lib/devApiUrl'
import { requestJson } from '@/lib/http'

export function tradeEnvOf(profile: unknown): TradeEnv | null {
  return profile === 'dev' || profile === 'stg' || profile === 'prod' ? profile : null
}

async function fetchTradeEnv(): Promise<TradeEnv | null> {
  const body = await requestJson<{ config_profile?: unknown } | null>(`${domainOrigin('account')}/health`, {
    label: 'account/health',
  })
  return tradeEnvOf(body?.config_profile)
}

/** `env` null once answered means the profile was unreadable; `loading` until then. */
export function useTradeEnv(): { env: TradeEnv | null; loading: boolean } {
  const q = useQuery({ queryKey: ['trade', 'config-profile'], queryFn: fetchTradeEnv, staleTime: Infinity, retry: 1 })
  return { env: q.data ?? null, loading: q.isPending }
}
