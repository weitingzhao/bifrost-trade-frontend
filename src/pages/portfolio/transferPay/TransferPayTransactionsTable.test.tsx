import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TransferPayTransactionsTable } from './TransferPayTransactionsTable'
import type { AccountTransaction } from '@/types/trading'

/**
 * E1: all 116 rows on DEV showed `—` for Date. The API sends `ts` as a string
 * ("1789084800.000000"), and `Number.isFinite` on a string is always false. The
 * summary table reads the same field correctly because `getPeriodKey` converts
 * with `Number(ts)` first — one field, two assumptions.
 *
 * Every ts in the ledger is midnight UTC (116/116 satisfy `ts % 86400 === 0`),
 * so the transaction date is the UTC date. Reading it in the browser's zone
 * would shift the whole ledger back a day west of Greenwich and disagree with
 * the summary table, which already groups by `getUTC*`.
 */
function tx(over: Partial<AccountTransaction> = {}): AccountTransaction {
  return {
    account_id: 'U17123565',
    ts: 1789084800,
    amount: -12.5,
    type: 'other',
    currency: 'USD',
    description: 'OPRA NP L1',
    ...over,
  }
}

function renderTable(rows: AccountTransaction[], groupByMonth = false) {
  return render(
    <TransferPayTransactionsTable
      rows={rows}
      filtered={rows}
      groupByMonth={groupByMonth}
      rangeLabel="Last 365 calendar days"
      emptyWhy="This account has no cash events in last 365 calendar days."
    />,
  )
}

describe('TransferPayTransactionsTable date column', () => {
  it('renders a date when the API sends ts as a string', () => {
    renderTable([tx({ ts: '1789084800.000000' as never })])
    expect(screen.getByText('11SEP26')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('still renders a date when ts is a number', () => {
    renderTable([tx({ ts: 1789084800 })])
    expect(screen.getByText('11SEP26')).toBeInTheDocument()
  })

  it('reads milliseconds as well as seconds', () => {
    renderTable([tx({ ts: 1789084800000 })])
    expect(screen.getByText('11SEP26')).toBeInTheDocument()
  })

  it('shows an em dash for null, empty and non-numeric ts', () => {
    renderTable([
      tx({ ts: null as never, account_id: 'A' }),
      tx({ ts: 'abc' as never, account_id: 'B' }),
      tx({ ts: '' as never, account_id: 'C' }),
    ])
    expect(screen.getAllByText('—')).toHaveLength(3)
  })
})

describe('TransferPayTransactionsTable kind column', () => {
  it('labels the description, so a fee and lending income do not share one bucket', () => {
    renderTable([
      tx({ description: 'W******03:ABCOPRANP FOR SEP 2026' }),
      tx({ description: 'USD IBKR MANAGED SECURITIES (SYEP) INTEREST FOR AUG-2026', amount: 9.1 }),
      tx({ description: 'SGOV(US46436E7186) CASH DIVIDEND USD 0.31 PER SHARE - US TAX' }),
      tx({ type: 'deposit', description: 'CASH RECEIPTS / ELECTRONIC FUND TRANSFERS', amount: 4000 }),
    ])
    expect(screen.getByText('Data fee')).toBeInTheDocument()
    expect(screen.getByText('Lending')).toBeInTheDocument()
    expect(screen.getByText('Tax')).toBeInTheDocument()
    expect(screen.getByText('Transfer')).toBeInTheDocument()
  })

  it('keeps a Kind header beside the six the page already had', () => {
    renderTable([tx()])
    for (const head of ['Date', 'Account', 'Type', 'Kind', 'Amount', 'Ccy', 'Description']) {
      expect(screen.getByRole('columnheader', { name: head })).toBeInTheDocument()
    }
  })
})

describe('TransferPayTransactionsTable cancellations', () => {
  it('names what a bracketed cancellation reverses', () => {
    renderTable([
      tx({ description: 'CANCEL[W******03:SNAPSHOTVALUENONPRO] FOR AUG 2026', amount: 10 }),
    ])
    expect(
      screen.getByText('reverses · W******03:SNAPSHOTVALUENONPRO · AUG 2026'),
    ).toBeInTheDocument()
  })

  it('says a bare CANCELLATION points at nothing instead of guessing', () => {
    renderTable([tx({ type: 'withdrawal', description: 'CANCELLATION', amount: -2500 })])
    expect(screen.getByText('reverses an earlier charge · not identified')).toBeInTheDocument()
  })

  it('leaves both cancellations on their own rows so the net still adds up', () => {
    renderTable([
      tx({ description: 'CANCEL[W******03:OPRA NP L1] FOR JAN 2026', amount: 2.25 }),
      tx({ type: 'withdrawal', description: 'CANCELLATION', amount: -15000 }),
    ])
    expect(screen.getAllByText('Cancel')).toHaveLength(2)
  })
})

describe('TransferPayTransactionsTable month grouping', () => {
  const sep = tx({ ts: 1789084800, amount: 4000, description: 'a' })
  const aug = tx({ ts: 1787270400, amount: -10, description: 'b' })

  it('opens a separator carrying the month, its event count and its net', () => {
    renderTable([sep, aug], true)
    const rows = screen.getAllByRole('row')
    const sepHeader = rows.find(r => within(r).queryByText('SEP 2026'))
    expect(sepHeader).toBeDefined()
    expect(within(sepHeader as HTMLElement).getByText('1 event')).toBeInTheDocument()
    expect(within(sepHeader as HTMLElement).getByText('$4,000.00')).toBeInTheDocument()
    expect(screen.getByText('AUG 2026')).toBeInTheDocument()
  })

  it('shows no separators when grouping is off', () => {
    renderTable([sep, aug], false)
    expect(screen.queryByText('SEP 2026')).not.toBeInTheDocument()
  })
})

describe('TransferPayTransactionsTable empty state', () => {
  it('says which filter emptied the table rather than only that it is empty', () => {
    renderTable([])
    expect(screen.getByText('No cash events match this selection')).toBeInTheDocument()
    expect(
      screen.getByText('This account has no cash events in last 365 calendar days.'),
    ).toBeInTheDocument()
  })
})

describe('TransferPayTransactionsTable footer', () => {
  it('explains that a negative amount has direction, not a fault', () => {
    renderTable([tx()])
    expect(screen.getByText(/money leaving, not a fault/)).toBeInTheDocument()
    expect(screen.getByText(/it is orange because it has direction, never red/)).toBeInTheDocument()
  })
})
