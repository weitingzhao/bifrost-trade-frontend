/**
 * Share fills Flex has not confirmed (core 0.61.0 on_the_fly), on the share tabs. 2026-10-16: a
 * same-day sale was in IB and not in the Ledger. It is now listed with the Flex fills, dimmed and
 * tagged, without actions, and the Summary keeps it out of its figures and names it on one line.
 * Accounts, ids, quantities and prices are invented.
 */
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LedgerStkTable } from './LedgerStkTable'
import { LedgerSummarySection } from './LedgerSummarySection'
import { pendingTwsFills } from '@/utils/ledger/pendingFills'
import { buildStkTotals } from '@/utils/ledger/stkTotals'

const ACCT = 'U0000001'
const CK = 'ZQX|STK|||'

const FLEX_BUY = {
  account_executions_id: 9001, exec_id: 'f.9001', account_id: ACCT, symbol: 'ZQX', sec_type: 'STK',
  side: 'BUY', quantity: 500, price: 100, commission: 1, realized_pnl: 0, contract_key: CK,
  trade_date: '2026-10-15', time: Date.parse('2026-10-15T15:00:00Z') / 1000, source: 'flex_trades',
} as Execution
const TWS_SELL = {
  account_executions_id: -7001, exec_id: 't.7001', account_id: ACCT, symbol: 'ZQX', sec_type: 'STK',
  side: 'SLD', quantity: -200, price: 101, commission: 1, realized_pnl: 199, contract_key: CK,
  trade_date: null, time: Date.parse('2026-10-16T16:00:00Z') / 1000, source: 'tws_client',
} as Execution

const pending = pendingTwsFills([FLEX_BUY], [TWS_SELL])
const fills = [...pending, FLEX_BUY]

describe('share fills with a pending TWS fill', () => {
  it('the TWS sale after the last Flex day is pending', () => {
    expect(pending.map(e => e.account_executions_id)).toEqual([-7001])
    expect(pending[0].trade_date).toBe('2026-10-16')
  })

  it('lists it dimmed and tagged, with no actions', () => {
    render(
      <TooltipProvider>
      <LedgerStkTable
        executions={fills}
        positionGroups={null}
        groupByPosition={false}
        stkSort={{ col: 'trade_date', dir: 'desc' }}
        toggleStkSort={() => {}}
        page={0}
        setPage={() => {}}
        activeTab="stocks"
        catMap={new Map()}
        stkUnrealizedByKey={new Map()}
        onEdit={() => {}}
        onDelete={() => {}}
        onAddJournal={() => {}}
      />
      </TooltipProvider>,
    )
    const tags = screen.getAllByText('pending')
    expect(tags).toHaveLength(1)
    const row = tags[0].closest('tr')!
    expect(row.className).toContain('opacity-70')
    expect(within(row).getByTitle('Actions open once Flex confirms this fill')).toBeTruthy()
    const confirmedRows = screen.getAllByRole('row').filter(r => r !== row && within(r).queryByText('ZQX'))
    expect(confirmedRows).toHaveLength(1)
    expect(confirmedRows[0].className).not.toContain('opacity-70')
  })

  it('the Summary keeps it out of the totals and names it on one line', () => {
    render(
      <LedgerSummarySection
        activeTab="stocks"
        summaryPeriod="month"
        onSummaryPeriodChange={() => {}}
        optionsSummaryByMonth={[]}
        stocksSummaryByMonth={[['2026-10', { count: 1, notional: 50_000, realizedPnl: 0 }]]}
        summaryClosedGroups={[]}
        closedOptGroupsPnlSum={0}
        stkFilteredExecutions={fills}
        stkUnrealizedByKey={new Map()}
        stkTotals={buildStkTotals(fills, new Map())}
        undatedCount={0}
        undatedNote=""
        onExplain={() => {}}
        onShowUndated={() => {}}
        pendingFills={pending}
      />,
    )
    const totals = screen.getByLabelText('Stock summary totals')
    expect(within(totals).getByText('1 trades')).toBeTruthy()
    expect(screen.getByText(/Pending: 1 stock fill from TWS not yet in Flex/)).toBeTruthy()
    expect(screen.getByText(/listed with the fills, not in these/)).toBeTruthy()
  })

  it('the options Summary does not name a pending share fill', () => {
    render(
      <LedgerSummarySection
        activeTab="options"
        summaryPeriod="month"
        onSummaryPeriodChange={() => {}}
        optionsSummaryByMonth={[]}
        stocksSummaryByMonth={[]}
        summaryClosedGroups={[]}
        closedOptGroupsPnlSum={0}
        stkFilteredExecutions={[]}
        stkUnrealizedByKey={new Map()}
        stkTotals={{ count: 0, notional: 0, realized: 0, unrealized: null }}
        undatedCount={0}
        undatedNote=""
        onExplain={() => {}}
        onShowUndated={() => {}}
        pendingFills={pending}
      />,
    )
    expect(screen.queryByText(/Pending:/)).toBeNull()
  })
})
