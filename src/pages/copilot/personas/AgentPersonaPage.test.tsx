// @vitest-environment jsdom
/**
 * Design 2026-09-15 Q1=A: Personas chrome is English. The UI-language switch
 * is gone. Prompt language lives on the Copilot composer, not this page.
 */
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/api/agentPersona', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/agentPersona')>()
  return {
    ...actual,
    fetchAgentPersonas: vi.fn().mockResolvedValue([]),
  }
})

import { AgentPersonaPage } from '../AgentPersonaPage'

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AgentPersonaPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AgentPersonaPage language', () => {
  it('renders English chrome with no UI-language switch', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Agent Personas' })).toBeTruthy()
    expect(screen.queryByText('界面')).toBeNull()
    expect(screen.queryByText(/为每位 Copilot 专家定义交易人格/)).toBeNull()
    expect(screen.queryByLabelText('UI')).toBeNull()
  })
})
