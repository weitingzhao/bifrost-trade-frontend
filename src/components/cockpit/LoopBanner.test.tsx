// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { writeCopilotPromptLang } from '@/lib/copilot/promptLang'

vi.mock('@/hooks/useLoopHarness', () => ({
  useAwaitingRuns: () => ({
    isError: true,
    isLoading: false,
    error: new Error('boom'),
    refetch: vi.fn(),
    data: undefined,
  }),
  useActiveObjectives: () => ({ data: { items: [] } }),
  useCurateRun: () => ({ isPending: false, mutateAsync: vi.fn() }),
}))

import { LoopBanner } from './LoopBanner'

describe('LoopBanner language', () => {
  it('keeps Retry in English when prompt language is zh', () => {
    writeCopilotPromptLang('zh')
    render(
      <MemoryRouter>
        <LoopBanner />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
    expect(screen.queryByText('重试')).toBeNull()
    expect(screen.queryByText('加载 Loop runs 失败')).toBeNull()
  })
})
