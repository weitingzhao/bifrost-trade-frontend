import { describe, expect, it } from 'vitest'
import type { StrategyAllocation } from '@/types/positions'
import { EMPTY_ALLOCATION_FORM, allocationFormToPayload, allocationToForm } from './allocationForm'

// Invented allocation (fixtures are never copied from DEV).
const ALLOC: StrategyAllocation = {
  strategy_allocation_id: 7,
  name: 'Test sleeve',
  strategy_opportunity_ids: [3, 4],
  gate_safety_strategy_id: 2,
  max_positions: 6,
  max_bp_pct: 0.35,
  is_active: true,
  created_at: null,
  updated_at: null,
}

describe('allocationFormToPayload', () => {
  it('sends the limits inside allocation_limits — the only place the API reads them', () => {
    const body = allocationFormToPayload({ ...EMPTY_ALLOCATION_FORM, name: ' A ', maxPositions: '4', maxBpPct: '25' })
    expect(body.allocation_limits).toEqual({ max_positions: 4, max_bp_pct: 0.25 })
    expect(body).not.toHaveProperty('max_positions')
    expect(body).not.toHaveProperty('max_bp_pct')
    expect(body.name).toBe('A')
  })

  it('clears a limit when its field is emptied', () => {
    const body = allocationFormToPayload({ ...EMPTY_ALLOCATION_FORM, name: 'A', maxPositions: '', maxBpPct: '' })
    expect(body.allocation_limits).toEqual({ max_positions: null, max_bp_pct: null })
  })

  it('reads the stored share as the percent a person types, and writes it back unchanged', () => {
    const form = allocationToForm(ALLOC)
    expect(form.maxBpPct).toBe('35')
    expect(form.maxPositions).toBe('6')
    expect(allocationFormToPayload(form).allocation_limits).toEqual({ max_positions: 6, max_bp_pct: 0.35 })
  })

  it('keeps a fractional percent', () => {
    expect(allocationToForm({ ...ALLOC, max_bp_pct: 0.125 }).maxBpPct).toBe('12.5')
  })
})
