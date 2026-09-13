import { describe, expect, it } from 'vitest'
import { render, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { LabRedirect } from './LabRedirect'

function Where() {
  const loc = useLocation()
  return <p data-testid="where">{loc.pathname + loc.search + loc.hash}</p>
}

function landOn(from: string, url: string) {
  // Scoped to this render's container: RTL's own queries are bound to
  // document.body, so a test that lands twice would find both answers.
  const { container } = render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path={from} element={<LabRedirect from={from} />} />
        <Route path="/research/symbol" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
  return within(container).getByTestId('where').textContent
}

describe('LabRedirect', () => {
  it('carries a retired lab URL through both renames in one hop', () => {
    // `/research/gex-intraday` became `/research/dealer-levels?view=gex` (C1),
    // which is now the Symbol page's Dealer tab. The middle URL no longer
    // exists, so landing there first would be a redirect off a dead route.
    expect(landOn('/research/gex-intraday', '/research/gex-intraday?symbol=NVDA&date=2026-09-04#levels'))
      .toBe('/research/symbol?symbol=NVDA&date=2026-09-04&tab=dealer#levels')
  })

  it('turns the retired view into the section anchor when the URL has no hash', () => {
    expect(landOn('/research/vrp-lab', '/research/vrp-lab?symbol=NVDA'))
      .toBe('/research/symbol?symbol=NVDA&tab=volatility#vrp')
  })

  it('lands a retired hub on its own tab, symbol intact', () => {
    expect(landOn('/research/dossier', '/research/dossier?symbol=AAPL'))
      .toBe('/research/symbol?symbol=AAPL&tab=overview')
    expect(landOn('/research/discovery', '/research/discovery?symbol=TSLA'))
      .toBe('/research/symbol?symbol=TSLA&tab=chain')
  })
})
