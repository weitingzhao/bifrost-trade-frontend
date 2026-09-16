import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TransferPayChangeVsPrev } from './TransferPayChangeVsPrev'
import { NO_PRIOR_BASE } from '@/utils/transferPay'

describe('TransferPayChangeVsPrev', () => {
  it('prints the rate against the previous period', () => {
    render(<TransferPayChangeVsPrev pct={106.54} />)
    expect(screen.getByText('+106.5% vs prev')).toBeInTheDocument()
  })

  it('says there was no base rather than inventing +100%', () => {
    render(<TransferPayChangeVsPrev pct={NO_PRIOR_BASE} />)
    expect(screen.getByText('no prior base')).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('shows an em dash for the first period, which has nothing before it', () => {
    render(<TransferPayChangeVsPrev pct={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
