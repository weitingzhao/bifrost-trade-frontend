import { describe, expect, it, vi } from 'vitest'
import { render, renderHook, screen } from '@testing-library/react'
import { DealerRegimeTimeline, useDealerTimeline } from './SymbolDealerHistory'
import { readGexLevels } from './gexReading'

const inputs = vi.hoisted(() => ({ queries: [] as { data?: { rows: unknown[] }; isError?: boolean }[] }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [{ date: '2031-10-20', close: 100 }, { date: '2031-10-21', close: 101 }], isLoading: false }),
  useQueries: () => inputs.queries,
}))
vi.mock('@/hooks/useNarrative', () => ({ useEarningsDates: () => ({ data: { dates: [] } }) }))

const raw = { spot: 100, zero_gamma: null, major_call_wall: 110, major_put_wall: null, total_net_gex: -500 }
describe('Dealer daily history (TD-274)', () => {
  it('renders no flip and regime beside the surviving wall', () => {
    render(<DealerRegimeTimeline expiry="2031-11-21" loading={false} rows={[{ date: '2031-10-20', spot: 100, zeroGamma: null, callWall: 110, putWall: null, longGamma: false, nextMove: null, reading: readGexLevels(raw) }]} />)
    expect(screen.getByText('no flip')).toBeInTheDocument()
    expect(screen.getByText('short γ')).toBeInTheDocument()
    expect(screen.getByText('110')).toBeInTheDocument()
    expect(screen.getByText('no put exposure')).toBeInTheDocument()
  })
  it('uses Research net sign and does not skip an unavailable newest session', () => {
    inputs.queries = [{ data: { rows: [raw] } }, { isError: true, data: { rows: [raw] } }]
    const { result } = renderHook(() => useDealerTimeline('TEST', '2031-11-21'))
    expect(result.current.rows[0].reading?.noFlip).toBe(true)
    expect(result.current.rows[0].longGamma).toBe(false)
    expect(result.current.rows[1].unavailable).toBe(true)
    expect(result.current.rows[1].reading?.noFlip).toBe(false)
    expect(result.current.streak).toBeNull()
    render(<DealerRegimeTimeline expiry="2031-11-21" loading={false} rows={result.current.rows} />)
    expect(screen.getByText('unavailable')).toBeInTheDocument()
  })
  it('counts no-flip sessions as measured, and keeps a missing row unknown', () => {
    inputs.queries = [{ data: { rows: [raw] } }, { data: { rows: [raw] } }]
    const { result, rerender } = renderHook(() => useDealerTimeline('TEST', '2031-11-21'))
    expect(result.current.streak).toBe(2)
    inputs.queries = [{ data: { rows: [raw] } }, { data: { rows: [] } }]
    rerender()
    expect(result.current.rows[1].reading?.noFlip).toBe(false)
    expect(result.current.streak).toBeNull()
    render(<DealerRegimeTimeline expiry="2031-11-21" loading={false} rows={result.current.rows} />)
    expect(screen.getByRole('row', { name: '10-21 — — — — — —' })).toBeInTheDocument()
  })
})
