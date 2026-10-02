import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'
import { clearUndo, runUndo } from '@/lib/shellNotify'
import { PlanEditSection } from './PlanEditSection'

const updateStrategyPlan = vi.fn<(...args: unknown[]) => Promise<{ ok: boolean }>>(() => Promise.resolve({ ok: true }))
vi.mock('@/api/strategyPlans', () => ({
  updateStrategyPlan: (...args: unknown[]) => updateStrategyPlan(...args),
}))

const PLAN = {
  strategy_plan_id: 9,
  account_id: 'U1000001',
  qty: 2,
  legs_json: [{ side: 'sell', sec_type: 'OPT', right: 'P', strike: 150, expiry: '2026-11-20', ratio: 1 }],
  rationale: null,
} as unknown as StrategyPlan

afterEach(() => {
  clearUndo()
  vi.useRealTimers()
  updateStrategyPlan.mockClear()
})

describe('PlanEditSection — writes as you type, ⌘Z undoes', () => {
  it('writes the new contract count, and the undo writes the old one back', async () => {
    vi.useFakeTimers()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PlanEditSection plan={PLAN} accounts={[]} />
      </QueryClientProvider>,
    )
    const field = screen.getAllByRole('textbox')[0] as HTMLInputElement
    fireEvent.change(field, { target: { value: '3' } })
    await act(async () => {
      vi.advanceTimersByTime(600)
    })
    expect(updateStrategyPlan).toHaveBeenLastCalledWith(9, { qty: 3 })

    act(() => {
      runUndo()
    })
    await act(async () => {
      vi.advanceTimersByTime(600)
    })
    expect(updateStrategyPlan).toHaveBeenLastCalledWith(9, { qty: 2 })
    expect((screen.getAllByRole('textbox')[0] as HTMLInputElement).value).toBe('2')
  })
})
