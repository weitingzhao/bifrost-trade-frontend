import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BackingJudgmentStrip } from './BackingJudgmentStrip'
import { HOUSE_GATE_PCT, deriveBackingJudgment } from '@/utils/backingJudgment'

describe('BackingJudgmentStrip', () => {
  it('shows pool, used, 85% gate and spendable as four different figures', () => {
    const judgment = deriveBackingJudgment({ pool: 1_000_000, used: 500_000 })
    expect(judgment.gatePct).toBe(HOUSE_GATE_PCT)
    render(<BackingJudgmentStrip judgment={judgment} />)
    expect(screen.getByText('Backing pool')).toBeInTheDocument()
    expect(screen.getByText('Gate · 85%')).toBeInTheDocument()
    expect(screen.getByText('$850.0k')).toBeInTheDocument()
    expect(screen.getByText('$500.0k')).toBeInTheDocument()
    expect(screen.getByText('$350.0k')).toBeInTheDocument()
    expect(screen.getByText(/1 − Cushion/)).toBeInTheDocument()
    expect(screen.getByText('headroom under the 85% house line')).toBeInTheDocument()
    expect(screen.queryByText(/Sizing/)).not.toBeInTheDocument()
  })
})
