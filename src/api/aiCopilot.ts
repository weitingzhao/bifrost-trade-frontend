/**
 * Research Copilot SSE client — POST /research/copilot/stream
 * Wave RS-F: agent_handoff · guardrail events (back-compat ignored if unknown).
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'
import type { CopilotModelId } from '@/lib/cockpit/modelCatalog'

export type CopilotChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/** Frozen stream body field — keep in sync with bifrost-research ClientContext. */
export type CopilotClientContext = {
  origin_page?: string
  origin_label?: string
  symbol?: string
  date?: string
  panel?: string
  snapshot?: Record<string, unknown>
  suggested_prompt?: string
}

export function toCopilotClientContext(
  intent: {
    originPage: string
    originLabel: string
    symbol?: string
    date?: string
    panel?: string
    snapshot?: Record<string, unknown>
    suggestedPrompt?: string
  },
  options?: { includeSuggested?: boolean },
): CopilotClientContext {
  const ctx: CopilotClientContext = {
    origin_page: intent.originPage,
    origin_label: intent.originLabel,
  }
  if (intent.symbol) ctx.symbol = intent.symbol
  if (intent.date) ctx.date = intent.date
  if (intent.panel) ctx.panel = intent.panel
  if (intent.snapshot && Object.keys(intent.snapshot).length > 0) {
    ctx.snapshot = intent.snapshot
  }
  if (options?.includeSuggested && intent.suggestedPrompt) {
    ctx.suggested_prompt = intent.suggestedPrompt
  }
  return ctx
}

export function isCopilotClientContextEmpty(
  ctx: CopilotClientContext | undefined,
): boolean {
  if (!ctx) return true
  return (
    !ctx.origin_page &&
    !ctx.origin_label &&
    !ctx.symbol &&
    !ctx.date &&
    !ctx.panel &&
    (!ctx.snapshot || Object.keys(ctx.snapshot).length === 0) &&
    !ctx.suggested_prompt
  )
}

export type CopilotSseEvent =
  | { event: 'token'; text: string; session_id?: string }
  | {
      event: 'tool_call'
      id: string
      name: string
      arguments: Record<string, unknown>
      session_id?: string
    }
  | {
      event: 'tool_result'
      id: string
      name: string
      result: unknown
      session_id?: string
    }
  | { event: 'error'; message: string; code?: string; session_id?: string }
  | {
      event: 'agent_handoff'
      from: string
      to: string
      reason?: string
      session_id?: string
    }
  | { event: 'guardrail'; phase?: string; code?: string; session_id?: string }
  | {
      event: 'done'
      session_id?: string
      ok?: boolean
      tokens?: number
      cost_usd?: number
    }
  | { event: 'session_id'; session_id: string }

export type CopilotUsage = {
  tokens_today: number
  cost_estimate_usd: number
  cap_usd: number
  remaining_usd: number
  day_utc?: string
  bridge_count_today?: number
  bridge_tokens_today?: number
  bridge_cost_usd_today?: number
}

export async function fetchCopilotUsage(signal?: AbortSignal): Promise<CopilotUsage> {
  const res = await fetch(researchEngineUrl('/research/copilot/usage'), {
    signal,
    headers: getResearchAuthHeaders(),
  })
  if (!res.ok) {
    throw new Error(`usage HTTP ${res.status}`)
  }
  return (await res.json()) as CopilotUsage
}

export type StreamHandlers = {
  onEvent: (ev: CopilotSseEvent) => void
  onError?: (err: Error) => void
}

/**
 * POST SSE stream. Returns abort controller; caller must abort on unmount.
 */
export function streamCopilot(
  body: {
    messages: CopilotChatMessage[]
    model: CopilotModelId | string
    max_tools?: number
    session_id?: string
    resume?: boolean
    client_context?: CopilotClientContext
  },
  handlers: StreamHandlers,
): AbortController {
  const ac = new AbortController()

  ;(async () => {
    try {
      const res = await fetch(researchEngineUrl('/research/copilot/stream'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...getResearchAuthHeaders(),
        },
        body: JSON.stringify(body),
        signal: ac.signal,
      })

      if (res.status === 429) {
        handlers.onEvent({
          event: 'error',
          message: 'Daily AI cap reached — resets at 00:00 UTC',
        })
        handlers.onEvent({ event: 'done', ok: false })
        return
      }

      if (!res.ok || !res.body) {
        throw new Error(`copilot stream HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          const line = part
            .split('\n')
            .map((l) => l.trim())
            .find((l) => l.startsWith('data:'))
          if (!line) continue
          const raw = line.slice('data:'.length).trim()
          try {
            const parsed = JSON.parse(raw) as CopilotSseEvent
            handlers.onEvent(parsed)
          } catch {
            // ignore malformed frames
          }
        }
      }
    } catch (err) {
      if (ac.signal.aborted) return
      const error = err instanceof Error ? err : new Error(String(err))
      handlers.onError?.(error)
      handlers.onEvent({ event: 'error', message: error.message })
      handlers.onEvent({ event: 'done', ok: false })
    }
  })()

  return ac
}

export type ApproveWriteResponse = {
  ok: boolean
  data: {
    approval_token: string
    action_id: string
    tool: string
    input_hash: string
    expires_in_sec: number
    arguments: Record<string, unknown>
  }
}

export async function approveCopilotWrite(body: {
  tool_name: string
  arguments: Record<string, unknown>
  session_id?: string
  preview?: Record<string, unknown>
  approved_by?: string
}): Promise<ApproveWriteResponse> {
  const res = await fetch(researchEngineUrl('/research/copilot/approve'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getResearchAuthHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`approve HTTP ${res.status}${detail ? `: ${detail}` : ''}`)
  }
  return (await res.json()) as ApproveWriteResponse
}

export type ExecuteWriteResponse = {
  ok: boolean
  data: {
    result: unknown
    action?: unknown
  }
}

export async function executeCopilotWrite(body: {
  approval_token: string
  tool_name: string
  arguments: Record<string, unknown>
  session_id?: string
  action_id?: string
  approved_by?: string
}): Promise<ExecuteWriteResponse> {
  const res = await fetch(researchEngineUrl('/research/copilot/execute'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getResearchAuthHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`execute HTTP ${res.status}${detail ? `: ${detail}` : ''}`)
  }
  return (await res.json()) as ExecuteWriteResponse
}

export async function dismissCopilotWrite(body: {
  tool_name: string
  arguments?: Record<string, unknown>
  session_id?: string
  reason?: string
}): Promise<void> {
  await fetch(researchEngineUrl('/research/copilot/dismiss'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getResearchAuthHeaders() },
    body: JSON.stringify(body),
  }).catch(() => {
    // dismiss is best-effort telemetry
  })
}
