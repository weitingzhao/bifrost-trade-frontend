import { researchEngineUrl } from '@/lib/devApiUrl'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'

export type BridgeFocus = 'portfolio_risk' | 'strategy_validation' | 'event_driven' | 'coding_landing'
export type BridgeDepth = 'brief' | 'standard' | 'deep'
export type BridgeTarget = 'chatgpt' | 'claude' | 'deepseek' | 'generic'

export type BridgePresets = {
  focuses: { id: BridgeFocus; label: string; hint?: string }[]
  depths: { id: BridgeDepth; label: string }[]
  targets: { id: BridgeTarget; label: string }[]
  default_model: string
  default_focus: BridgeFocus
  default_depth: BridgeDepth
  default_target: BridgeTarget
}

export type BridgeResponse = {
  ok: boolean
  data?: {
    markdown: string
    event_id: string
    session_id: string
    focus: BridgeFocus
    depth: BridgeDepth
    target: BridgeTarget
    model: string
    input_tokens: number
    output_tokens: number
    cost_usd: number
    polished: boolean
  }
  error?: string
  retry_after_sec?: number
}

export async function fetchBridgePresets(signal?: AbortSignal): Promise<BridgePresets> {
  const res = await fetch(researchEngineUrl('/research/copilot/bridge/presets'), {
    signal,
    headers: getResearchAuthHeaders(),
  })
  if (!res.ok) throw new Error(`bridge presets HTTP ${res.status}`)
  const body = (await res.json()) as { data: BridgePresets }
  return body.data
}

export async function postCopilotBridge(
  sessionId: string,
  body: {
    focus: BridgeFocus
    depth: BridgeDepth
    target: BridgeTarget
    model?: string
    frames_from_message_id?: string
  },
): Promise<BridgeResponse> {
  const res = await fetch(
    researchEngineUrl(`/research/copilot/sessions/${encodeURIComponent(sessionId)}/bridge`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getResearchAuthHeaders() },
      body: JSON.stringify(body),
    },
  )
  if (res.status === 429) {
    const detail = (await res.json().catch(() => ({}))) as { detail?: { retry_after_sec?: number } }
    return {
      ok: false,
      error: 'bridge_rate_limit',
      retry_after_sec: detail.detail?.retry_after_sec ?? 60,
    }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`bridge HTTP ${res.status}${text ? `: ${text}` : ''}`)
  }
  return (await res.json()) as BridgeResponse
}
