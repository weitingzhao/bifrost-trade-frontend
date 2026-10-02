import { describe, expect, it } from 'vitest'
import type { StrategyOpportunityDetail } from '@/types/strategy'
import {
  EMPTY_OPPORTUNITY_FORM,
  newEntryCondition,
  opportunityFormProblem,
  opportunityFormToPayload,
  opportunityToForm,
  symbolsToText,
  textToSymbols,
  withScopeType,
} from './opportunityForm'

// Invented fixture — not copied from any environment.
function detail(p: Partial<StrategyOpportunityDetail> = {}): StrategyOpportunityDetail {
  return {
    strategy_opportunity_id: 41,
    name: 'Example Put Harvest',
    strategy_structure_id: 3,
    default_gate_safety_strategy_id: 9,
    scope_type: 'explicit_symbols',
    is_active: true,
    created_at: '2031-03-04T14:30:00Z',
    updated_at: '2031-03-04T14:30:00Z',
    structure_name: 'Cash Secured Put',
    gate_safety_name: 'Example Gate',
    symbols: ['AAA', 'BBB'],
    entry_conditions: [
      { condition_type: 'iv_min', value_text: null, value_numeric: 0.3 },
      { condition_type: 'earnings_blackout_days', value_text: 'before', value_numeric: 5 },
      { condition_type: 'custom_rule', value_text: 'kept as-is', value_numeric: null },
    ],
    ...p,
  }
}

describe('opportunityForm', () => {
  it('round-trips detail → form → payload keeping every field', () => {
    const d = detail()
    expect(opportunityFormToPayload(opportunityToForm(d))).toEqual({
      name: d.name,
      strategy_structure_id: 3,
      default_gate_safety_strategy_id: 9,
      scope_type: 'explicit_symbols',
      symbols: ['AAA', 'BBB'],
      entry_conditions: d.entry_conditions,
      is_active: true,
    })
  })

  it('keeps no gate, an inactive flag and the watchlist subset', () => {
    const d = detail({
      default_gate_safety_strategy_id: null,
      is_active: false,
      scope_type: 'watchlist_stk',
      symbols: ['ccc '],
    })
    const body = opportunityFormToPayload(opportunityToForm(d))
    expect(body.default_gate_safety_strategy_id).toBeNull()
    expect(body.is_active).toBe(false)
    expect(body.scope_type).toBe('watchlist_stk')
    expect(body.symbols).toEqual(['CCC'])
  })

  it('a scope without a list sends no symbols, and switching to it drops them', () => {
    const f = opportunityToForm(detail())
    expect(opportunityFormToPayload({ ...f, scopeType: '' }).symbols).toEqual([])
    expect(opportunityFormToPayload({ ...f, scopeType: '' }).scope_type).toBeNull()
    expect(withScopeType(f, '').symbols).toEqual([])
    expect(withScopeType(f, 'watchlist_stk').symbols).toEqual(['AAA', 'BBB'])
  })

  it('drops blank symbols and condition rows with no type, trims the rest', () => {
    const body = opportunityFormToPayload({
      ...EMPTY_OPPORTUNITY_FORM,
      name: '  Spaced  ',
      structureId: '5',
      scopeType: 'explicit_symbols',
      symbols: [' AAA ', ''],
      conditions: [
        { condition_type: ' ', value_text: 'x', value_numeric: 1 },
        { condition_type: ' dte_min ', value_text: '  ', value_numeric: 21 },
      ],
    })
    expect(body.name).toBe('Spaced')
    expect(body.symbols).toEqual(['AAA'])
    expect(body.entry_conditions).toEqual([{ condition_type: 'dte_min', value_text: null, value_numeric: 21 }])
  })

  it('says why the server would refuse a draft', () => {
    const f = opportunityToForm(detail())
    expect(opportunityFormProblem(f)).toBeNull()
    expect(opportunityFormProblem({ ...f, name: '  ' })).toBe('Name is required.')
    expect(opportunityFormProblem({ ...f, structureId: '' })).toBe('Structure is required.')
    // The model says the id is always there; a row without one still reads as no structure.
    const noStructure = detail({ strategy_structure_id: null as unknown as number })
    expect(opportunityToForm(noStructure).structureId).toBe('')
  })

  it('reads and writes the symbols line', () => {
    expect(symbolsToText(['AMD', 'NVDA'])).toBe('AMD · NVDA')
    expect(textToSymbols('amd · nvda, tsla  qqq')).toEqual(['AMD', 'NVDA', 'TSLA', 'QQQ'])
    expect(textToSymbols(symbolsToText(['AMD', 'NVDA']))).toEqual(['AMD', 'NVDA'])
    expect(textToSymbols(' · ')).toEqual([])
  })

  it('a new condition row starts as the form starts it', () => {
    expect(newEntryCondition()).toEqual({ condition_type: 'iv_min', value_text: null, value_numeric: null })
  })
})
