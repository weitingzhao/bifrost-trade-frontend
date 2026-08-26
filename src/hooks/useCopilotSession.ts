/**
 * Copilot session store — messages, streaming, model (Wave RS-E2 / RS-E4).
 * External store (no Zustand dep).
 */
import { useCallback } from 'react'
import {
  approveCopilotWrite,
  dismissCopilotWrite,
  executeCopilotWrite,
  streamCopilot,
  type CopilotChatMessage,
  type CopilotSseEvent,
} from '@/api/aiCopilot'
import { createExternalStore } from '@/lib/cockpit/externalStore'
import {
  readStoredModel,
  writeStoredModel,
  type CopilotModelId,
} from '@/lib/cockpit/modelCatalog'

export type CopilotToolCall = {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
  status: 'pending' | 'done' | 'error'
  /** Local UI: user resolved a dry_run write card */
  writeDecision?: 'approved' | 'rejected' | 'executed'
}

export type CopilotUiMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: CopilotToolCall[]
  streaming?: boolean
  error?: boolean
}

type CopilotState = {
  messages: CopilotUiMessage[]
  model: CopilotModelId
  streaming: boolean
  sessionId: string
  lastError: string | null
  capBreached: boolean
}

let abort: AbortController | null = null
let msgSeq = 0

function nextId(prefix: string) {
  msgSeq += 1
  return `${prefix}-${Date.now()}-${msgSeq}`
}

function newSessionId() {
  return `sess-${Date.now().toString(36)}`
}

const store = createExternalStore<CopilotState>({
  messages: [],
  model: readStoredModel(),
  streaming: false,
  sessionId: newSessionId(),
  lastError: null,
  capBreached: false,
})

function stripMetaArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(args)) {
    if (k === 'dry_run' || k === 'approval_token') continue
    out[k] = v
  }
  return out
}

function patchToolCall(
  toolCallId: string,
  patch: Partial<CopilotToolCall>,
  extraAssistant?: Partial<CopilotUiMessage>,
) {
  const msgs = [...store.getState().messages]
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    if (m.role !== 'assistant' || !m.toolCalls) continue
    const idx = m.toolCalls.findIndex((tc) => tc.id === toolCallId)
    if (idx < 0) continue
    const toolCalls = [...m.toolCalls]
    toolCalls[idx] = { ...toolCalls[idx], ...patch }
    msgs[i] = { ...m, toolCalls, ...extraAssistant }
    store.setState({ messages: msgs })
    return
  }
}

function applyEvent(ev: CopilotSseEvent) {
  const state = store.getState()
  if (ev.event === 'token') {
    const msgs = [...state.messages]
    const last = msgs[msgs.length - 1]
    if (last?.role === 'assistant' && last.streaming) {
      msgs[msgs.length - 1] = { ...last, content: last.content + (ev.text || '') }
    } else {
      msgs.push({
        id: nextId('a'),
        role: 'assistant',
        content: ev.text || '',
        streaming: true,
        toolCalls: [],
      })
    }
    store.setState({ messages: msgs, lastError: null })
    return
  }

  if (ev.event === 'tool_call') {
    const msgs = [...state.messages]
    let last = msgs[msgs.length - 1]
    if (!last || last.role !== 'assistant') {
      last = {
        id: nextId('a'),
        role: 'assistant',
        content: '',
        streaming: true,
        toolCalls: [],
      }
      msgs.push(last)
    }
    const toolCalls = [...(last.toolCalls ?? [])]
    toolCalls.push({
      id: ev.id,
      name: ev.name,
      arguments: ev.arguments ?? {},
      status: 'pending',
    })
    msgs[msgs.length - 1] = { ...last, toolCalls }
    store.setState({ messages: msgs })
    return
  }

  if (ev.event === 'tool_result') {
    const msgs = [...state.messages]
    const last = msgs[msgs.length - 1]
    if (last?.role === 'assistant' && last.toolCalls) {
      const toolCalls = last.toolCalls.map((tc) =>
        tc.id === ev.id
          ? {
              ...tc,
              result: ev.result,
              status: (ev.result as { ok?: boolean })?.ok === false ? 'error' : 'done',
            }
          : tc,
      ) as CopilotToolCall[]
      msgs[msgs.length - 1] = { ...last, toolCalls }
      store.setState({ messages: msgs })
    }
    return
  }

  if (ev.event === 'error') {
    const msg = ev.message || 'Copilot error'
    const cap = /cap reached/i.test(msg)
    store.setState({
      lastError: msg,
      capBreached: cap || state.capBreached,
    })
    return
  }

  if (ev.event === 'done') {
    const msgs = store.getState().messages.map((m) =>
      m.streaming ? { ...m, streaming: false } : m,
    )
    store.setState({ messages: msgs, streaming: false })
    abort = null
  }
}

