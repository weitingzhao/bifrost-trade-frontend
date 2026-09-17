import { describe, expect, it } from 'vitest'
import { LEDGER_TABLE_MIN_PX, ledgerTableMinClass } from './ledgerTableFloors'

const PROTOTYPE_FLOORS = { t1: 660, t2: 820, t3: 1180, t4: 1080, t5: 1160 } as const

describe('ledger table min-width floors', () => {
  it('never sits below the prototype floor (§14.6: a floor may rise, never fall)', () => {
    for (const [table, floor] of Object.entries(PROTOTYPE_FLOORS)) {
      expect(LEDGER_TABLE_MIN_PX[table as keyof typeof PROTOTYPE_FLOORS], table).toBeGreaterThanOrEqual(floor)
    }
  })

  it('pins the floors as measured, T3 raised and the open detail table on its own', () => {
    expect(LEDGER_TABLE_MIN_PX).toEqual({ t1: 660, t2: 820, t3: 1240, t4: 1080, t4Open: 1320, t5: 1160 })
    for (const [table, px] of Object.entries(LEDGER_TABLE_MIN_PX)) {
      expect(ledgerTableMinClass[table as keyof typeof ledgerTableMinClass]).toBe(`min-w-[${px}px]`)
    }
  })
})
