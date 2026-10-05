// @vitest-environment jsdom
/**
 * The Simulator tab reads a stored sim run's trades and curve, and says so
 * when a fresh run was not stored (tables not applied yet).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { BacktestRunRow } from '@/api/research/backtestEvent'
import type { SimResponse } from '@/api/research/backtestSim'

const fetchSimDetail = vi.fn()
const postSim = vi.fn()

vi.mock('@/api/research/backtestSim', async (orig) => ({
  ...(await orig<typeof import('@/api/research/backtestSim')>()),
  fetchSimDetail: (id: string) => fetchSimDetail(id),
  postSim: (input: unknown) => postSim(input),
}))

import { SimulatorTab } from './SimulatorTab'

const summary = {
  n_trades: 12,
  win_rate: 0.75,
  total_pnl: 640,
  avg_pnl: 53.3,
  median_pnl: 60,
  avg_pnl_ci95: [10, 90] as [number, number],
  avg_credit: 110,
  avg_days_held: 14.5,
  worst_trade: -220,
  exit_reasons: { profit_take: 9, stop: 3 },
  max_drawdown: -300,
  max_drawdown_pct: -0.003,
  sharpe_annual: 1.2,
  peak_margin: 2400,
  return_on_peak_margin: 0.27,
  sample_note: 'thin' as const,
  fill_basis: 'vwap+tiered_slippage×1.0',
}

const row = {
  id: 'bt_sim_abcdef12',
  hypothesis_id: null,
  event_def: { kind: 'schedule', params: { symbols: ['SPY'] } },
  strategy_template: 'sim:put_credit_spread',
  fill_config: {},
  lookback_years: 1,
  summary,
  walk_forward: null,
  benchmark: null,
  created_at: '2026-10-05T19:00:00+00:00',
} as unknown as BacktestRunRow

const trade = {
  seq: 1,
  symbol: 'SPY',
  structure: 'put_credit_spread',
  entry_date: '2025-01-02',
  exit_date: '2025-01-16',
  exit_reason: 'profit_take',
  legs: [
    {
      label: 'short',
      ticker: 'O:A',
      right: 'P',
      side: 'sell',
      strike: 560,
      expiry: '2025-02-21',
      qty: 1,
      entry_fill: 2,
      exit_fill: 1,
      entry_iv: 0.2,
      entry_delta: -0.2,
    },
    {
      label: 'wing',
      ticker: 'O:B',
      right: 'P',
      side: 'buy',
      strike: 532,
      expiry: '2025-02-21',
      qty: 1,
      entry_fill: 0.8,
      exit_fill: 0.4,
      entry_iv: 0.25,
      entry_delta: -0.08,
    },
  ],
  entry_credit: 120,
  exit_debit: -60,
  pnl: 58.7,
  max_loss: 2680,
  margin: 2680,
  days_held: 14,
  mfe: 60,
  mae: -10,
  fill_basis: 'vwap+tiered_slippage×1.0',
}

function renderTab(props: Partial<Parameters<typeof SimulatorTab>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SimulatorTab
          rows={[row]}
          loading={false}
          error={null}
          hasData
          onRetry={() => {}}
          builderOpen={false}
          onBuilderClose={() => {}}
          selectedId={null}
          onSelect={() => {}}
          heldSymbol=""
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Simulator tab', () => {
  it('shows a stored run with its trades and the thin-sample flag', async () => {
    fetchSimDetail.mockResolvedValue({
      row,
      trades: [trade],
      equity: [
        { as_of: '2025-01-02', equity: 100000, margin_used: 2680, open_positions: 1 },
        { as_of: '2025-01-16', equity: 100058.7, margin_used: 0, open_positions: 0 },
      ],
    })
    renderTab()
    expect(await screen.findByText('+532P −560P')).toBeTruthy()
    expect(fetchSimDetail).toHaveBeenCalledWith('bt_sim_abcdef12')
    expect(screen.getByText(/thin · under 30 trades/)).toBeTruthy()
    expect(screen.getByText('95% CI $10 to $90')).toBeTruthy()
  })

  it('says when a fresh run was not stored', async () => {
    const res: SimResponse = {
      run_id: null,
      run: { persisted: false, error: 'column "engine" does not exist' },
      summary: summary as SimResponse['summary'],
      trades: [trade] as SimResponse['trades'],
      equity: [],
      params: {},
      advisory: 'D10 BLOCKED — historical replay only',
    }
    postSim.mockResolvedValue(res)
    renderTab({ rows: [], builderOpen: true })
    await userEvent.click(screen.getByRole('button', { name: /Run simulation/ }))
    expect(await screen.findByText('This run was not stored')).toBeTruthy()
    expect(postSim.mock.calls[0][0]).toMatchObject({
      symbols: ['SPY'],
      structure: 'put_credit_spread',
      profit_take_pct: 0.5,
    })
  })
})
