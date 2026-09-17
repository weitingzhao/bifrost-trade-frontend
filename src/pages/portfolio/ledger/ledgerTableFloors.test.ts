import { describe, expect, it } from 'vitest'
import { LEDGER_TABLE_MIN_PX, ledgerTableMinClass } from './ledgerTableFloors'

describe('ledger table min-width floors', () => {
  it('pins T1–T5 to the prototype floors', () => {
    expect(LEDGER_TABLE_MIN_PX).toEqual({
      t1: 660,
      t2: 820,
      t3: 1180,
      t4: 1080,
      t5: 1160,
    })
    expect(ledgerTableMinClass.t1).toBe('min-w-[660px]')
    expect(ledgerTableMinClass.t2).toBe('min-w-[820px]')
    expect(ledgerTableMinClass.t3).toBe('min-w-[1180px]')
    expect(ledgerTableMinClass.t4).toBe('min-w-[1080px]')
    expect(ledgerTableMinClass.t5).toBe('min-w-[1160px]')
  })
})
