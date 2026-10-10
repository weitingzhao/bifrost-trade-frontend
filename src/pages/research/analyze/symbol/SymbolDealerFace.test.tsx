import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SymbolDealerFace } from './SymbolDealerFace'

const data = vi.hoisted(() => ({ readings: {} as Record<string, unknown> }))
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [], isLoading: false }) }))
vi.mock('@/hooks/useExhibitComposite', () => ({ useExhibitComposite: () => ({ data: [{ lens: 'gex_regime', readings: data.readings }] }) }))
vi.mock('./SymbolDealerHistory', () => ({ DealerIntraday: () => null, DealerRegimeTimeline: () => null, useDealerTimeline: () => ({ rows: [], streak: null, longGamma: null, loading: false }) }))
vi.mock('./useSymbolEarnings', () => ({ useSymbolEarnings: () => ({ filings: [], next: null, gap: null }) }))
vi.mock('@/components/research/LensVerdictBlock', () => ({ LensVerdictBlock: () => null }))

const renderFace = () => render(<MemoryRouter><SymbolDealerFace symbol="TEST" /></MemoryRouter>)
describe('Dealer available levels (TD-274)', () => {
  beforeEach(() => { data.readings = { spot: 100, zero_gamma: null, major_call_wall: 110, major_put_wall: 90, total_net_gex: -500, expiry: '2031-11-21' } })
  it('keeps the wall strip without a flip', () => {
    renderFace()
    const strip = screen.getByRole('group', { name: 'Dealer levels' })
    expect(within(strip).getByText('Put wall 90')).toBeInTheDocument()
    expect(within(strip).getByText('Call wall 110')).toBeInTheDocument()
    expect(screen.getByText(/short γ · no flip/)).toBeInTheDocument()
  })
  it('draws only the available side of a one-sided chain', () => {
    data.readings.major_put_wall = null
    renderFace()
    expect(screen.getByText('Call wall 110')).toBeInTheDocument()
    expect(screen.queryByText('Put wall 0')).not.toBeInTheDocument()
    expect(screen.getByText('no put exposure')).toBeInTheDocument()
  })
  it('does not fabricate no flip without a reading', () => {
    data.readings = {}
    renderFace()
    expect(screen.queryByRole('group', { name: 'Dealer levels' })).not.toBeInTheDocument()
    expect(screen.queryByText(/no flip —/)).not.toBeInTheDocument()
  })
})
