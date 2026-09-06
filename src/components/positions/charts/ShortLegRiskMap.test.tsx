import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ShortLegRiskMap } from './ShortLegRiskMap'
import type { RiskMapLeg } from '@/utils/shortLegRiskMap'

const leg = (o: Partial<RiskMapLeg> = {}): RiskMapLeg => ({
  key: 'k',
  instanceKey: 'inst-1',
  symbol: 'MU',
  right: 'C',
  strike: 250,
  expiry: '20261120',
  dte: 76,
  contracts: 3,
  // $10.05 a share over three contracts — the credit the label prints and the dot draws.
  premium: 3015,
  cushionPct: 0.124,
  spotSource: 'live',
  ...o,
})

/** Circles inside the plot itself — the legend draws two of its own outside it. */
const plotCircles = () => document.querySelector('svg[role="group"]')?.querySelectorAll('circle') ?? []

const PRICED_TITLE = 'MU 20261120 C 250 · 3 contracts · $3.0k credit · $75k if assigned · cushion +12.4% · 76d'

/** The circle that owns a given <title> — getByTitle only sees direct children of <svg>. */
function pointFor(title: string): SVGCircleElement {
  for (const c of Array.from(plotCircles())) {
    if (c.querySelector('title')?.textContent === title) return c
  }
  throw new Error(`no circle for ${title}`)
}

describe('ShortLegRiskMap', () => {
  it('renders the empty line and nothing else when there are no short legs', () => {
    render(<ShortLegRiskMap legs={[]} tightPct={0.03} />)
    expect(screen.getByText('No short legs in scope.')).toBeInTheDocument()
    expect(document.querySelector('svg')).toBeNull()
  })

  it('draws a priced leg in the plot with its band, its title and its name beside it', () => {
    render(<ShortLegRiskMap legs={[leg()]} tightPct={0.03} />)
    const c = pointFor(PRICED_TITLE)
    expect(c.dataset.band).toBe('comfortable')
    // The label carries the size too: three contracts, not one.
    expect(screen.getByTestId('point-label')).toHaveTextContent('MU 250C ×3 $3.0k +12.4%')
    expect(screen.getByTestId('size-legend')).toHaveTextContent('$3.0k–$3.0k credit')
    // The cushion scale is drawn, so the height of a point can be read.
    expect(screen.getAllByTestId('y-tick').map((t) => t.textContent)).toEqual(['-10%', '0%', '+10%', '+20%', '+30%', '+40%'])
  })

  it('lists an unpriced leg by name under the plot and never draws it as a point', () => {
    render(<ShortLegRiskMap legs={[leg({ key: 'u', symbol: 'DDOG', strike: 200, right: 'P', dte: 41, cushionPct: null, spotSource: null })]} tightPct={0.03} />)
    expect(plotCircles()).toHaveLength(0)
    const list = screen.getByTestId('unpriced-list')
    expect(list).toHaveTextContent('no quote:')
    expect(screen.getByRole('button', { name: /DDOG 200P · 41d/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1 unpriced' })).toBeInTheDocument()
  })

  it('a click selects a leg and a second click clears it; the plot never changes scope itself', () => {
    const onSelect = vi.fn()
    const priced = leg()
    const { rerender } = render(<ShortLegRiskMap legs={[priced]} tightPct={0.03} onSelect={onSelect} />)
    fireEvent.click(pointFor(PRICED_TITLE))
    expect(onSelect).toHaveBeenLastCalledWith(priced)
    rerender(<ShortLegRiskMap legs={[priced]} tightPct={0.03} onSelect={onSelect} selectedKey="k" />)
    expect(pointFor(PRICED_TITLE).dataset.selected).toBe('true')
    fireEvent.click(pointFor(PRICED_TITLE))
    expect(onSelect).toHaveBeenLastCalledWith(null)
  })

  it('a no-quote chip selects too', () => {
    const onSelect = vi.fn()
    const unpriced = leg({ key: 'u', symbol: 'FN', strike: 350, right: 'P', dte: 41, cushionPct: null, spotSource: null })
    render(<ShortLegRiskMap legs={[unpriced]} tightPct={0.03} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /FN 350P/ }))
    expect(onSelect).toHaveBeenCalledWith(unpriced)
  })

  it('draws an in-the-money leg below zero in the loss band and never banded safe', () => {
    render(<ShortLegRiskMap legs={[leg({ cushionPct: -0.05 })]} tightPct={0.03} />)
    const c = pointFor('MU 20261120 C 250 · 3 contracts · $3.0k credit · $75k if assigned · cushion -5.0% · 76d')
    expect(c.dataset.band).toBe('breached')
  })

  it('draws a leg priced at a close dashed and says so with the date', () => {
    render(<ShortLegRiskMap legs={[leg({ spotSource: 'close', spotAsOf: 1_788_480_000 })]} tightPct={0.03} />)
    expect(pointFor(PRICED_TITLE).getAttribute('class')).toMatch(/pointMark/)
    expect(document.body.textContent).toContain('1 at close 09-04')
  })

  it('labels the tight line from the prop, not a constant', () => {
    render(<ShortLegRiskMap legs={[leg()]} tightPct={0.055} />)
    expect(screen.getByTestId('tight-label')).toHaveTextContent('tight 5.5%')
  })

  it('a tick click reports its expiry and the active one is pressed', () => {
    const onExpiryClick = vi.fn()
    render(<ShortLegRiskMap legs={[leg()]} tightPct={0.03} onExpiryClick={onExpiryClick} activeExpiry="20261120" />)
    const tick = screen.getByRole('button', { name: /expiry 20261120/ })
    expect(tick).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(tick)
    expect(onExpiryClick).toHaveBeenCalledWith('20261120')
  })

  it('still draws the strip when every leg is unpriced, with the dates on the axis', () => {
    render(
      <ShortLegRiskMap
        legs={[leg({ key: 'a', cushionPct: null, spotSource: null }), leg({ key: 'b', symbol: 'FN', dte: 41, expiry: '20261016', cushionPct: null, spotSource: null })]}
        tightPct={0.03}
      />,
    )
    expect(document.querySelector('svg')).not.toBeNull()
    expect(plotCircles()).toHaveLength(0)
    // The dates are still on the axis: the time axis is the book's, priced or not.
    expect(screen.getByLabelText(/expiry 20261016/)).toBeInTheDocument()
    expect(screen.getByLabelText(/expiry 20261120/)).toBeInTheDocument()
  })
})
