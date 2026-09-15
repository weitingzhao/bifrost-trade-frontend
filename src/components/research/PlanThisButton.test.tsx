// @vitest-environment jsdom
/**
 * ＋ Plan this posts a draft with no legs: a contract label is not a side.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mutate = vi.fn()

vi.mock('@/hooks/usePlanAccounts', () => ({
  usePlanAccounts: () => ({ defaultAccount: 'U1', accounts: ['U1'] }),
}))

vi.mock('@/hooks/useStrategyPlans', () => ({
  useCreateStrategyPlan: () => ({ mutate, isPending: false }),
}))

import { PlanThisButton } from './PlanThisButton'

function renderButton() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PlanThisButton
          symbol="NVDA"
          source="symbol"
          sourceLabel="Symbol"
          contract="NVDA 2026-11-20 245C"
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mutate.mockReset()
})

describe('＋ Plan this', () => {
  it('posts an empty legs array even when a contract label is present', async () => {
    renderButton()
    await userEvent.click(screen.getByRole('button', { name: /Plan this/ }))
    expect(mutate).toHaveBeenCalledTimes(1)
    const payload = mutate.mock.calls[0][0] as { legs: unknown[]; source: { kind: string; text?: string }[] }
    expect(payload.legs).toEqual([])
    expect(payload.source).toContainEqual({ kind: 'contract', text: 'NVDA 2026-11-20 245C' })
  })
})
