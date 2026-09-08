// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { labelForBand } from '@/lib/lensVerdict'
import { CompositeRegimeRibbon } from './CompositeRegimeRibbon'

vi.mock('@/hooks/useLensRegistry', () => ({
  useLensRegistry: () => ({
    data: {
      lenses: [
        { id: 'iv_rank', label: 'IV Rank', page_route: '/research/vol-regime?view=iv-rank' },
        { id: 'terrain_regime', label: 'Terrain', page_route: '/research/scenario?view=model' },
      ],
    },
  }),
}))

const EXHIBITS = [
  {
    lens: 'iv_rank',
    freshness: 'fresh',
    as_of: '2026-09-08',
    verdict: { band: 'cold', means: 'Implied vol near its 1y low — premium is cheap.' },
    caveats: [],
  },
  {
    lens: 'gex_regime',
    freshness: 'stale',
    as_of: '2026-09-04',
    verdict: { band: 'hot', means: 'Negative net gamma — dealers chase moves.' },
    caveats: [],
  },
  {
    lens: 'terrain',
    freshness: 'fresh',
    as_of: '2026-09-08',
    verdict: null,
    caveats: ['No terrain reading yet'],
  },
]

describe('CompositeRegimeRibbon', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renders one tag per lens and the active lens meaning inline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ ok: true, data: { exhibits: EXHIBITS } }),
      }))
    )
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <CompositeRegimeRibbon symbol="nvda" activeLens="iv_rank" />
        </MemoryRouter>
      </QueryClientProvider>
    )
    await waitFor(() =>
      expect(screen.getByText(`IV Rank · ${labelForBand('iv_rank', 'cold')}`)).toBeTruthy()
    )
    expect(screen.getByText('NVDA regime')).toBeTruthy()
    expect(screen.getByText('Terrain · no reading')).toBeTruthy()
    expect(screen.getByText('Implied vol near its 1y low — premium is cheap.')).toBeTruthy()
    expect(screen.queryByText('Negative net gamma — dealers chase moves.')).toBeNull() // only the active lens reads inline
    const active = screen.getByRole('link', { current: 'page' })
    expect(active.getAttribute('href')).toContain('/research/vol-regime?view=iv-rank')
  })
})
