import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { LabHubHeader, useLabView, type LabViewDef } from './LabHub'
import { LabRedirect } from './LabRedirect'

const VIEWS: LabViewDef[] = [
  { id: 'iv-rank', label: 'IV Rank', description: 'rank', render: () => <p>rank body</p> },
  { id: 'vrp', label: 'IV−RV', description: 'spread', render: () => <p>vrp body</p> },
]

function Probe() {
  const [active, setView] = useLabView(VIEWS, 'iv-rank')
  const loc = useLocation()
  return (
    <div>
      <LabHubHeader title="Vol Regime" views={VIEWS} active={active} onChange={setView} />
      {active.render()}
      <p data-testid="url">{loc.pathname + loc.search}</p>
    </div>
  )
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/research/vol-regime" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LabHub views', () => {
  it('opens on the default view and reads ?view= when present', () => {
    renderAt('/research/vol-regime?symbol=NVDA')
    expect(screen.getByText('rank body')).toBeTruthy()
    expect(screen.getByText('rank')).toBeTruthy()
  })

  it('reads the view from the URL, and falls back on nonsense', () => {
    renderAt('/research/vol-regime?view=vrp&symbol=NVDA')
    expect(screen.getByText('vrp body')).toBeTruthy()
    renderAt('/research/vol-regime?view=nope')
    expect(screen.getAllByText('rank body').length).toBeGreaterThan(0)
  })

  it('switching the tab changes ?view= and keeps the symbol', () => {
    renderAt('/research/vol-regime?symbol=NVDA')
    fireEvent.click(screen.getByRole('button', { name: 'IV−RV' }))
    expect(screen.getByText('vrp body')).toBeTruthy()
    expect(screen.getByTestId('url').textContent).toBe('/research/vol-regime?symbol=NVDA&view=vrp')
  })
})

function Where() {
  const loc = useLocation()
  return <p data-testid="where">{loc.pathname + loc.search + loc.hash}</p>
}

describe('LabRedirect', () => {
  it('lands a retired lab URL on its hub view with the query and hash intact', () => {
    render(
      <MemoryRouter initialEntries={['/research/gex-intraday?symbol=NVDA&date=2026-09-04#levels']}>
        <Routes>
          <Route path="/research/gex-intraday" element={<LabRedirect from="/research/gex-intraday" />} />
          <Route path="/research/dealer-levels" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('where').textContent).toBe(
      '/research/dealer-levels?symbol=NVDA&date=2026-09-04&view=gex#levels',
    )
  })
})
