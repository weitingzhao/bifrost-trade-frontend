import { describe, expect, it } from 'vitest'
import { labelForBand } from '@/lib/lensVerdict'
import { canonicalLens, placeholderExhibits, regimeItems, RIBBON_LENSES } from './regimeRibbon'

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

describe('regimeItems', () => {
  it('colours by band, speaks in the lab words, and links to the lab', () => {
    const items = regimeItems(EXHIBITS, 'NVDA', (id) =>
      id === 'iv_rank'
        ? { label: 'IV Rank', page_route: '/research/vol-regime?view=iv-rank' }
        : undefined
    )
    expect(items.map((i) => [i.label, i.verdict, i.tone, i.lamp])).toEqual([
      ['IV Rank', labelForBand('iv_rank', 'cold'), 'danger', 'green'],
      ['Gamma', labelForBand('gex_regime', 'hot'), 'danger', 'yellow'],
      ['Terrain', 'no reading', 'neutral', 'green'],
    ])
    expect(items[0].href).toBe('/research/vol-regime?view=iv-rank&symbol=NVDA')
    expect(items[1].href).toBe('/research/dealer-levels?view=gex&symbol=NVDA') // fallback route until the registry loads
    expect(items[2].means).toBe('No terrain reading yet') // the first caveat stands in for a missing verdict
    expect(canonicalLens('terrain')).toBe('terrain_regime')
  })

  it('shows every lens with no reading before exhibits arrive', () => {
    const items = regimeItems(placeholderExhibits(), 'SPY', () => undefined)
    expect(items.map((i) => i.id)).toEqual([...RIBBON_LENSES])
    expect(new Set(items.map((i) => `${i.verdict}/${i.tone}/${i.lamp}`))).toEqual(
      new Set(['no reading/neutral/yellow'])
    )
  })
})
