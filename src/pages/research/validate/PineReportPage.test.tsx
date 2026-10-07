// @vitest-environment jsdom
/** One Pine script's report (B7) and Run now (S14), Owner 2026-10-06. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PineRunJob, PineSummary } from '@/api/research/pine'

const runPineScript = vi.fn()
const fetchLatestPineRun = vi.fn()
const fetchPineSignalStats = vi.fn()
const fetchPineSummary = vi.fn()
vi.mock('@/api/research/pine', async (orig) => ({
  ...(await orig<typeof import('@/api/research/pine')>()),
  runPineScript: (id: string) => runPineScript(id),
  fetchLatestPineRun: (id: string) => fetchLatestPineRun(id),
  fetchPineSignalStats: (p: unknown) => fetchPineSignalStats(p),
  fetchPineSummary: (id: string) => fetchPineSummary(id),
}))
vi.mock('@/hooks/useBacktestEventQuery', () => ({
  useBacktestRuns: () => ({
    isLoading: false,
    isError: false,
    data: {
      rows: [
        {
          id: 'r1', strategy_template: 'sim:short_put', created_at: '2026-10-01T00:00:00Z',
          event_def: { kind: 'pine_signal', params: { script: 'mine', side: 'buy' } },
          summary: { n_trades: 12, win_rate: 0.75, total_pnl: 340 },
        },
        {
          id: 'r2', strategy_template: 'sim:short_put', created_at: '2026-10-02T00:00:00Z',
          event_def: { kind: 'pine_signal', params: { script: 'other', side: 'buy' } }, summary: {},
        },
        { id: 'r3', strategy_template: 'event:x', created_at: '2026-10-02T00:00:00Z', event_def: { kind: 'pine_signal', params: { script: 'mine' } }, summary: {} },
      ],
    },
  }),
}))

import { researchAuthStore } from '@/lib/auth/researchUser'
import { HttpError } from '@/lib/http'
import PineReportPage, { monthSpan, runsOfScript } from './PineReportPage'
import { pineRunLine } from './PineRunControl'

const SUMMARY: PineSummary = {
  script: { id: 'mine', name: 'My cross', version: 3, origin: 'user', license: null, source_url: null, notes: null, is_active: true, signals: ['buy', 'sell'] },
  built_version: 2,
  first: '2025-11-03',
  last: '2026-02-02',
  signals: 9,
  names: 2,
  by_month: [
    { month: '2025-11', buy: 3, sell: 1 },
    { month: '2026-02', buy: 4, sell: 1 },
  ],
  by_name: [
    { symbol: 'AAA', buy: 5, sell: 1, last: '2026-02-02' },
    { symbol: 'BBB', buy: 2, sell: 1, last: '2025-11-20' },
  ],
  run: null,
}

function stats(side: 'buy' | 'sell') {
  return {
    script: 'mine', side, window: { start: '2021-10-06', end: '2026-10-06' }, symbols: ['AAA', 'BBB'], move_threshold: 0.02,
    signals: side === 'buy' ? 7 : 2, sample_note: 'thin',
    by_horizon: { '20': { signal: { n: 7, win_rate: 0.6, hit_rate: 0.3, avg_return: 0.012 }, baseline: { n: 900, win_rate: 0.5, hit_rate: 0.2, avg_return: 0.004 }, win_rate_edge: 0.1, avg_return_edge: 0.008 } },
    method: { version: 2, cost_bps_one_way: 5 },
    per_symbol: { AAA: { signals: 5, by_horizon: { '20': { n: 5, win_rate: 0.6, hit_rate: 0.2, avg_return: 0.021 } } } },
    recent: [{ symbol: 'AAA', date: side === 'buy' ? '2026-02-02' : '2026-01-15', ret_5: 0.01, ret_10: -0.02, ret_20: null, counted_5: side === 'buy' }],
  }
}

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/research/pine/mine']}>
        <Routes>
          <Route path="/research/pine/:scriptId" element={<PineReportPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const job = (over: Partial<PineRunJob>): PineRunJob => ({
  id: 'pr-1', script_id: 'mine', status: 'running', started_at: '2026-10-06T20:00:00Z', finished_at: null,
  rows: null, mode: null, errors: null, message: null, ...over,
})

describe('helpers', () => {
  it('fills the quiet months so the bars keep time', () => {
    expect(monthSpan(SUMMARY.by_month).map((m) => `${m.month}:${m.buy}`)).toEqual(['2025-11:3', '2025-12:0', '2026-01:0', '2026-02:4'])
    expect(monthSpan([])).toEqual([])
  })

  it('keeps the simulator runs that entered on this script', () => {
    const row = (id: string, template: string, script: string) =>
      ({ id, strategy_template: template, event_def: { kind: 'pine_signal', params: { script } } }) as unknown as Parameters<typeof runsOfScript>[0][number]
    // r2 is another script, r3 an event backtest
    expect(runsOfScript([row('r1', 'sim:short_put', 'mine'), row('r2', 'sim:short_put', 'other'), row('r3', 'event:x', 'mine')], 'mine').map((r) => r.id)).toEqual(['r1'])
  })

  it('says what a run did', () => {
    expect(pineRunLine(job({ status: 'done', finished_at: '2026-10-06T20:01:00Z', rows: 23517, mode: 'rebuild' }))).toMatch(/23,517 signals written \(whole history\)/)
    expect(pineRunLine(job({ status: 'skipped', finished_at: '2026-10-06T20:01:00Z', message: 'another build of this script is running' }))).toMatch(/^Skipped .* another build/)
    expect(pineRunLine(job({ status: 'failed', finished_at: '2026-10-06T20:01:00Z', message: 'pine-runner: URLError' }))).toMatch(/^Failed .* pine-runner/)
  })
})

describe('PineReportPage', () => {
  beforeEach(() => {
    researchAuthStore.setCredentials('tok_owner', 'owner')
    fetchPineSummary.mockResolvedValue(SUMMARY)
    fetchPineSignalStats.mockImplementation(async (p: { side: 'buy' | 'sell'; detail?: boolean }) => {
      expect(p.detail).toBe(true)
      return stats(p.side)
    })
    fetchLatestPineRun.mockResolvedValue(null)
    runPineScript.mockReset()
  })

  it('reads one script on one page', async () => {
    mount()
    expect(await screen.findByRole('heading', { name: 'My cross' })).toBeTruthy()
    // the stored signals are from an older version than the source
    expect(screen.getByText(/the source is v3; Run now rebuilds it/)).toBeTruthy()
    const names = within(await screen.findByRole('region', { name: 'Names' }))
    // AAA's 20-session net after a buy and after a sell
    expect(await names.findAllByText('+2.1%')).toHaveLength(2)
    const latest = within(screen.getByRole('region', { name: 'Latest signals' }))
    const rows = latest.getAllByRole('row').slice(1)
    expect(rows.map((r) => r.textContent?.slice(0, 10))).toEqual(['2026-02-02', '2026-01-15'])
    expect(rows[1].className).toContain('opacity-55')
    const sims = within(screen.getByRole('region', { name: 'Simulations' }))
    expect(sims.getAllByRole('row')).toHaveLength(2)
    expect(sims.getByRole('link', { name: 'Open ↗' }).getAttribute('href')).toBe('/research/backtest?tab=sim&run_id=r1')
  })

  it('runs it now and shows the run', async () => {
    runPineScript.mockResolvedValue(job({}))
    mount()
    await userEvent.click(await screen.findByRole('button', { name: 'Run now' }))
    expect(runPineScript).toHaveBeenCalledWith('mine')
    expect((await screen.findAllByText(/Running since/)).length).toBeGreaterThan(0)
  })

  it('says which run holds the slot on a 409', async () => {
    const body = { detail: 'a run of other is in progress', run: job({ script_id: 'other' }) }
    runPineScript.mockRejectedValue(new HttpError(409, body.detail, { detail: body.detail, body }))
    mount()
    await userEvent.click(await screen.findByRole('button', { name: 'Run now' }))
    expect(await screen.findByText(/Another run is going \(other/)).toBeTruthy()
  })

  it('says so when there is no such script', async () => {
    fetchPineSummary.mockRejectedValue(new HttpError(404, 'pine script mine not found'))
    mount()
    expect(await screen.findByText('No script mine')).toBeTruthy()
  })
})
