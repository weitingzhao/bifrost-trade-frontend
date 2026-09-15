import { describe, expect, it } from 'vitest'
import { HOUSE_GATE_PCT } from './backingJudgment'
import { backingAssumptionRows } from './backingAssumptions'

describe('backingAssumptionRows', () => {
  const rows = backingAssumptionRows({
    judgment: {
      pool: 100,
      used: 50,
      usedPct: 0.5,
      gatePct: HOUSE_GATE_PCT,
      gate: 85,
      spendable: 35,
      overGate: false,
    },
    pressureCeiling: 0.5,
  })

  it('keeps the 85% gate and the 50% pressure ceiling as two rows', () => {
    const gate = rows.find((r) => r.key === 'House gate')
    const pressure = rows.find((r) => r.key === 'Pressure ceiling')
    expect(gate?.value).toMatch(/85%/)
    expect(pressure?.value).toMatch(/50%/)
    expect(gate?.value).not.toEqual(pressure?.value)
  })

  it('marks gate hit and plan reserves unknown, not invented', () => {
    expect(rows.find((r) => r.key === 'Gate hit point')).toMatchObject({
      unknown: true,
      value: 'Not computed',
    })
    expect(rows.find((r) => r.key === 'Plan reserves')).toMatchObject({
      unknown: true,
    })
  })
})
