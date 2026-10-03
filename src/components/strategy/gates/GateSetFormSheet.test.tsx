import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { GateSetFull, GateSetPayload } from '@/types/strategy'
import { GATES_FIXTURE, gatesFixture } from './gateDefaults.fixture'

const api = vi.hoisted(() => ({
  fetchGateSets: vi.fn(),
  fetchGateSetDefaults: vi.fn(),
  fetchGateSetFull: vi.fn(),
  createGateSet: vi.fn(),
  updateGateSet: vi.fn(),
}))
vi.mock('@/api/strategy', () => api)
vi.mock('@/hooks/useOptionCategory', () => ({ useStrategyDims: () => ({ data: { by_type: {} } }) }))

import { GateSetFormSheet, type GateSheetMode } from './GateSetFormSheet'

/** Invented values, distinct from the fixture, so a crossed wire shows. */
function set(): GateSetFull {
  const gates = gatesFixture()
  gates.strategy!.structure!.min_dte = 7
  return {
    gate_safety_strategy_id: 9,
    name: 'Fixture set',
    version: 2,
    is_active: false,
    dim_direction: null,
    dim_structure: null,
    dim_coverage: null,
    dim_risk: null,
    dim_volatility: null,
    dim_time: null,
    structure_type: null,
    gates,
    earnings_dates: ['2031-02-03'],
  }
}

function mount(mode: GateSheetMode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <GateSetFormSheet mode={mode} onClose={() => {}} />
    </QueryClientProvider>,
  )
}

const created = (): GateSetPayload => api.createGateSet.mock.calls[0][0] as GateSetPayload

beforeEach(() => {
  api.createGateSet.mockResolvedValue({ ok: true, gate_safety_strategy_id: 11 })
  api.updateGateSet.mockResolvedValue({ ok: true })
  api.fetchGateSetFull.mockImplementation(async () => set())
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('GateSetFormSheet — a new set starts from the API’s defaults (TD-72)', () => {
  it('shows a loading state and no fields until the defaults answer', async () => {
    let answer: (v: { gates: typeof GATES_FIXTURE }) => void = () => {}
    api.fetchGateSetDefaults.mockImplementation(() => new Promise((r) => (answer = r)))
    mount({ kind: 'create' })

    expect(await screen.findByText('Loading gate defaults…')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Gate set name')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Create' })).toBeNull()

    answer({ gates: gatesFixture() })
    expect(await screen.findByPlaceholderText('Gate set name')).toBeTruthy()
    expect(screen.queryByText('Loading gate defaults…')).toBeNull()
  })

  it('creates with the API’s defaults, not a copy of its own', async () => {
    const defaults = gatesFixture()
    defaults.guard!.risk!.max_position_shares = 1234
    api.fetchGateSetDefaults.mockResolvedValue({ gates: defaults })
    mount({ kind: 'create' })

    fireEvent.change(await screen.findByPlaceholderText('Gate set name'), { target: { value: 'New set' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(api.createGateSet).toHaveBeenCalledTimes(1))
    expect(created().name).toBe('New set')
    expect(created().gates).toEqual(defaults)
    expect(created().earnings_dates).toEqual([])
  })

  it('on error: says so, offers Retry, renders no form — then seeds once Retry answers', async () => {
    api.fetchGateSetDefaults.mockRejectedValueOnce(new Error('Strategy /gate-safety/defaults: 503'))
    mount({ kind: 'create' })

    expect(await screen.findByText(/Could not load the gate defaults/)).toBeTruthy()
    expect(screen.getByText(/503/)).toBeTruthy()
    expect(screen.queryByPlaceholderText('Gate set name')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Create' })).toBeNull()
    expect(api.createGateSet).not.toHaveBeenCalled()

    api.fetchGateSetDefaults.mockResolvedValueOnce({ gates: gatesFixture() })
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByPlaceholderText('Gate set name')).toBeTruthy()
    expect(screen.queryByText(/Could not load the gate defaults/)).toBeNull()
    expect(api.fetchGateSetDefaults).toHaveBeenCalledTimes(2)
  })

  it('editing a set never reads the defaults, and does not wait on them', async () => {
    mount({ kind: 'edit', id: 9 })
    expect(await screen.findByDisplayValue('Fixture set')).toBeTruthy()
    expect(api.fetchGateSetDefaults).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Update' }))
    await waitFor(() => expect(api.updateGateSet).toHaveBeenCalledTimes(1))
    const [id, payload] = api.updateGateSet.mock.calls[0] as [number, GateSetPayload]
    expect(id).toBe(9)
    expect(payload.gates.strategy?.structure?.min_dte).toBe(7)
    expect(payload.earnings_dates).toEqual(['2031-02-03'])
  })

  it('an edit whose set fails to load shows why and no form — never the defaults in its place', async () => {
    api.fetchGateSetFull.mockRejectedValue(new Error('Strategy /gate-safety/9: 500'))
    mount({ kind: 'edit', id: 9 })
    expect(await screen.findByText(/Could not load gate set 9/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Update' })).toBeNull()
    expect(api.fetchGateSetDefaults).not.toHaveBeenCalled()
  })

  it('a copy is seeded from the set, not the defaults', async () => {
    mount({ kind: 'copy', id: 9 })
    expect(await screen.findByDisplayValue('Fixture set (copy)')).toBeTruthy()
    expect(api.fetchGateSetDefaults).not.toHaveBeenCalled()
  })
})
