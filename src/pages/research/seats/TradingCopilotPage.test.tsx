// @vitest-environment jsdom
/**
 * Design 2026-09-15 Q1=A: catalogue labels stay English when prompt lang is zh.
 */
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TRADE_QUESTIONS } from '@/lib/copilot/tradePrompts'
import { writeCopilotPromptLang } from '@/lib/copilot/promptLang'

vi.mock('@/hooks/useMonitorStatus', () => ({
  useMonitorStatus: () => ({
    isLoading: false,
    data: { portfolio: { accounts: [], open_orders: [] } },
  }),
}))
vi.mock('@/hooks/useGateSafety', () => ({
  useGateSafetyList: () => ({ isLoading: false, data: { items: [] } }),
}))
vi.mock('@/hooks/useExecutions', () => ({
  useExecutionsFinal: () => ({ isLoading: false, data: { items: [] } }),
}))
vi.mock('@/hooks/useCopilotTools', () => ({
  useCopilotTools: () => ({ data: { tools: [] } }),
}))

import TradingCopilotPage from './TradingCopilotPage'

describe('TradingCopilotPage language', () => {
  it('shows English group and question labels when prompt language is zh', () => {
    writeCopilotPromptLang('zh')
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <TradingCopilotPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    // «Book starters» since Rev 2026-09-21.1 — the design's own ROUTES word,
    // and §5a.5 ties the h1 to it.
    expect(screen.getByRole('heading', { name: 'Book starters' })).toBeTruthy()
    expect(screen.getByText('The book')).toBeTruthy()
    expect(screen.getByText('Open orders')).toBeTruthy()
    expect(screen.getByText('Gates armed')).toBeTruthy()
    expect(screen.getByText('Positions & risk')).toBeTruthy()
    expect(screen.queryByText('持仓')).toBeNull()
    expect(screen.queryByText('交易副驾')).toBeNull()
    for (const q of TRADE_QUESTIONS) {
      expect(screen.getByText(q.label.en)).toBeTruthy()
      expect(screen.queryByText(q.label.zh)).toBeNull()
    }
    expect(screen.getByRole('button', { name: new RegExp(TRADE_QUESTIONS[0].label.en) }).getAttribute('title')).toBe(
      TRADE_QUESTIONS[0].prompt.zh,
    )
  })
})
