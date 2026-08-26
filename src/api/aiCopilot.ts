/**
 * Research Copilot SSE client — POST /research/copilot/stream
 * FE never holds LLM API keys; talks only to Research API via researchEngineUrl.
 * Wave RS-E4: approve / execute / dismiss for write diffs.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import type { CopilotModelId } from '@/lib/cockpit/modelCatalog'

export type CopilotChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
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
  | { event: 'error'; message: string; session_id?: string }
  | {
      event: 'done'
      session_id?: string
      ok?: boolean
      tokens?: number
      cost_usd?: number
    }

export type CopilotUsage = {
  tokens_today: number
  cost_estimate_usd: number
  cap_usd: number
  remaining_usd: number
  day_utc?: string
}

export async function fetchCopilotUsage(signal?: AbortSignal): Promise<CopilotUsage> {
  const res = await fetch(researchEngineUrl('/research/copilot/usage'), { signal })
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {
    // dismiss is best-effort telemetry
  })
}
