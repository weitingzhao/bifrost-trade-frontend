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
  created_at: '2031-03-04T14:30:00Z',
  updated_at: '2031-03-04T14:30:00Z',
  structure_name: 'Cash Secured Put',
  gate_safety_name: null,
  symbols: ['AAA', 'BBB'],
  entry_conditions: [{ condition_type: 'dte_min', value_text: null, value_numeric: 21 }],
}

const patchOpportunity = vi.fn<(id: number, body: unknown) => Promise<{ ok: boolean }>>(() =>
  Promise.resolve({ ok: true })
)

vi.mock('@/api/strategy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/strategy')>()),
  fetchOpportunityDetail: () => Promise.resolve(DETAIL),
  patchOpportunity: (id: number, body: unknown) => patchOpportunity(id, body),
}))

vi.mock('@/hooks/useStrategies', () => ({
  useStructures: () => ({
    data: {
      items: [{ strategy_structure_id: 3, name: 'Cash Secured Put', version: 1, is_active: true }],
    },
  }),
  useGateSets: () => ({
    data: {
      items: [{ gate_safety_strategy_id: 9, name: 'Example Gate', version: 2, is_active: true }],
    },
  }),
}))

vi.mock('@/hooks/useSymbolPickerUniverse', () => ({
  useSymbolPickerUniverse: () => ({
    allSuggestedSymbols: ['AAA', 'QQQ'],
    watchlistSet: new Set(['AAA']),
    holdingsSet: new Set(['QQQ']),
  }),
}))
vi.mock('@/hooks/useSymbolSearch', () => ({
  useSymbolSearch: (query: string) => ({
    data:
      query === 'INVESCO'
        ? [{ symbol: 'QQQ', name: 'Invesco QQQ Trust' }]
        : query === 'AAA'
          ? [{ symbol: 'AAA', name: 'Example Company' }]
          : [],
    isFetching: false,
    isPlaceholderData: false,
    error: null,
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
    </QueryClientProvider>
  )
  return { onSaved }
}

describe('OpportunityInspector', () => {
  beforeEach(() => {
    patchOpportunity.mockClear()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('writes the whole opportunity, conditions included, after an edit', async () => {
    const { onSaved } = mount()
    const name = await screen.findByLabelText('Name')
    expect(screen.getByText('Opportunity · Example Put Harvest')).toBeTruthy()
    expect(screen.getByLabelText('Scope symbols').textContent).toContain('AAA')
    fireEvent.change(name, { target: { value: 'Renamed' } })
    await waitFor(() => expect(patchOpportunity).toHaveBeenCalledTimes(1), { timeout: 2000 })
    expect(patchOpportunity).toHaveBeenCalledWith(41, {
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

  it('names the request it makes under the title (TD-62)', async () => {
    mount()
    await screen.findByLabelText('Name')
    expect(screen.getByText('PATCH /api/account/strategies/opportunities/41')).toBeTruthy()
  })

  it('holds back a blank name and says why', async () => {
    mount()
    const name = await screen.findByLabelText('Name')
    fireEvent.change(name, { target: { value: '  ' } })
    expect(screen.getByText(/A name is required/)).toBeTruthy()
    await new Promise((r) => setTimeout(r, 700))
    expect(patchOpportunity).not.toHaveBeenCalled()
  })

  it('adds complete symbols without saving partial input or replacing the existing scope', async () => {
    mount()
    const sym = (await screen.findByLabelText('Add symbols')) as HTMLInputElement
    fireEvent.change(sym, { target: { value: 'q' } })
    await new Promise((r) => setTimeout(r, 700))
    expect(patchOpportunity).not.toHaveBeenCalled()
    fireEvent.change(sym, { target: { value: 'qqq' } })
    fireEvent.click(await screen.findByRole('option', { name: /QQQ.*Add/ }))
    await waitFor(() => expect(patchOpportunity).toHaveBeenCalledTimes(1), { timeout: 2000 })
    expect((patchOpportunity.mock.calls[0][1] as { symbols: string[] }).symbols).toEqual([
      'AAA',
      'BBB',
      'QQQ',
    ])
    expect(sym.value).toBe('')
    expect(screen.getByRole('status').textContent).toBe('Saved')
  })

  it('keeps a refused draft and lets the user retry it after sign-in', async () => {
    patchOpportunity.mockRejectedValueOnce(new Error('Operator access required'))
    mount()
    const sym = await screen.findByLabelText('Add symbols')
    expect(screen.getByRole('button', { name: 'Operator sign-in' })).toBeTruthy()
    fireEvent.change(sym, { target: { value: 'qqq' } })
    fireEvent.click(await screen.findByRole('option', { name: /QQQ.*Add/ }))
    await screen.findByRole('alert')
    expect(screen.getByLabelText('Scope symbols').textContent).toContain('QQQ')
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }))
    await waitFor(() => expect(patchOpportunity).toHaveBeenCalledTimes(2), { timeout: 2000 })
    expect((patchOpportunity.mock.calls[1][1] as { symbols: string[] }).symbols).toEqual([
      'AAA',
      'BBB',
      'QQQ',
    ])
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('matches a company name and identifies already included symbols', async () => {
    mount()
    const input = await screen.findByLabelText('Add symbols')
    fireEvent.change(input, { target: { value: 'Invesco' } })
    expect(await screen.findByRole('option', { name: /QQQ.*Invesco QQQ Trust.*Add/ })).toBeTruthy()
    fireEvent.change(input, { target: { value: 'AAA' } })
    const included = await screen.findByRole('option', { name: /AAA.*In scope/ })
    expect(included.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(included)
    await new Promise((r) => setTimeout(r, 700))
    expect(patchOpportunity).not.toHaveBeenCalled()
  })

  it('never saves unmatched search text on blur', async () => {
    mount()
    const input = await screen.findByLabelText('Add symbols')
    fireEvent.change(input, { target: { value: 'NOT_A_SYMBOL' } })
    expect(screen.getByText(/No matches/)).toBeTruthy()
    fireEvent.blur(input)
    await new Promise((r) => setTimeout(r, 700))
    expect(patchOpportunity).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Scope symbols').textContent).toContain('BBB')
  })

  it('refuses Delete while the opportunity has trades', async () => {
    mount(2)
    await screen.findByLabelText('Name')
    const del = screen.getByRole('button', { name: 'Delete' })
    expect(del.getAttribute('title')).toBe(
      'It has 2 trades — deactivate instead; delete needs an empty history.'
    )
  })
})
