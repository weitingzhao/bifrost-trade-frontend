import { render, screen } from '@testing-library/react'
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

describe('TransferPayTransactionsTable date column', () => {
  it('renders a date when the API sends ts as a string', () => {
    render(<TransferPayTransactionsTable rows={[tx({ ts: '1789084800.000000' as never })]} />)
    expect(screen.getByText('2026-09-11')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('still renders a date when ts is a number', () => {
    render(<TransferPayTransactionsTable rows={[tx({ ts: 1789084800 })]} />)
    expect(screen.getByText('2026-09-11')).toBeInTheDocument()
  })

  it('reads milliseconds as well as seconds', () => {
    render(<TransferPayTransactionsTable rows={[tx({ ts: 1789084800000 })]} />)
    expect(screen.getByText('2026-09-11')).toBeInTheDocument()
  })

  it('shows an em dash for null, empty and non-numeric ts', () => {
    render(
      <TransferPayTransactionsTable
        rows={[
          tx({ ts: null as never, account_id: 'A' }),
          tx({ ts: 'abc' as never, account_id: 'B' }),
          tx({ ts: '' as never, account_id: 'C' }),
        ]}
      />,
    )
    expect(screen.getAllByText('—')).toHaveLength(3)
  })
})
