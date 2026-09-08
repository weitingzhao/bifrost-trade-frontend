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
    // The decisive lens is the headline and a row — once as the answer, once as the reading.
    expect(screen.getAllByText(`Gamma · ${labelForBand('gex_regime', 'cold')}`)).toHaveLength(2)
    expect(screen.getByText('Positive net gamma — dealers damp moves.')).toBeTruthy()
    expect(screen.getByText('Sentiment · no reading')).toBeTruthy()
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
