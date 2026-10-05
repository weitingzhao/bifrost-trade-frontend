// @vitest-environment jsdom
/**
 * Signed out, the active-hypothesis summary and the backtest runs answer 401
 * (Research step 4). Their lamps go grey and say why — a red lamp would read
 * as a broken store.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'

const { refuse } = vi.hoisted(() => ({
  refuse: (what: string) => async () => {
    const { HttpError } = await import('@/lib/http')
    throw new HttpError(401, `${what} HTTP 401`)
  },
}))

vi.mock('@/api/researchHypothesis', async (orig) => ({
  ...(await orig<typeof import('@/api/researchHypothesis')>()),
  fetchActiveSummary: refuse('Hypothesis summary'),
}))
vi.mock('@/api/research/backtestEvent', async (orig) => ({
  ...(await orig<typeof import('@/api/research/backtestEvent')>()),
  fetchBacktestRuns: refuse('Backtest runs'),
}))
vi.mock('@/hooks/useResearchHomeData', () => ({
  useResearchHomeData: () => ({ sepaTradeDate: null, totalDiscoveries: 0, isError: false, isLoading: false }),
}))

import { FreshnessLampGrid } from './FreshnessLampGrid'

describe('FreshnessLampGrid — signed out', () => {
  it('greys the two Research lamps and names the missing user', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <FreshnessLampGrid />
        </TooltipProvider>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getAllByText('Not read — Research user not set')).toHaveLength(2))
    expect(container.querySelector('.text-lamp-red')).toBeNull()
  })
})
