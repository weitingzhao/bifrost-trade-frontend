import { researchEngineUrl } from '@/lib/devApiUrl'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'

/**
 * Model catalog returned by the Research API — reflects which providers
 * actually have their required API keys configured in the deployment
 * (Wave RS-KB QA / unified model picker).
 *
 * Shape mirrors `GET /research/copilot/models`:
 * ```
 * { available: [...], default: "deepseek-chat", total_catalog: 5 }
 * ```
 */

export type CopilotModelInfo = {
  id: string
  label: string
  provider: 'deepseek' | 'anthropic' | 'openai' | 'ollama'
  family: string
  cost_per_mtok_in?: number
  cost_per_mtok_out?: number
  note?: string
}

export type CopilotModelsResponse = {
  available: CopilotModelInfo[]
  default: string | null
  total_catalog: number
}

export async function fetchCopilotModels(
  signal?: AbortSignal,
): Promise<CopilotModelsResponse> {
  const url = researchEngineUrl('/research/copilot/models')
  const resp = await fetch(url, {
    signal,
    headers: getResearchAuthHeaders(),
  })
  if (!resp.ok) {
    throw new Error(`copilot/models failed: ${resp.status}`)
  }
  return (await resp.json()) as CopilotModelsResponse
}
