// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/http'

const tryPineScript = vi.fn()
vi.mock('@/api/research/pine', async (orig) => ({
  ...(await orig<typeof import('@/api/research/pine')>()),
  tryPineScript: (input: unknown) => tryPineScript(input),
}))

import { pineIssuesOf } from '@/api/research/pine'
import { PineTryPanel } from './PineTryPanel'

const hz = (n: number, edge: number, lo: number, hi: number) => ({
  signal: { n, win_rate: 0.55, hit_rate: null, avg_return: 0.004 },
  baseline: { n: 1000, win_rate: 0.5, hit_rate: null, avg_return: 0.001 },
  win_rate_edge: 0.05,
  avg_return_edge: edge,
  ci90: { avg_return_edge: [lo, hi] },
})

function mount(onIssues = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <PineTryPanel source={'//@version=5\nindicator("t")\nplotshape(close > open, "buy")'} canRun onIssues={onIssues} />
    </QueryClientProvider>,
  )
  return onIssues
}

describe('PineTryPanel', () => {
  it('tries the resident basket by default and shows each side by horizon', async () => {
    tryPineScript.mockResolvedValue({
      window: { start: '2024-10-02', end: '2026-10-02' },
      basket: 'resident',
      horizons: [5, 20],
      cost_bps: 10,
      context: ['VRP_20'],
      symbols: [
        { symbol: 'SPY', buy: 4, sell: 0 },
        { symbol: 'BAD', buy: 0, sell: 0, error: 'foo is not defined', line: 4 },
      ],
      stats: {
        buy: { signals: 4, sample_note: 'noise', by_horizon: { '5': hz(4, 0.003, -0.002, 0.008), '20': hz(4, 0.012, 0.002, 0.02) } },
        sell: { signals: 0, sample_note: 'noise', by_horizon: {} },
      },
    })
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'Try' }))
    expect(tryPineScript).toHaveBeenCalledWith(expect.objectContaining({ basket: 'resident', days: 730 }))
    expect(await screen.findByText(/2024-10-02 → 2026-10-02 · 2 names · 1 fired · reads VRP_20/)).toBeTruthy()
    expect(screen.getByText('+1.20%')).toBeTruthy()
    expect(screen.getByText('BAD: foo is not defined (line 4)')).toBeTruthy()
  })

  it('sends a custom list, and hands the named lines of a refused script to the editor', async () => {
    const body = { detail: 'the script has 1 problem; line 3: …', issues: [{ line: 3, col: 11, message: 'line 3 ends with `+`' }] }
    tryPineScript.mockRejectedValue(new HttpError(400, 'the script has 1 problem; line 3: …', { detail: body.detail, body }))
    const onIssues = mount()
    await userEvent.click(screen.getByRole('button', { name: 'My list' }))
    await userEvent.type(screen.getByLabelText('Symbols to try'), 'aapl, msft nvda')
    await userEvent.click(screen.getByRole('button', { name: 'Try' }))
    expect(tryPineScript).toHaveBeenLastCalledWith(expect.objectContaining({ symbols: ['AAPL', 'MSFT', 'NVDA'] }))
    expect(await screen.findByText('The try did not run')).toBeTruthy()
    expect(onIssues).toHaveBeenLastCalledWith([{ line: 3, col: 11, message: 'line 3 ends with `+`' }])
  })

  it('reads issues only from a Research refusal', () => {
    expect(pineIssuesOf(new Error('x'))).toEqual([])
    expect(pineIssuesOf(new HttpError(500, 'x', { body: { detail: 'x' } }))).toEqual([])
    expect(pineIssuesOf(new HttpError(400, 'x', { body: { issues: [{ line: 2, message: 'm' }, { bad: 1 }] } }))).toEqual([{ line: 2, col: 1, message: 'm' }])
  })
})
