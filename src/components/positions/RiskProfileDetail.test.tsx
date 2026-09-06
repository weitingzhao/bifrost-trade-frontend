import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { computeRiskProfile } from '@/utils/riskProfile'
import { RiskProfileDetail } from './RiskProfileDetail'

describe('RiskProfileDetail payoff scope', () => {
  it('offers one chart with a coverage switch when shares back the call', () => {
    // A short 110 call over 100 shares bought at 100: covered, so both scopes exist.
    const profile = computeRiskProfile([{ right: 'C', strike: 110, qty: -1, avg_cost: 3 }], 100, 100)
    render(<RiskProfileDetail profile={profile} />)
    expect(screen.getByRole('group', { name: 'Payoff scope' })).toBeInTheDocument()
    const optionsOnly = screen.getByRole('button', { name: 'Options only' })
    expect(optionsOnly).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(optionsOnly)
    expect(optionsOnly).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'With coverage' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows no switch when nothing backs the leg', () => {
    const profile = computeRiskProfile([{ right: 'C', strike: 110, qty: -1, avg_cost: 3 }], 0, null)
    render(<RiskProfileDetail profile={profile} />)
    expect(screen.queryByRole('group', { name: 'Payoff scope' })).toBeNull()
  })
})
