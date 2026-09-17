import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { fillFromViewLinks } from './ledgerViewLinks'

function opt(id: number): Execution {
  return {
    account_executions_id: id,
    account_id: 'A1',
    contract_key: 'ZZZ  240119C00050000',
    symbol: 'ZZZ',
    sec_type: 'OPT',
    side: 'Sell',
    qty: 1,
    quantity: 1,
    price: 0,
    time: 1_700_000_000,
  } as Execution
}

describe('fillFromViewLinks', () => {
  it('uses oid when the group row did not pass a fill id', () => {
    const rows = [opt(11), opt(12)]
    expect(fillFromViewLinks({ title: 'x', oid: 12 }, rows)?.account_executions_id).toBe(12)
  })

  it('falls back to the option id on the first linked row', () => {
    const rows = [opt(11), opt(12)]
    expect(
      fillFromViewLinks(
        { title: 'x', links: [{ option_account_executions_id: 11 }] },
        rows,
      )?.account_executions_id,
    ).toBe(11)
  })

  it('returns undefined when neither oid nor links identify a fill', () => {
    expect(fillFromViewLinks({ title: 'x' }, [opt(11)])).toBeUndefined()
  })
})
