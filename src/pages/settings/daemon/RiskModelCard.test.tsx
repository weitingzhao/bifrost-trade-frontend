import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { RiskModelCard } from './RiskModelCard'

describe('RiskModelCard', () => {
  it('shows the four daemon figures and says why they are zero under the freeze', () => {
    const onRefresh = vi.fn()
    render(
      <RiskModelCard
        data={{ daily_hedge_count: 0, daily_pnl: 0, spot: null, symbol: null, operations_count_24h: 0, block_reasons: [] }}
        isLoading={false}
        isFetching={false}
        error={null}
        onRefresh={onRefresh}
      />,
    )
    const card = screen.getByTestId('risk-model-card')
    expect(card).toHaveTextContent('Daily hedge count')
    expect(card).toHaveTextContent('Ops (24h)')
    expect(card).toHaveTextContent('trading execution is frozen (D10)')
    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
  it('names the spot symbol and lists block reasons when the daemon is live', () => {
    render(
      <RiskModelCard
        data={{ daily_hedge_count: 3, daily_pnl: 412.5, spot: 230.36, symbol: 'NVDA', operations_count_24h: 7, block_reasons: ['iv_too_low'] }}
        isLoading={false}
        isFetching={false}
        error={null}
        onRefresh={() => {}}
      />,
    )
    const card = screen.getByTestId('risk-model-card')
    expect(card).toHaveTextContent('Spot · NVDA')
    expect(card).toHaveTextContent('iv_too_low')
    expect(card).not.toHaveTextContent('frozen')
  })
})
