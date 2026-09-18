import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PositionsFaceSlot } from './PositionsFaceSlot'
import type { RiskProfile } from '@/types/positions'

/** The smallest profile the face will draw — the panel under test is the header, not the curve. */
const profile = {
  risk_type: 'defined',
  net_premium: 310,
  breakeven_prices: [251.2],
  max_gain: 310,
  max_loss: -880,
} as unknown as RiskProfile

function renderRiskFace(over: { onOpenInstance?: () => void } = {}) {
  return render(
    <MemoryRouter>
      <PositionsFaceSlot
        face="risk"
        onFace={vi.fn()}
        onClose={vi.fn()}
        risk={{ title: 'NVDA 20NOV26 255C ×4', profile, ...over }}
      />
    </MemoryRouter>,
  )
}

describe('PositionsFaceSlot · risk face', () => {
  it('says the payoff is this instance at expiry, and points at the page that stresses the whole book', () => {
    renderRiskFace()
    expect(screen.getByText('this instance · at expiry')).toBeInTheDocument()
    const out = screen.getByRole('link', { name: /whole-book stress · Risk Stress/ })
    expect(out).toHaveAttribute('href', '/risk/stress')
  })
  it('keeps the instance sheet beside it when the caller offers one', () => {
    const onOpenInstance = vi.fn()
    renderRiskFace({ onOpenInstance })
    expect(screen.getByRole('button', { name: /instance detail/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Risk Stress/ })).toBeInTheDocument()
  })
})
