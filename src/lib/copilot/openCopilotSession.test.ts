import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/researchCopilotSessions', () => ({
  fetchCopilotSession: vi.fn(),
}))

import { fetchCopilotSession } from '@/api/researchCopilotSessions'
import { copilotSessionStore } from '@/hooks/useCopilotSession'
import { openCopilotSession } from './openCopilotSession'

const fetchMock = vi.mocked(fetchCopilotSession)

describe('openCopilotSession', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    copilotSessionStore.clearSession()
  })

  it('hydrates the dock from the persisted session', async () => {
    fetchMock.mockResolvedValue({
      session: { id: 'sess-a', title: 'PLTR · sell-vol', model: 'deepseek-chat' },
      messages: [{ role: 'user', content: 'what is open?' }],
    })
    await openCopilotSession('sess-a')
    const state = copilotSessionStore.getState()
    expect(state.sessionId).toBe('sess-a')
    expect(state.messages.some((m) => m.content === 'what is open?')).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('does not refetch when that session is already open', async () => {
    copilotSessionStore.setState({ sessionId: 'sess-a' })
    await openCopilotSession('sess-a')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
