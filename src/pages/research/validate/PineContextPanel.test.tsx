// @vitest-environment jsdom
/** The Pine library's option context panel lists what Research serves, and says so when it serves nothing. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const fetchPineContext = vi.fn()
vi.mock('@/api/research/pine', async (orig) => ({
  ...(await orig<typeof import('@/api/research/pine')>()),
  fetchPineContext: () => fetchPineContext(),
}))

import { PineContextPanel } from './PineContextPanel'

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <PineContextPanel />
    </QueryClientProvider>,
  )
}

describe('PineContextPanel', () => {
  it('lists each series with its unit, start and note, then the rules', async () => {
    fetchPineContext.mockResolvedValue({
      series: [
        { name: 'IV_RANK', kind: 'symbol', unit: '0-100', description: 'IV30 rank over the last year', history_from: '2025-03-11', note: 'needs 126 sessions', pine: 'request.security("IV_RANK", timeframe.period, close)' },
        { name: 'SPY', kind: 'market', unit: 'price', description: 'SPY daily bars', history_from: '2020-01-02', note: '', pine: 'request.security("SPY", timeframe.period, close)' },
      ],
      rules: { warm_up: 'signals are stored from 100 sessions after…', missing_day: 'carries the last value for up to 5 sessions, then na' },
    })
    mount()
    expect(await screen.findByText('IV_RANK')).toBeTruthy()
    expect(screen.getByText('2025-03-11')).toBeTruthy()
    expect(screen.getByText('needs 126 sessions')).toBeTruthy()
    expect(screen.getByText('· market')).toBeTruthy()
    const rules = screen.getAllByRole('term').map((t) => t.textContent)
    expect(rules).toEqual(['Missing day', 'Warm-up'])
  })

  it('says an older Research serves no context', async () => {
    fetchPineContext.mockRejectedValue(new Error('404'))
    mount()
    expect(await screen.findByText('The context series did not load')).toBeTruthy()
  })
})
