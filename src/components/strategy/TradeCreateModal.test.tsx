/**
 * TD-232: the Trade create form's default opened_at is New York's date. At
 * 23:30 ET the UTC date is already tomorrow; the default must still be today.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TradeCreateModal } from './TradeCreateModal'

vi.mock('@/hooks/useStrategies', () => ({ useOpportunities: () => ({ data: { items: [] } }) }))

afterEach(() => {
  vi.useRealTimers()
})

function openedAtDefault(): string {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TradeCreateModal open onOpenChange={() => {}} status={undefined} />
    </QueryClientProvider>,
  )
  const input = document.querySelector<HTMLInputElement>('input[type="date"]')
  expect(input).not.toBeNull()
  return input!.value
}

describe('TradeCreateModal default opened_at', () => {
  it('is still the New York day at 23:30 ET (UTC is already tomorrow)', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-06T03:30:00Z')) // 23:30 EDT on 10-05
    expect(openedAtDefault()).toBe('2026-10-05')
  })

  it('moves at New York midnight, not UTC midnight', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-06T04:00:00Z')) // 00:00 EDT on 10-06
    expect(openedAtDefault()).toBe('2026-10-06')
  })
})
