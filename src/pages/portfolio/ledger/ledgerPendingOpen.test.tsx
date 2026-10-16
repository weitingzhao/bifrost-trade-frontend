/**
 * Open options with TWS fills Flex has not confirmed (core 0.61.0 on_the_fly). 2026-10-16: seven
 * Flex fills netted -2 on one contract, IB had -1 after an intraday buy, and the Ledger showed -2.
 * The pending buy now joins the same contract row (not a second one, though TWS pads the OCC root
 * differently), the row says so and compares itself with IB. Accounts, ids and prices are invented.
 */
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { optGroupsForView } from './ledgerContractGroups'
import { LedgerOpenOptionSection } from './LedgerOpenOptionSection'
import { getOptGroupKey } from '@/utils/ledger/ledgerOptHelpers'
import { pendingTwsFills } from '@/utils/ledger/pendingFills'

const ACCT = 'U0000001'
const FLEX_KEY = 'ZQ    261120C00245000|OPT|20261120|245.0|C'

function flex(id: number, side: 'BUY' | 'SELL', qty: number, day: string): Execution {
  return {
    account_executions_id: id, exec_id: `f.${id}`, account_id: ACCT, symbol: 'ZQ    261120C00245000',
    sec_type: 'OPT', side, quantity: side === 'SELL' ? -qty : qty, price: 3.5, commission: 1,
    expiry: '20261120', strike: 245, option_right: 'C', contract_key: FLEX_KEY, trade_date: day,
    time: Date.parse(`${day}T15:00:00Z`) / 1000, source: 'flex_trades',
  } as Execution
}

// buys 2+1+1+1+2 = 7, sells 4+5 = 9: net -2
const BOOK: Execution[] = [
  flex(6056, 'SELL', 5, '2026-08-27'), flex(7303, 'BUY', 2, '2026-09-14'), flex(8492, 'BUY', 1, '2026-10-06'),
  flex(8493, 'BUY', 1, '2026-10-06'), flex(8494, 'SELL', 4, '2026-10-06'), flex(8771, 'BUY', 1, '2026-10-14'),
  flex(8772, 'BUY', 2, '2026-10-15'),
]
const TWS_BUY = {
  account_executions_id: -6227, exec_id: 't.1', account_id: ACCT, symbol: 'ZQ', sec_type: 'OPT', side: 'BOT',
  quantity: 1, price: 4, commission: 1, expiry: '20261120', strike: 245, option_right: 'C',
  contract_key: 'ZQ  261120C00245000|OPT|20261120|245.0|C', trade_date: null,
  time: Date.parse('2026-10-16T16:54:01Z') / 1000, source: 'tws_client',
} as Execution

const all = () => true

describe('open option groups with pending fills', () => {
  it('the pending buy joins the Flex contract: one row, net -1, eight fills', () => {
    const pending = pendingTwsFills(BOOK, [TWS_BUY])
    const groups = optGroupsForView([...BOOK, ...pending], all, new Set([...BOOK, ...pending]))
    expect(groups).toHaveLength(1)
    expect(groups[0].net_qty).toBe(-1)
    expect(groups[0].trades).toHaveLength(8)
    expect(groups[0].trades.filter(t => t.pending).map(t => t.account_executions_id)).toEqual([-6227])
  })

  it('the Flex-only groups (Summary, Closed) are unchanged by it', () => {
    const groups = optGroupsForView(BOOK, all, new Set(BOOK))
    expect(groups[0].net_qty).toBe(-2)
    expect(groups[0].trades.some(t => t.pending)).toBe(false)
  })
})

function renderOpen(ib: number | null, expanded: boolean) {
  const pending = pendingTwsFills(BOOK, [TWS_BUY])
  const groups = optGroupsForView([...BOOK, ...pending], all, new Set([...BOOK, ...pending]))
  const key = getOptGroupKey(groups[0])
  render(
    <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter>
    <LedgerOpenOptionSection
      openActiveGroups={groups}
      openExpiredGroups={[]}
      openExpandedGroups={expanded ? groups : []}
      expandedDetailKeys={expanded ? [key] : []}
      toggleDetailExpand={() => {}}
      linkByOptionId={{}}
      ibNetForGroup={() => ib}
      onEdit={() => {}}
    />
    </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LedgerOpenOptionSection', () => {
  it('shows the pending count and a check when the net quantity matches IB', () => {
    renderOpen(-1, false)
    expect(screen.getByText('1 pending')).toBeTruthy()
    expect(screen.getByText('✓ IB')).toBeTruthy()
  })

  it("shows IB's figure when they differ", () => {
    renderOpen(-2, false)
    expect(screen.getByText('IB -2')).toBeTruthy()
  })

  it('shows no IB figure without a snapshot', () => {
    renderOpen(null, false)
    expect(screen.queryByText(/IB/)).toBeNull()
  })

  it('dims the pending fill in the details, tags it and offers no actions on it', () => {
    renderOpen(-1, true)
    const tags = screen.getAllByText('pending')
    expect(tags).toHaveLength(1)
    const row = tags[0].closest('tr')!
    expect(row.className).toContain('opacity-70')
    expect(within(row).getByTitle('Actions open once Flex confirms this fill')).toBeTruthy()
    expect(within(row).getByText('16OCT26')).toBeTruthy()
  })
})
