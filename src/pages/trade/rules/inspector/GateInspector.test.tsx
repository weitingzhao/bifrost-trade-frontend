import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { GateSetFull, GateSetPayload } from '@/types/positions'
import { GATES_FIXTURE, gatesFixture } from '@/components/strategy/gates/gateDefaults.fixture'
import { clearUndo, runUndo } from '@/lib/shellNotify'

const api = vi.hoisted(() => ({
  fetchGateSetFull: vi.fn(),
  updateGateSet: vi.fn(),
}))
vi.mock('@/api/strategy', () => api)
vi.mock('@/hooks/useOptionCategory', () => ({ useStrategyDims: () => ({ data: { by_type: {} } }) }))

import { GateInspector } from './GateInspector'
import { gateVersionMeta } from '@/components/strategy/gates/gateForm'

function set(version: number): GateSetFull {
  return {
    gate_safety_strategy_id: 3,
    name: 'Fixture gate',
    version,
    is_active: true,
    dim_direction: null,
    dim_structure: null,
    dim_coverage: null,
    dim_risk: null,
    dim_volatility: null,
    dim_time: null,
    structure_type: null,
    gates: gatesFixture(),
    earnings_dates: [],
  }
}

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <GateInspector
        id={3}
        deleteBlocked={null}
        onClose={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
        onSaved={() => {}}
      />
    </QueryClientProvider>,
  )
}

const lastPut = (): GateSetPayload => {
  const calls = api.updateGateSet.mock.calls
  return calls[calls.length - 1][1] as GateSetPayload
}

beforeEach(() => {
  clearUndo()
  let version = 4
  api.fetchGateSetFull.mockImplementation(async () => set(version))
  api.updateGateSet.mockImplementation(async (_id: number, p: GateSetPayload) => {
    version = p.version ?? version
    return { ok: true }
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('GateInspector', () => {
  it('says where edits go in the header', async () => {
    mount()
    expect(await screen.findByText('edits go into v5 · the daemon keeps v4')).toBeTruthy()
    expect(gateVersionMeta(4)).toBe('edits go into v5 · the daemon keeps v4')
    expect(screen.getByText('Gate · Fixture gate')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Duplicate set' })).toBeTruthy()
  })

  it('the first edit writes v(N+1), the meta stays on N after the save, undo puts N back', async () => {
    mount()
    const minDte = await screen.findByLabelText('Min DTE')
    fireEvent.change(minDte, { target: { value: '30' } })
    await waitFor(() => expect(api.updateGateSet).toHaveBeenCalledTimes(1), { timeout: 2000 })
    expect(lastPut().version).toBe(5)
    expect(lastPut().gates.strategy?.structure?.min_dte).toBe(30)
    expect(lastPut().gates.guard?.risk?.max_position_shares).toBe(GATES_FIXTURE.guard!.risk!.max_position_shares)

    // the reload answers v5 — the header still names the version the daemon kept
    await waitFor(() => expect(api.fetchGateSetFull).toHaveBeenCalledTimes(2))
    expect(screen.getByText('edits go into v5 · the daemon keeps v4')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Max hedges / day'), { target: { value: '7' } })
    await waitFor(() => expect(api.updateGateSet).toHaveBeenCalledTimes(2), { timeout: 2000 })
    expect(lastPut().version).toBe(5)

    act(() => {
      runUndo()
      runUndo()
    })
    await waitFor(() => expect(api.updateGateSet).toHaveBeenCalledTimes(3), { timeout: 2000 })
    expect(lastPut().version).toBe(4)
    expect(lastPut().gates.strategy?.structure?.min_dte).toBe(GATES_FIXTURE.strategy!.structure!.min_dte)
  })

  it('a cleared field is held back, not written as 0', async () => {
    mount()
    const loss = await screen.findByLabelText('Max daily loss · $')
    fireEvent.change(loss, { target: { value: '' } })
    expect(await screen.findByText('Not saved — max_daily_loss_usd needs a number')).toBeTruthy()
    await new Promise((r) => setTimeout(r, 700))
    expect(api.updateGateSet).not.toHaveBeenCalled()
  })
})
