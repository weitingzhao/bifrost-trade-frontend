// @vitest-environment jsdom
/**
 * Working orders in the Account control (design Rev .155, Shell Spec §4): the
 * retired market strip's `Open orders N` as a neutral tail on the bar and an
 * Orders tile in the Book centre, both following the account scope.
 *
 * DEV had no working orders when this was built (a weekend), so the orders
 * here are invented.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OpenOrderRow } from '@/types/monitor'
import { setAccountScope } from '@/lib/accountScope'

const HOST = 'U1000001'
const SEC = 'U2000002'

const { statusState, bookState } = vi.hoisted(() => ({
  statusState: { orders: [] as OpenOrderRow[] },
  bookState: { degraded: 0, degradedByAccount: {} as Record<string, number> },
}))

vi.mock('@/hooks/useMonitorStatus', () => ({
  useMonitorStatus: () => ({
    data: {
      config: { ib_client: { account: { event_host: HOST, event_secondary: SEC } } },
      portfolio: { accounts: [], accounts_fetched_at: null, open_orders: statusState.orders },
    },
    dataUpdatedAt: 1_800_000_000_000,
  }),
}))
vi.mock('@/hooks/useBookLive', () => ({
  useBookLive: () => ({
    rows: [],
    totals: {},
    modelDelta: 120,
    modelDegraded: bookState.degraded,
    modelDeltaByAccount: { [HOST]: 70, [SEC]: 50 },
    modelDegradedByAccount: bookState.degradedByAccount,
    quoteAgeSec: null,
    tagOf: (id: string) => (id === HOST ? 'HOST' : id === SEC ? 'SEC' : id.slice(-4)),
    isLoading: false,
  }),
}))
vi.mock('@/hooks/useRiskLimitWatch', () => ({ useRiskLimitWatch: () => ({ breaches: [] }) }))

const { BookControl } = await import('./BookControl')

const ORDERS: OpenOrderRow[] = [
  {
    perm_id: 9001,
    account_id: HOST,
    symbol: 'ACME',
    sec_type: 'OPT',
    action: 'SELL',
    total_quantity: 2,
    remaining: 2,
    limit_price: 1.45,
    status: 'Submitted',
    contract_key: 'ACME|OPT|20261120|120|P',
    updated_ts: 1_800_000_000 - 600,
  },
  {
    perm_id: 9002,
    account_id: SEC,
    symbol: 'WIDG',
    sec_type: 'STK',
    action: 'BUY',
    total_quantity: 50,
    remaining: 50,
    limit_price: 31.2,
    status: 'Submitted',
    contract_key: 'WIDG|STK|||',
    updated_ts: 1_800_000_000 - 60,
  },
]

function renderBar() {
  return render(
    <MemoryRouter initialEntries={['/portfolio/positions']}>
      <BookControl />
    </MemoryRouter>,
  )
}

const trigger = () => screen.getByRole('button', { name: /Account scope/ })
/** The shell's one-popover store outlives a render, so the centre may already be up. */
const openCentre = () => {
  if (trigger().getAttribute('aria-expanded') !== 'true') fireEvent.click(trigger())
}

afterEach(() => {
  cleanup()
  act(() => setAccountScope('all'))
  statusState.orders = []
  bookState.degraded = 0
  bookState.degradedByAccount = {}
})

describe('Account control — working orders (Rev .155)', () => {
  it('shows no order tail while nothing is working', () => {
    renderBar()
    expect(trigger().getAttribute('data-tip')).not.toContain('working order')
    expect(trigger().textContent).toBe('—Δ+120')
  })

  it('tails the bar with a neutral clock and N, and counts the scope', () => {
    statusState.orders = ORDERS
    renderBar()
    expect(trigger().textContent).toContain('2')
    expect(trigger().getAttribute('data-tip')).toContain('◷ 2 working orders at IB')
    const tail = trigger().querySelector('svg circle')?.closest('span')
    expect(tail?.className).toContain('--sk-mute2')
    expect(tail?.className).not.toMatch(/lamp-yellow|loss|warn/)

    act(() => setAccountScope('SEC'))
    expect(trigger().getAttribute('data-tip')).toContain('◷ 1 working order at IB')
  })

  it('opens the Orders tile to the list, contract in sky, rows to Orders & Fills', () => {
    statusState.orders = ORDERS
    renderBar()
    openCentre()
    fireEvent.click(screen.getByTitle('Working orders at IB · 2'))
    const name = screen.getByText("ACME Nov 20'26 PUT 120")
    expect(name.getAttribute('style')).toContain('--sk-contract')
    expect(screen.getByText('SELL 2 · Submitted · HOST')).toBeTruthy()
    expect(screen.getByText('LMT 1.45')).toBeTruthy()
    expect(screen.getByText('BUY 50 · Submitted · SEC')).toBeTruthy()
  })

  it('says so when the scope has none', () => {
    statusState.orders = [ORDERS[0]!]
    act(() => setAccountScope('SEC'))
    renderBar()
    openCentre()
    fireEvent.click(screen.getByTitle('Working orders at IB · 0'))
    expect(screen.getByText('No working orders at IB.')).toBeTruthy()
  })
})

describe('Account control — a Δ without its option legs (TD-260)', () => {
  it('marks the Δ +? and says why, rather than reading the missing legs as 0', () => {
    bookState.degraded = 2
    bookState.degradedByAccount = { [HOST]: 2 }
    renderBar()
    expect(trigger().textContent).toBe('—Δ+120+?')
    expect(trigger().getAttribute('data-tip')).toContain('2 underlyings without option-leg delta — no option quote is served')

    act(() => setAccountScope('SEC'))
    expect(trigger().textContent).toBe('S—Δ+50')
  })
})
