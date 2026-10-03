import { researchEngineUrl } from '@/lib/devApiUrl'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'
import { HttpError, requestJson } from '@/lib/http'
import { withValidation } from '@/lib/apiValidation'
import {
  BridgePresetsSchema,
} from '@/lib/schemas/researchData'

const validatePresets = withValidation<BridgePresets>(
  BridgePresetsSchema,
  'research/copilot/bridge/presets',
)

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
  return validatePresets(
    await requestJson<unknown>(researchEngineUrl('/research/copilot/bridge/presets'), {
      signal,
      headers: getResearchAuthHeaders(),
      envelope: 'research',
      label: 'bridge presets',
    }),
  )
}

/** `detail.retry_after_sec` of the 429 body (`{ detail: { error, retry_after_sec, … } }`). */
function retryAfterSec(body: unknown): number | undefined {
  if (body == null || typeof body !== 'object') return undefined
  const detail = (body as { detail?: unknown }).detail
  if (detail == null || typeof detail !== 'object') return undefined
  const v = (detail as { retry_after_sec?: unknown }).retry_after_sec
  return typeof v === 'number' ? v : undefined
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
  try {
    return await requestJson<BridgeResponse>(
      researchEngineUrl(`/research/copilot/sessions/${encodeURIComponent(sessionId)}/bridge`),
      {
        method: 'POST',
        headers: getResearchAuthHeaders(),
        body,
        okFalse: 'return',
        label: 'bridge',
      },
    )
  } catch (e) {
    // The rate limit is an answer the panel shows (with its wait), not an error.
    if (e instanceof HttpError && e.status === 429) {
      return { ok: false, error: 'bridge_rate_limit', retry_after_sec: retryAfterSec(e.body) ?? 60 }
    }
    throw e
  }
}
