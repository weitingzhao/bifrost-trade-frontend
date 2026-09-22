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
      DOSSIER_FACES.find((f) => f.id === 'dealer')!,
      exhibits,
      'NVDA',
      () => undefined
    )
    render(
      <MemoryRouter>
        <FaceCard view={view} loading={false} />
      </MemoryRouter>
    )
    expect(screen.getByText('Dealer levels')).toBeTruthy()
    expect(screen.getByText('1/2 read')).toBeTruthy()
    // The headline is the verdict, and the line under it is what that verdict
    // means — the design's verdict block (Rev 2026-09-18.2). This side printed
    // `lens · verdict` and dropped the meaning entirely, so the card said what
    // it found without saying why that matters.
    expect(screen.getByText(labelForBand('gex_regime', 'cold'))).toBeTruthy()
    expect(screen.getByText('Positive net gamma — dealers damp moves.')).toBeTruthy()
    // The row leads with the lens's own name and the number it produced.
    expect(screen.getAllByText('Gamma').length).toBeGreaterThan(0)
    // The link says where it goes, and it goes to this page's own tab.
    const open = screen.getByRole('link', { name: 'Dealer tab →' })
    expect(open.getAttribute('href')).toBe('/research/symbol?tab=dealer&symbol=NVDA')
  })

  it('keeps a lens that did not answer, and says so where its reading would be', () => {
    const view = faceView(
      DOSSIER_FACES.find((f) => f.id === 'flow')!,
      exhibits,
      'NVDA',
      () => undefined
    )
    render(
      <MemoryRouter>
        <FaceCard view={view} loading={false} />
      </MemoryRouter>
    )
    expect(screen.getByText('Sentiment')).toBeTruthy()
    expect(screen.getByText('no reading')).toBeTruthy()
    expect(screen.getByText('No options trades tape on the current data plan')).toBeTruthy()
  })

  it('marks the one face the list was ranking on', () => {
    const view = faceView(
      DOSSIER_FACES.find((f) => f.id === 'dealer')!,
      exhibits,
      'NVDA',
      () => undefined
    )
    render(
      <MemoryRouter>
        <FaceCard view={view} loading={false} drove />
      </MemoryRouter>
    )
    expect(screen.getByText('drove the rating')).toBeTruthy()
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