export const copilotSessionStore = {
  getState: store.getState,
  setState: store.setState,
  subscribe: store.subscribe,
  setModel(model: CopilotModelId) {
    writeStoredModel(model)
    store.setState({ model })
  },
  clearSession() {
    abort?.abort()
    abort = null
    store.setState({
      messages: [],
      streaming: false,
      sessionId: newSessionId(),
      lastError: null,
    })
  },
  setCapBreached(v: boolean) {
    store.setState({ capBreached: v })
  },
  send(userText: string) {
    const trimmed = userText.trim()
    if (!trimmed || store.getState().streaming) return

    const userMsg: CopilotUiMessage = {
      id: nextId('u'),
      role: 'user',
      content: trimmed,
    }
    const prev = store.getState().messages
    store.setState({
      messages: [...prev, userMsg],
      streaming: true,
      lastError: null,
    })

    const history: CopilotChatMessage[] = [...prev, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    abort?.abort()
    abort = streamCopilot(
      {
        messages: history,
        model: store.getState().model,
        max_tools: 8,
        session_id: store.getState().sessionId,
      },
      {
        onEvent: applyEvent,
        onError: (err) => {
          store.setState({ lastError: err.message, streaming: false })
        },
      },
    )
  },

  async approveWrite(toolCallId: string) {
    const state = store.getState()
    let target: CopilotToolCall | undefined
    for (const m of state.messages) {
      const hit = m.toolCalls?.find((tc) => tc.id === toolCallId)
      if (hit) {
        target = hit
        break
      }
    }
    if (!target) throw new Error('tool call not found')

    const args = stripMetaArgs(target.arguments)
    const preview =
      target.result && typeof target.result === 'object'
        ? ((target.result as { data?: Record<string, unknown> }).data ?? undefined)
        : undefined

    const approved = await approveCopilotWrite({
      tool_name: target.name,
      arguments: args,
      session_id: state.sessionId,
      preview: preview as Record<string, unknown> | undefined,
    })

    patchToolCall(toolCallId, { writeDecision: 'approved' })

    const executed = await executeCopilotWrite({
      approval_token: approved.data.approval_token,
      tool_name: target.name,
      arguments: approved.data.arguments ?? args,
      session_id: state.sessionId,
      action_id: approved.data.action_id,
    })

    const execResult = executed.data?.result
    patchToolCall(toolCallId, {
      writeDecision: 'executed',
      result: execResult ?? executed,
      status: executed.ok ? 'done' : 'error',
    })

    // Append a short assistant note
    const note: CopilotUiMessage = {
      id: nextId('a'),
      role: 'assistant',
      content: executed.ok
        ? 'Write executed successfully.'
        : `Write failed: ${JSON.stringify(execResult).slice(0, 400)}`,
      error: !executed.ok,
    }
    store.setState({ messages: [...store.getState().messages, note] })
  },

  async rejectWrite(toolCallId: string) {
    const state = store.getState()
    let target: CopilotToolCall | undefined
    for (const m of state.messages) {
      const hit = m.toolCalls?.find((tc) => tc.id === toolCallId)
      if (hit) {
        target = hit
        break
      }
    }
    if (!target) throw new Error('tool call not found')

    await dismissCopilotWrite({
      tool_name: target.name,
      arguments: stripMetaArgs(target.arguments),
      session_id: state.sessionId,
      reason: 'user_rejected',
    })

    patchToolCall(toolCallId, { writeDecision: 'rejected' })

    const note: CopilotUiMessage = {
      id: nextId('a'),
      role: 'assistant',
      content:
        'Action rejected by user. You can ask me to adjust the proposal or try a different approach.',
    }
    store.setState({ messages: [...store.getState().messages, note] })
  },
}

export function useCopilotSession() {
  const state = store.useStore()
  const send = useCallback((text: string) => copilotSessionStore.send(text), [])
  const clearSession = useCallback(() => copilotSessionStore.clearSession(), [])
  const setModel = useCallback(
    (model: CopilotModelId) => copilotSessionStore.setModel(model),
    [],
  )
  const approveWrite = useCallback(
    (toolCallId: string) => copilotSessionStore.approveWrite(toolCallId),
    [],
  )
  const rejectWrite = useCallback(
    (toolCallId: string) => copilotSessionStore.rejectWrite(toolCallId),
    [],
  )
  return { ...state, send, clearSession, setModel, approveWrite, rejectWrite }
}
