// @vitest-environment jsdom
/**
 * The one write on the desk. These tests are about what it takes to fire it.
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/monitor', () => ({
  postSuspend: vi.fn(async () => ({ ok: true })),
  postResume: vi.fn(async () => ({ ok: true })),
  postFlatten: vi.fn(async () => ({ ok: true })),
}))

import { postFlatten, postResume, postSuspend } from '@/api/monitor'
import { HedgeMenu } from './HedgeMenu'
import { hedgeFacts, hedgeReading } from './hedgeModel'
import type { StatusResponse } from '@/types/monitor'

const suspend = vi.mocked(postSuspend)
const resume = vi.mocked(postResume)
const flatten = vi.mocked(postFlatten)

function status(p: { alive?: boolean; suspended?: boolean } = {}): StatusResponse {
  return {
    daemon: {
      heartbeat: { daemon_alive: p.alive ?? true },
      trading: {
        trading_suspended: p.suspended ?? false,
        auto_status: { daemon_state: 'running_suspended', config_summary: 'paper_trade=True' },
      },
    },
  } as unknown as StatusResponse
}

function renderMenu(s: StatusResponse = status()) {
  render(
    <MemoryRouter>
      <HedgeMenu status={s} onChanged={() => undefined} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  suspend.mockClear()
  resume.mockClear()
  flatten.mockClear()
})

describe('HedgeMenu · opening it writes nothing', () => {
  it('posts nothing when the menu is opened', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('button', { name: /Hedge/ }))
    expect(screen.getByRole('menu', { name: 'Hedging' })).toBeTruthy()
    expect(suspend).not.toHaveBeenCalled()
    expect(resume).not.toHaveBeenCalled()
    expect(flatten).not.toHaveBeenCalled()
  })

  it('offers resume, not suspend, on a daemon that is already suspended', async () => {
    renderMenu(status({ suspended: true }))
    await userEvent.click(screen.getByRole('button', { name: /Hedge suspended/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: /Resume hedging/ }))
    expect(resume).toHaveBeenCalledTimes(1)
    expect(suspend).not.toHaveBeenCalled()
  })

  it('will not suspend a daemon that is not running', async () => {
    renderMenu(status({ alive: false }))
    await userEvent.click(screen.getByRole('button', { name: /Hedge not running/ }))
    expect(screen.getByRole('menuitem', { name: /Suspend hedging/ }).hasAttribute('disabled')).toBe(true)
  })
})

describe('HedgeMenu · flatten', () => {
  async function openFlatten() {
    renderMenu()
    await userEvent.click(screen.getByRole('button', { name: /Hedge/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: /Emergency flatten/ }))
  }

  it('holds the confirm shut until the consequence is acknowledged', async () => {
    // Suspend and resume change what the daemon will do next. This one asks it
    // to act in the market now, and it is the only one that cannot be undone
    // from here.
    await openFlatten()
    const send = screen.getByRole('button', { name: 'Send flatten' })
    expect(send.hasAttribute('disabled')).toBe(true)
    await userEvent.click(send)
    expect(flatten).not.toHaveBeenCalled()

    await userEvent.click(screen.getByLabelText(/Acknowledge that flatten executes/))
    expect(screen.getByRole('button', { name: 'Send flatten' }).hasAttribute('disabled')).toBe(false)
  })

  it('names the endpoint and the consumer before it is sent', async () => {
    await openFlatten()
    // Scoped to the dialog: the menu item behind it names the endpoint too,
    // which is the point — you can see where it goes before you open it.
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('POST /control/flatten')).toBeTruthy()
    expect(dialog.getByText(/hedge process · next heartbeat/)).toBeTruthy()
    expect(dialog.getByText(/D10 · owner-only/)).toBeTruthy()
  })

  it('sends once, and only after the acknowledgement', async () => {
    await openFlatten()
    await userEvent.click(screen.getByLabelText(/Acknowledge that flatten executes/))
    await userEvent.click(screen.getByRole('button', { name: 'Send flatten' }))
    expect(flatten).toHaveBeenCalledTimes(1)
  })

  it('forgets the acknowledgement when the dialog is cancelled', async () => {
    await openFlatten()
    await userEvent.click(screen.getByLabelText(/Acknowledge that flatten executes/))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.click(screen.getByRole('menuitem', { name: /Emergency flatten/ }))
    expect(screen.getByRole('button', { name: 'Send flatten' }).hasAttribute('disabled')).toBe(true)
  })
})

describe('hedgeReading', () => {
  it('reads paper_trade out of the daemon’s own config summary', () => {
    expect(hedgeReading(status()).paperTrade).toBe(true)
  })

  it('does not claim paper or live when the daemon reported no summary', () => {
    expect(hedgeReading(undefined).paperTrade).toBeNull()
  })
})

describe('the hedge daemon reading, moved from System › Daemon', () => {
  const withAuto = (auto: Record<string, unknown>) =>
    ({ daemon: { heartbeat: { daemon_alive: true }, trading: { auto_status: auto } } }) as unknown as StatusResponse

  it("prints the daemon's own fields, and a dash where it reported nothing", () => {
    // The shape DEV answered on 2026-09-25: booted, suspended, nothing held.
    const facts = hedgeFacts(
      withAuto({ trading_state: 'BOOT', symbol: null, spot: null, stock_position: null, net_delta: null, daily_hedge_count: 0, daily_pnl: 0, ts: 1790324303.14 }),
    )
    expect(Object.fromEntries(facts.map((f) => [f.label, f.value]))).toEqual({
      'Trading state': 'BOOT',
      'Symbol · spot': '—',
      'Stock position': '—',
      'Net Δ': '—',
      'Hedges today': '0',
      'Hedge P&L today': '$0.00',
      'As of': '08:18:23Z',
    })
  })

  it('reads a hedged name with its spot, and a loss with its sign', () => {
    const facts = hedgeFacts(withAuto({ symbol: 'NVDA', spot: 181.5, daily_pnl: -42.1, daily_hedge_count: 3 }))
    const v = Object.fromEntries(facts.map((f) => [f.label, f.value]))
    expect(v['Symbol · spot']).toBe('NVDA · $181.50')
    expect(v['Hedge P&L today']).toBe('−$42.10')
    expect(v['Hedges today']).toBe('3')
  })

  it('shows the reading inside the menu, above the controls', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('button', { name: /Hedge/ }))
    expect(screen.getByLabelText('Hedge daemon reading')).toBeTruthy()
  })
})
