import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { buildOptExecutionGroups } from '@/utils/ledger/optExecutionGroups'
import { optGroupsForView } from './ledgerContractGroups'

const KEY = 'ZZZ   240119C00050000|OPT|20240119|50.0|C'

function fill(partial: Omit<Partial<Execution>, 'side'> & { side: string }): Execution {
  return {
    account_executions_id: 1,
    account_id: 'A1',
    contract_key: KEY,
    symbol: 'ZZZ   240119C00050000',
    sec_type: 'OPT',
    qty: 2,
    quantity: 2,
    price: 1,
    time: 1_700_000_000,
    expiry: '20240119',
    strike: 50,
    option_right: 'C',
    ...partial,
  } as Execution
}

// Opened in a month the window no longer reaches; closed by a journal row with no trade date.
const OPEN = fill({ account_executions_id: 1, side: 'BUY', trade_date: '2024-01-02' })
const CLOSE = fill({ account_executions_id: 2, side: 'SELL', quantity: -2, trade_date: null, source: 'journal_closed' })
const everyContract = () => true

describe('optGroupsForView', () => {
  it('keeps a closed contract closed when the window only reaches its closing row', () => {
    const shown = new Set([CLOSE])
    const [group] = optGroupsForView([OPEN, CLOSE], everyContract, shown)
    expect(group.status).toBe('realized')
    expect(group.net_qty).toBe(0)
    // What grouping only the filtered rows used to say:
    expect(buildOptExecutionGroups([CLOSE])[0].status).toBe('unrealized')
  })

  it('shows nothing for a contract none of whose fills pass the filter', () => {
    expect(optGroupsForView([OPEN, CLOSE], everyContract, new Set())).toEqual([])
  })

  it('still lets the contract filters choose which contracts are grouped', () => {
    const other = fill({ account_executions_id: 3, account_id: 'A2', side: 'BUY', trade_date: '2024-01-03' })
    const onlyA1 = (e: Execution) => e.account_id === 'A1'
    const groups = optGroupsForView([OPEN, CLOSE, other], onlyA1, new Set([OPEN, CLOSE, other]))
    expect(groups).toHaveLength(1)
    expect(groups[0].trades.every(t => t.account_id === 'A1')).toBe(true)
  })
})
