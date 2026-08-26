/**
 * Convert persisted session frames (RS-KB1) into CopilotUiMessage rows for the chat list.
 */
import type { CopilotToolCall, CopilotUiMessage } from '@/hooks/useCopilotSession'

export type PersistedCopilotFrame = {
  kind?: string
  role?: string
  content?: string
  agent_from?: string
  agent_to?: string
  tool_call_id?: string
  tool_name?: string
  args?: Record<string, unknown>
  ok?: boolean
  data?: unknown
  error?: string
  agent?: string
  ts?: string
}

function frameKind(frame: PersistedCopilotFrame): string {
  if (frame.kind) return frame.kind
  if (frame.role === 'user' || frame.role === 'assistant') return 'text'
  return 'text'
}

export function hydrateCopilotMessages(
  frames: PersistedCopilotFrame[],
  sessionId: string,
): CopilotUiMessage[] {
  const out: CopilotUiMessage[] = []
  let seq = 0

  const pushAssistantShell = (): CopilotUiMessage => {
    const msg: CopilotUiMessage = {
      id: `hist-${sessionId}-${seq++}`,
      role: 'assistant',
      content: '',
      toolCalls: [],
    }
    out.push(msg)
    return msg
  }

  let currentAssistant: CopilotUiMessage | null = null

  for (const frame of frames) {
    const kind = frameKind(frame)

    if (kind === 'handoff') {
      currentAssistant = null
      out.push({
        id: `hist-${sessionId}-${seq++}`,
        role: 'assistant',
        content: '',
        handoff: {
          from: String(frame.agent_from ?? 'triage'),
          to: String(frame.agent_to ?? 'specialist'),
        },
      })
      continue
    }

    if (kind === 'tool_call') {
      if (!currentAssistant) currentAssistant = pushAssistantShell()
      const tc: CopilotToolCall = {
        id: String(frame.tool_call_id ?? `tool-${seq}`),
        name: String(frame.tool_name ?? 'unknown'),
        arguments: frame.args ?? {},
        status: 'pending',
      }
      currentAssistant.toolCalls = [...(currentAssistant.toolCalls ?? []), tc]
      continue
    }

    if (kind === 'tool_result') {
      const callId = String(frame.tool_call_id ?? '')
      let patched = false
      for (let i = out.length - 1; i >= 0; i--) {
        const m = out[i]
        if (m.role !== 'assistant' || !m.toolCalls) continue
        const idx = m.toolCalls.findIndex((tc) => tc.id === callId)
        if (idx < 0) continue
        const toolCalls = [...m.toolCalls]
        toolCalls[idx] = {
          ...toolCalls[idx],
          result: frame.ok ? { ok: true, data: frame.data } : { ok: false, error: frame.error },
          status: frame.ok ? 'done' : 'error',
        }
        out[i] = { ...m, toolCalls }
        patched = true
        currentAssistant = out[i]
        break
      }
      if (!patched && callId) {
        if (!currentAssistant) currentAssistant = pushAssistantShell()
        currentAssistant.toolCalls = [
          ...(currentAssistant.toolCalls ?? []),
          {
            id: callId,
            name: String(frame.tool_name ?? 'unknown'),
            arguments: {},
            result: frame.ok ? { ok: true, data: frame.data } : { ok: false, error: frame.error },
            status: frame.ok ? 'done' : 'error',
          },
        ]
      }
      continue
    }

    const role = frame.role === 'user' ? 'user' : 'assistant'
    const content = String(frame.content ?? '')

    if (role === 'user') {
      currentAssistant = null
      out.push({
        id: `hist-${sessionId}-${seq++}`,
        role: 'user',
        content,
      })
      continue
    }

    if (
      currentAssistant &&
      currentAssistant.role === 'assistant' &&
      !currentAssistant.handoff &&
      !(currentAssistant.toolCalls?.length ?? 0) &&
      !currentAssistant.content
    ) {
      currentAssistant.content = content
      if (frame.agent) currentAssistant.agent = String(frame.agent)
    } else {
      currentAssistant = {
        id: `hist-${sessionId}-${seq++}`,
        role: 'assistant',
        content,
        toolCalls: [],
        agent: frame.agent ? String(frame.agent) : undefined,
      }
      out.push(currentAssistant)
    }
  }

  return out
}
