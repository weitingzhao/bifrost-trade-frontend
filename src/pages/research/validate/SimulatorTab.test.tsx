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
const fetchResearchHealth = vi.fn()

vi.mock('@/api/research/backtestSim', async (orig) => ({
  ...(await orig<typeof import('@/api/research/backtestSim')>()),
  fetchSimDetail: (id: string) => fetchSimDetail(id),
  postSim: (input: unknown) => postSim(input),
}))

vi.mock('@/api/research/health', () => ({ fetchResearchHealth: () => fetchResearchHealth() }))
vi.mock('@/api/research/pine', async (orig) => ({
  ...(await orig<typeof import('@/api/research/pine')>()),
  fetchPineScripts: async () => ({
    scripts: [
      { id: 'supertrend', name: 'Supertrend', version: 1, origin: 'bifrost', license: null, source_url: null, notes: null, is_active: true, signals: ['buy', 'sell'], plots: ['Supertrend'], overlay: true },
    ],
    count: 1,
  }),
}))

import { researchAuthStore } from '@/lib/auth/researchUser'
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
    researchAuthStore.setCredentials('t', 'tester')
    renderTab({ rows: [], builderOpen: true })
    await userEvent.click(screen.getByRole('button', { name: /Run simulation/ }))
    expect(await screen.findByText('This run was not stored')).toBeTruthy()
    expect(postSim.mock.calls[0][0]).toMatchObject({
      symbols: ['SPY'],
      structure: 'put_credit_spread',
      profit_take_pct: 0.5,
    })
  })

  it('says a stored signal run carries no schedule comparison (Rev .160 Q3)', async () => {
    fetchSimDetail.mockResolvedValue({ row, trades: [], equity: [] })
    const signalRow = {
      ...row,
      id: 'bt_sim_pine0001',
      event_def: { kind: 'pine_signal', params: { script: 'supertrend', side: 'buy', offset_sessions: 0, symbols: ['SPY'] } },
      summary: { ...summary, entry_timing: { version: 2, anchor: 'session_after_signal' } },
    } as unknown as BacktestRunRow
    renderTab({ rows: [signalRow] })
    expect(await screen.findByText(/Signal entry vs schedule is not stored with a run/)).toBeTruthy()
    expect(screen.getAllByText(/Pine Supertrend buy \+1/).length).toBeGreaterThan(0)
  })

  it('shows no such line for a schedule run', async () => {
    fetchSimDetail.mockResolvedValue({ row, trades: [], equity: [] })
    renderTab()
    await screen.findAllByText(/every 5|Put credit spread/)
    expect(screen.queryByText(/is not stored with a run/)).toBeNull()
  })

  it('greys Run without a Research identity, says why and offers Set user', () => {
    researchAuthStore.clear()
    renderTab({ rows: [], builderOpen: true })
    expect((screen.getByRole('button', { name: /Run simulation/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('A run needs a Research user — none is set in this browser.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Set user' })).toBeTruthy()
  })

  it.each([
    ['0.175.0', 0],
    ['0.174.1', 1],
  ])('a Pine entry 1 session after the signal posts offset for research %s as %i', async (version, offset) => {
    fetchResearchHealth.mockResolvedValue({ status: 'ok', version })
    postSim.mockReset()
    postSim.mockResolvedValue({
      run_id: null,
      run: { persisted: false },
      summary,
      trades: [],
      equity: [],
      params: {},
      advisory: '',
    })
    researchAuthStore.setCredentials('t', 'tester')
    renderTab({ rows: [], builderOpen: true })
    await userEvent.click(screen.getByRole('button', { name: 'Pine script' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Compare with the schedule/ }))
    const run = screen.getByRole('button', { name: /Run simulation/ }) as HTMLButtonElement
    await vi.waitFor(() => expect(run.disabled).toBe(false))
    await userEvent.click(run)
    await vi.waitFor(() => expect(postSim).toHaveBeenCalled())
    expect(postSim.mock.calls[0][0]).toMatchObject({
      entry_event: { kind: 'pine_signal', params: { script: 'supertrend', side: 'buy' } },
      entry_offset_sessions: offset,
    })
    researchAuthStore.clear()
  })

  it('a Pine run asks for the script’s exit and a strike at its line; the schedule baseline asks for neither', async () => {
    fetchResearchHealth.mockResolvedValue({ status: 'ok', version: '0.183.0' })
    postSim.mockReset()
    postSim.mockResolvedValue({ run_id: null, run: { persisted: false }, summary, trades: [], equity: [], params: {}, advisory: '' })
    researchAuthStore.setCredentials('t', 'tester')
    renderTab({ rows: [], builderOpen: true })
    await userEvent.click(screen.getByRole('button', { name: 'Pine script' }))
    await userEvent.click(screen.getByRole('button', { name: '+ Pine exit' }))
    await userEvent.click(screen.getByRole('button', { name: 'At a Pine line' }))
    const run = screen.getByRole('button', { name: /Run simulation/ }) as HTMLButtonElement
    await vi.waitFor(() => expect(run.disabled).toBe(false))
    await userEvent.click(run)
    await vi.waitFor(() => expect(postSim).toHaveBeenCalledTimes(2))
    expect(postSim.mock.calls[0][0]).toMatchObject({
      entry_event: { kind: 'pine_signal', params: { script: 'supertrend', side: 'buy' } },
      pine_exit: 'auto',
      strike_anchor: { plot: 'Supertrend', min_delta: 0.1, max_delta: 0.35 },
    })
    // the schedule baseline has no Pine entry, so research would refuse either option
    expect(postSim.mock.calls[1][0]).not.toHaveProperty('pine_exit')
    expect(postSim.mock.calls[1][0]).not.toHaveProperty('strike_anchor')
    expect(postSim.mock.calls[1][0]).not.toHaveProperty('entry_event')
    researchAuthStore.clear()
  })

  it('a two-sided structure offers no line: it says why where the choice is made and still runs, by Δ', async () => {
    fetchResearchHealth.mockResolvedValue({ status: 'ok', version: '0.183.0' })
    postSim.mockReset()
    postSim.mockResolvedValue({ run_id: null, run: { persisted: false }, summary, trades: [], equity: [], params: {}, advisory: '' })
    researchAuthStore.setCredentials('t', 'tester')
    renderTab({ rows: [], builderOpen: true })
    await userEvent.click(screen.getByRole('button', { name: 'Pine script' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Compare with the schedule/ }))
    await userEvent.click(screen.getByRole('button', { name: 'At a Pine line' }))
    expect(screen.queryByLabelText('Short Δ')).toBeNull() // the line places the strike
    await userEvent.click(screen.getByRole('button', { name: 'Short strangle' }))
    expect(screen.queryByRole('button', { name: 'At a Pine line' })).toBeNull()
    expect(screen.getByText(/Short strike by Δ — a Pine line places one short strike/)).toBeTruthy()
    expect(screen.getByLabelText('Short Δ')).toBeTruthy()
    const run = screen.getByRole('button', { name: /Run simulation/ }) as HTMLButtonElement
    await vi.waitFor(() => expect(run.disabled).toBe(false))
    await userEvent.click(run)
    await vi.waitFor(() => expect(postSim).toHaveBeenCalledTimes(1))
    expect(postSim.mock.calls[0][0]).not.toHaveProperty('strike_anchor')
    // back on a one-sided structure the line choice is still there
    await userEvent.click(screen.getByRole('button', { name: 'Call credit spread' }))
    expect(screen.getByText(/The short call goes at the first strike at or above the line’s value/)).toBeTruthy()
    researchAuthStore.clear()
  })

  it('shows a stored Pine-exit run beside its premium-rules-only twin', async () => {
    fetchSimDetail.mockResolvedValue({ row, trades: [], equity: [] })
    const side = { n_trades: 4, win_rate: 0.5, total_pnl: -47, avg_pnl: -12, avg_days_held: 15, worst_trade: -455, max_drawdown: -1640 }
    const pineRow = {
      ...row,
      id: 'bt_sim_pine0002',
      event_def: { kind: 'pine_signal', params: { script: 'supertrend', side: 'buy', offset_sessions: 0, symbols: ['QQQ'] } },
      summary: {
        ...summary,
        exit_reasons: { profit_take: 2, dte_exit: 1, pine_exit: 1 },
        pine: { script: 'supertrend', exit_mode: 'auto', exit_mode_used: 'reverse_plot', errors: {} },
        pine_exit_comparison: {
          premium_only: { ...side, exit_reasons: { profit_take: 2, dte_exit: 2 } },
          with_pine_exit: { ...side, total_pnl: -1013, avg_pnl: -253, avg_days_held: 9.5, exit_reasons: { profit_take: 2, dte_exit: 1, pine_exit: 1 } },
          delta: { total_pnl: -966 },
          paired: { n: 4, exits_changed: 1, avg_pnl_diff: -241.5, avg_pnl_diff_ci95: null, only_premium_only: 0, only_with_pine_exit: 0 },
        },
      },
    } as unknown as BacktestRunRow
    renderTab({ rows: [pineRow] })
    const panel = await screen.findByRole('region', { name: 'Compared with' })
    expect(panel.textContent).toContain('stored with the run · same entries, only the exit differs')
    expect(panel.textContent).toContain('−$966')
    expect(panel.textContent).toContain('Paired 4 · too few')
    expect(screen.getAllByText(/Pine Supertrend buy .* · Pine exit/).length).toBeGreaterThan(0)
    // four pairs: too few to colour the differences
    expect(panel.querySelector('.text-profit, .text-loss, [class*="color-loss"], [class*="color-profit"]')).toBeNull()
    // the schedule page is there too, and says a stored run has none
    await userEvent.click(screen.getByRole('button', { name: 'Schedule entry' }))
    expect(panel.textContent).toContain('Signal entry vs schedule is not stored with a run')
  })

  it('a run that was not stored does not say its comparison is stored with it', async () => {
    fetchResearchHealth.mockResolvedValue({ status: 'ok', version: '0.183.0' })
    const side = { n_trades: 4, win_rate: 0.5, total_pnl: -212, avg_pnl: -53, avg_days_held: 14.8, worst_trade: -455, max_drawdown: -1750 }
    postSim.mockReset()
    postSim.mockResolvedValue({
      run_id: null,
      run: { persisted: false },
      summary: {
        ...summary,
        exit_reasons: { profit_take: 2, dte_exit: 1, pine_exit: 1 },
        pine_exit_comparison: {
          premium_only: side,
          with_pine_exit: { ...side, total_pnl: -1157, avg_pnl: -289, exit_reasons: { pine_exit: 1 } },
          delta: {},
          paired: { n: 4, exits_changed: 1, avg_pnl_diff: -236, avg_pnl_diff_ci95: null, only_premium_only: 0, only_with_pine_exit: 0 },
        },
      },
      trades: [],
      equity: [],
      params: {},
      advisory: '',
    })
    researchAuthStore.setCredentials('t', 'tester')
    renderTab({ rows: [], builderOpen: true })
    await userEvent.click(screen.getByRole('button', { name: 'Pine script' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Compare with the schedule/ }))
    await userEvent.click(screen.getByRole('button', { name: '+ Pine exit' }))
    const run = screen.getByRole('button', { name: /Run simulation/ }) as HTMLButtonElement
    await vi.waitFor(() => expect(run.disabled).toBe(false))
    await userEvent.click(run)
    const panel = await screen.findByRole('region', { name: 'Compared with' })
    expect(screen.getByText('This run was not stored')).toBeTruthy()
    expect(panel.textContent).toContain('same entries, only the exit differs')
    expect(panel.textContent).not.toContain('stored with the run')
    researchAuthStore.clear()
  })
})
