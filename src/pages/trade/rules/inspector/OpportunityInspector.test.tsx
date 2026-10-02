import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { StrategyOpportunityDetail } from '@/types/strategy'

// Invented fixture — not copied from any environment.
const DETAIL: StrategyOpportunityDetail = {
  strategy_opportunity_id: 41,
  name: 'Example Put Harvest',
  strategy_structure_id: 3,
  default_gate_safety_strategy_id: null,
  scope_type: 'explicit_symbols',
  is_active: true,
  created_at: null,
  updated_at: null,
  structure_name: 'Cash Secured Put',
  gate_safety_name: null,
  symbols: ['AAA', 'BBB'],
  entry_conditions: [{ condition_type: 'dte_min', value_text: null, value_numeric: 21 }],
}

const putOpportunity = vi.fn<(id: number, body: unknown) => Promise<{ ok: boolean }>>(() => Promise.resolve({ ok: true }))

vi.mock('@/api/strategy', () => ({
  fetchOpportunityDetail: () => Promise.resolve(DETAIL),
  putOpportunity: (id: number, body: unknown) => putOpportunity(id, body),
}))

vi.mock('@/hooks/useStrategies', () => ({
  useStructures: () => ({
    data: { items: [{ strategy_structure_id: 3, name: 'Cash Secured Put', version: 1, is_active: true }] },
  }),
  useGateSafety: () => ({
    data: { items: [{ gate_safety_strategy_id: 9, name: 'Example Gate', version: 2, is_active: true }] },
  }),
}))

import { OpportunityInspector } from './OpportunityInspector'

function mount(tradeCount = 0) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onSaved = vi.fn()
  render(
    <QueryClientProvider client={qc}>
      <OpportunityInspector
        id={41}
        tradeCount={tradeCount}
        onClose={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  )
  return { onSaved }
}

describe('OpportunityInspector', () => {
  beforeEach(() => putOpportunity.mockClear())

  it('writes the whole opportunity, conditions included, after an edit', async () => {
    const { onSaved } = mount()
    const name = await screen.findByLabelText('Name')
    expect(screen.getByText('Opportunity · Example Put Harvest')).toBeTruthy()
    expect((screen.getByLabelText('Symbols') as HTMLInputElement).value).toBe('AAA · BBB')
    fireEvent.change(name, { target: { value: 'Renamed' } })
    await waitFor(() => expect(putOpportunity).toHaveBeenCalledTimes(1), { timeout: 2000 })
    expect(putOpportunity).toHaveBeenCalledWith(41, {
      name: 'Renamed',
      strategy_structure_id: 3,
      default_gate_safety_strategy_id: null,
      scope_type: 'explicit_symbols',
      symbols: ['AAA', 'BBB'],
      entry_conditions: [{ condition_type: 'dte_min', value_text: null, value_numeric: 21 }],
      is_active: true,
    })
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
  })

  it('holds back a blank name and says why', async () => {
    mount()
    const name = await screen.findByLabelText('Name')
    fireEvent.change(name, { target: { value: '  ' } })
    expect(screen.getByText(/A name is required/)).toBeTruthy()
    await new Promise((r) => setTimeout(r, 700))
    expect(putOpportunity).not.toHaveBeenCalled()
  })

  it('keeps separators while typing symbols', async () => {
    mount()
    const sym = (await screen.findByLabelText('Symbols')) as HTMLInputElement
    fireEvent.change(sym, { target: { value: 'AAA · BBB · ' } })
    expect(sym.value).toBe('AAA · BBB · ')
    fireEvent.change(sym, { target: { value: 'AAA · BBB · ccc' } })
    await waitFor(() => expect(putOpportunity).toHaveBeenCalledTimes(1), { timeout: 2000 })
    expect((putOpportunity.mock.calls[0][1] as { symbols: string[] }).symbols).toEqual(['AAA', 'BBB', 'CCC'])
  })

  it('refuses Delete while the opportunity has trades', async () => {
    mount(2)
    await screen.findByLabelText('Name')
    const del = screen.getByRole('button', { name: 'Delete' })
    expect(del.getAttribute('title')).toBe('It has 2 trades — deactivate instead; delete needs an empty history.')
  })
})
