// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { ExhibitPayload } from '@/api/research/exhibit'
import { DOSSIER_FACES, faceView } from '@/lib/dossier'
import { labelForBand } from '@/lib/lensVerdict'
import { FaceCard } from './FaceCard'

const exhibits: ExhibitPayload[] = [
  {
    lens: 'gex_regime',
    symbol: 'NVDA',
    as_of: '2026-09-08',
    freshness: 'fresh',
    readings: {},
    history_summary: {},
    caveats: [],
    verdict: {
      band: 'cold',
      label: 'Cold',
      value: 1,
      unit: 'x',
      means: 'Positive net gamma — dealers damp moves.',
    },
  },
  {
    lens: 'order_sentiment',
    symbol: 'NVDA',
    as_of: '2026-09-04',
    freshness: 'stale',
    readings: {},
    history_summary: {},
    caveats: ['No options trades tape on the current data plan'],
  },
]

describe('FaceCard', () => {
  it('shows the face, its coverage, each lens in the lab words, and where to read it in full', () => {
    const view = faceView(
      DOSSIER_FACES.find((f) => f.id === 'positioning')!,
      exhibits,
      'NVDA',
      () => undefined
    )
    render(
      <MemoryRouter>
        <FaceCard view={view} loading={false} />
      </MemoryRouter>
    )
    expect(screen.getByText('Positioning')).toBeTruthy()
    expect(screen.getByText('1/2 read')).toBeTruthy()
    // The decisive lens is the headline and a row — but the row is the
    // design's four columns now (Rev 2026-09-18.2): the lens's name, its
    // reading, and what that reading has been worth. The band's word stays
    // in the headline, which is where the answer belongs; the row leads with
    // the number the lens actually produced.
    expect(screen.getByText(`Gamma · ${labelForBand('gex_regime', 'cold')}`)).toBeTruthy()
    expect(screen.getAllByText('Gamma').length).toBeGreaterThan(0)
    // What a reading *means* is the headline's job now. It stays on every
    // row as its title, so a lens that is not the headline has not lost its
    // sentence — it is one hover away, where the long record line already
    // was.
    expect(screen.getByTitle('Positive net gamma — dealers damp moves.')).toBeTruthy()
    // A lens that did not answer still holds its row and says so, in the
    // column where its reading would be.
    expect(screen.getByText('Sentiment')).toBeTruthy()
    expect(screen.getByText('no reading')).toBeTruthy()
    expect(screen.getByText('No options trades tape on the current data plan')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open' }).getAttribute('href')).toBe(
      '/research/dealer-levels?symbol=NVDA'
    )
  })

  it('reads as loading until the first exhibit lands', () => {
    const view = faceView(DOSSIER_FACES.find((f) => f.id === 'trend')!, [], 'NVDA', () => undefined)
    render(
      <MemoryRouter>
        <FaceCard view={view} loading />
      </MemoryRouter>
    )
    expect(screen.getByText('Reading…')).toBeTruthy()
  })
})
