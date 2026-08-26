import { useQuery } from '@tanstack/react-query'

import {
  fetchCopilotModels,
  type CopilotModelInfo,
  type CopilotModelsResponse,
} from '@/api/researchCopilotModels'

/**
 * Hook: available Copilot models for the current deployment.
 *
 * Only lists models whose backend provider env vars are actually set — so
 * on a dev cluster with only DEEPSEEK_API_KEY, the dropdown will show
 * DeepSeek Chat / Reasoner and hide Claude / GPT-5 / Ollama.  This lets the
 * composer picker and the Settings tab agree on the same, real list.
 */
export function useCopilotModels() {
  return useQuery<CopilotModelsResponse>({
    queryKey: ['copilot', 'models'],
    queryFn: ({ signal }) => fetchCopilotModels(signal),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export type { CopilotModelInfo, CopilotModelsResponse }
