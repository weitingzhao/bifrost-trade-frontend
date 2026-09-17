import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BackingVerdictPanel } from './BackingVerdictPanel'
import { HOUSE_GATE_PCT, deriveBackingJudgment } from '@/utils/backingJudgment'

describe('BackingVerdictPanel', () => {
  it('shows pool, used, the 85% gate and the space under it as four different figures', () => {
    const judgment = deriveBackingJudgment({ pool: 1_000_000, used: 500_000 })
    expect(judgment.gatePct).toBe(HOUSE_GATE_PCT)
    render(<BackingVerdictPanel judgment={judgment} pressureCeiling={0.5} />)
    expect(screen.getByText('Backing pool')).toBeInTheDocument()
    expect(screen.getByText('Gate · 85%')).toBeInTheDocument()
    expect(screen.getByText('$850.0k')).toBeInTheDocument()
    expect(screen.getByText('$500.0k')).toBeInTheDocument()
    expect(screen.getByText('$350.0k')).toBeInTheDocument()
    expect(screen.getByText(/1 − Cushion/)).toBeInTheDocument()
    expect(screen.getByText('headroom under the 85% house line')).toBeInTheDocument()
    expect(screen.queryByText(/Sizing/)).not.toBeInTheDocument()
  })

  it('folds the basis away, names how many it does not compute, and opens it on the button', () => {
    const judgment = deriveBackingJudgment({ pool: 1_000_000, used: 500_000 })
    render(<BackingVerdictPanel judgment={judgment} pressureCeiling={0.5} />)
    expect(screen.queryByTestId('backing-assumptions')).toBeNull()
    expect(screen.getByText(/2 unknown: gate hit point · plan reserves/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Model basis · 7 assumptions/ }))
    const basis = screen.getByTestId('backing-assumptions')
    expect(within(basis).getByText('House gate')).toBeInTheDocument()
    expect(within(basis).getByText('Not computed')).toBeInTheDocument()
  })
})
