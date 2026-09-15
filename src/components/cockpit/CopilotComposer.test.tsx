// @vitest-environment jsdom
/**
 * The composer no longer picks a model — Settings does. This test fails if
 * a Model combobox comes back onto the footer.
 */
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CopilotComposer } from './CopilotComposer'
import { writeCopilotPromptLang } from '@/lib/copilot/promptLang'

vi.mock('@/hooks/useCockpitPins', () => ({
  useCockpitPins: () => ({ focusedHypothesisId: null, hypothesisIds: [] }),
}))
vi.mock('@/hooks/useResearchDrafts', () => ({
  useRunMorningAgent: () => ({ isPending: false, mutate: vi.fn() }),
  useRunEodAgent: () => ({ isPending: false, mutate: vi.fn() }),
}))
vi.mock('@/hooks/useLoopHarness', () => ({
  useActiveObjectives: () => ({ data: { items: [] } }),
  useAwaitingRuns: () => ({ data: { items: [] } }),
  useRunObjective: () => ({ isPending: false, mutate: vi.fn() }),
  useCurateRun: () => ({ isPending: false, mutate: vi.fn() }),
}))
vi.mock('@/api/aiCopilot', () => ({
  fetchCopilotUsage: vi.fn().mockResolvedValue({
    tokens_today: 1,
    cost_estimate_usd: 0.12,
    cap_usd: 6,
    remaining_usd: 5.88,
  }),
}))

describe('CopilotComposer', () => {
  it('has Run, language, Send, and a spend hint — no Model combobox', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <CopilotComposer model="deepseek-chat" onSend={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByRole('button', { name: 'Run' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: 'Model' })).toBeNull()
    expect(screen.getByTestId('copilot-spend-hint')).toBeTruthy()
  })

  it('keeps the placeholder in English when prompt language is zh', () => {
    writeCopilotPromptLang('zh')
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <CopilotComposer model="deepseek-chat" onSend={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const ph = screen.getByTestId('copilot-composer-input').getAttribute('placeholder') ?? ''
    expect(ph).toMatch(/Ask about positions/)
    expect(ph).not.toMatch(/[\u4e00-\u9fff]/)
  })
})
