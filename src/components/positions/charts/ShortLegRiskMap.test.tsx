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
  cushionPct: 0.124,
  ...o,
})

const PRICED_TITLE = 'MU 20261120 C 250 · 3 contracts · cushion +12.4% · 76d'

/**
 * The circle that owns a given <title>. testing-library's getByTitle only
 * matches a <title> that is a direct child of <svg>, so walk the circles.
 */
function pointFor(title: string): SVGCircleElement {
  for (const c of Array.from(document.querySelectorAll('circle'))) {
    if (c.querySelector('title')?.textContent === title) return c
  }
  throw new Error(`no circle for ${title}`)
}

function isSafeBanded(c: SVGCircleElement): boolean {
  return /Comfortable|Tight/.test(c.className.baseVal) || c.dataset.band === 'comfortable'
}

describe('ShortLegRiskMap', () => {
  it('renders the empty line and nothing else when there are no short legs', () => {
    const { container } = render(<ShortLegRiskMap legs={[]} tightPct={0.03} />)
    expect(screen.getByText('No short legs in scope.')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('draws a priced leg in the priced area with its band and full title', () => {
    render(<ShortLegRiskMap legs={[leg()]} tightPct={0.03} />)
    const c = pointFor(PRICED_TITLE)
    expect(c.dataset.band).toBe('comfortable')
    expect(c.dataset.clamped).toBeUndefined()
    expect(Number(c.getAttribute('cx'))).toBeGreaterThan(56)
    expect(screen.queryByText(/unpriced/)).toBeNull()
    // Interactive children need an exposed parent, not an image.
    expect(screen.getByRole('group', { name: /Short legs by cushion/ })).toBeInTheDocument()
  })

  it('keeps an unpriced leg in the gutter, hollow, counted, and never banded safe', () => {
    render(
      <ShortLegRiskMap
        legs={[leg({ key: 'p' }), leg({ key: 'u', symbol: 'RKLB', strike: 40, contracts: 1, dte: 5, cushionPct: null })]}
        tightPct={0.03}
      />,
    )
    const u = pointFor('RKLB 20261120 C 40 · 1 contract · cushion n/a (no quote) · 5d')
    expect(u.dataset.band).toBe('unpriced')
    expect(u.className.baseVal).not.toMatch(/Comfortable|Tight|Breached/)
    expect(Number(u.getAttribute('cx'))).toBeLessThan(56)
    expect(screen.getByTestId('unpriced-gutter')).toContainElement(u)

    const count = screen.getByRole('button', { name: '1 unpriced' })
    expect(count).toHaveClass('text-warning')
    expect(screen.getByText('no quote')).toBeInTheDocument()
  })

  it('still draws the strip when every leg is unpriced', () => {
    const { container } = render(
      <ShortLegRiskMap
        legs={[leg({ key: 'a', cushionPct: null }), leg({ key: 'b', symbol: 'ZZ', cushionPct: null, dte: 2 })]}
        tightPct={0.03}
      />,
    )
    expect(container.querySelector('svg')).not.toBeNull()
    expect(screen.getByText('2 unpriced')).toBeInTheDocument()
    expect(screen.getByText('no quote')).toBeInTheDocument()
    expect(screen.getByTestId('tight-label')).toHaveTextContent('tight 3%')
    const circles = Array.from(container.querySelectorAll('circle'))
    expect(circles).toHaveLength(2)
    for (const c of circles) {
      expect(c.dataset.band).toBe('unpriced')
      expect(Number(c.getAttribute('cx'))).toBeLessThan(56)
      expect(Number.isFinite(Number(c.getAttribute('cy')))).toBe(true)
    }
  })

  it('treats a NaN cushion as unpriced rather than banding it safe', () => {
    render(<ShortLegRiskMap legs={[leg({ key: 'nan', cushionPct: Number.NaN })]} tightPct={0.03} />)
    const c = pointFor('MU 20261120 C 250 · 3 contracts · cushion n/a (no quote) · 76d')
    expect(isSafeBanded(c)).toBe(false)
    expect(c.dataset.band).toBe('unpriced')
    expect(Number(c.getAttribute('cx'))).toBeLessThan(56)
    expect(Number.isFinite(Number(c.getAttribute('cy')))).toBe(true)
    expect(screen.getByText('1 unpriced')).toBeInTheDocument()
  })

  it('draws an in-the-money leg below zero in the loss band', () => {
    render(<ShortLegRiskMap legs={[leg({ key: 'itm', cushionPct: -0.04 }), leg({ key: 'ok' })]} tightPct={0.03} />)
    const itm = pointFor('MU 20261120 C 250 · 3 contracts · cushion -4.0% · 76d')
    const ok = pointFor(PRICED_TITLE)
    expect(itm.dataset.band).toBe('breached')
    expect(Number(itm.getAttribute('cy'))).toBeGreaterThan(Number(ok.getAttribute('cy')))
  })

  it('rings a clamped point and keeps the true cushion in its title, in both the plot and the right gutter', () => {
    render(
      <ShortLegRiskMap
        legs={[leg({ key: 'deep', cushionPct: -0.3 }), leg({ key: 'deepNoDate', expiry: 'later', dte: null, cushionPct: -0.3 })]}
        tightPct={0.03}
      />,
    )
    const deep = pointFor('MU 20261120 C 250 · 3 contracts · cushion -30.0% · 76d')
    expect(deep.dataset.clamped).toBe('low')
    expect(deep.className.baseVal).toMatch(/pointClamped/)
    expect(deep.dataset.band).toBe('breached')

    const noDate = pointFor('MU later C 250 · 3 contracts · cushion -30.0% · no expiry')
    expect(noDate.dataset.clamped).toBe('low')
    expect(noDate.className.baseVal).toMatch(/pointClamped/)
    expect(screen.getByTestId('no-expiry-gutter')).toContainElement(noDate)
  })

  it('labels the tight line from the prop, not a constant', () => {
    const { rerender } = render(<ShortLegRiskMap legs={[leg()]} tightPct={0.03} />)
    expect(screen.getByTestId('tight-label')).toHaveTextContent('tight 3%')
    rerender(<ShortLegRiskMap legs={[leg()]} tightPct={0.05} />)
    expect(screen.getByTestId('tight-label')).toHaveTextContent('tight 5%')
    expect(pointFor(PRICED_TITLE).dataset.band).toBe('comfortable')
    rerender(<ShortLegRiskMap legs={[leg()]} tightPct={0.2} />)
    expect(pointFor(PRICED_TITLE).dataset.band).toBe('tight')
  })

  it('fills both gutters at once, with the no-expiry label in the warning tone', () => {
    render(
      <ShortLegRiskMap
        legs={[
          leg({ key: 'p' }),
          leg({ key: 'x', expiry: 'later', dte: null }),
          leg({ key: 'u', symbol: 'ZZ', cushionPct: null }),
        ]}
        tightPct={0.03}
      />,
    )
    const x = pointFor('MU later C 250 · 3 contracts · cushion +12.4% · no expiry')
    expect(screen.getByTestId('no-expiry-gutter')).toContainElement(x)
    expect(x.dataset.band).toBe('comfortable')
    expect(Number(x.getAttribute('cx'))).toBeGreaterThan(650 - 48)
    expect(screen.getByTestId('no-expiry-label')).toHaveTextContent('no expiry')
    expect(screen.getByTestId('no-expiry-label').getAttribute('class')).toMatch(/labelWarning/)

    const u = pointFor('ZZ 20261120 C 250 · 3 contracts · cushion n/a (no quote) · 76d')
    expect(screen.getByTestId('unpriced-gutter')).toContainElement(u)
    expect(Number(pointFor(PRICED_TITLE).getAttribute('cx'))).toBeLessThan(650 - 48)
  })

  it('labels a past-expiry tick "past", agreeing with the point title', () => {
    render(<ShortLegRiskMap legs={[leg({ key: 'late', expiry: '20260101', dte: -3 })]} tightPct={0.03} />)
    expect(pointFor('MU 20260101 C 250 · 3 contracts · cushion +12.4% · 3d past')).toBeInTheDocument()
    expect(screen.getByText('past')).toBeInTheDocument()
    expect(screen.queryByText('0d')).toBeNull()
  })

  it('wires the three click targets and highlights the active expiry', () => {
    const onLegClick = vi.fn()
    const onExpiryClick = vi.fn()
    const onUnpricedClick = vi.fn()
    const legs = [leg({ key: 'p' }), leg({ key: 'u', symbol: 'ZZ', cushionPct: null, dte: 3 })]
    render(
      <ShortLegRiskMap
        legs={legs}
        tightPct={0.03}
        activeExpiry="20261120"
        onLegClick={onLegClick}
        onExpiryClick={onExpiryClick}
        onUnpricedClick={onUnpricedClick}
      />,
    )

    fireEvent.click(pointFor(PRICED_TITLE))
    expect(onLegClick).toHaveBeenCalledWith(legs[0])

    const tick = screen.getByRole('button', { name: 'expiry 20261120, 76 days' })
    expect(tick).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(tick)
    expect(onExpiryClick).toHaveBeenCalledWith('20261120')

    fireEvent.click(screen.getByTestId('unpriced-gutter'))
    expect(onUnpricedClick).toHaveBeenCalledTimes(1)

    // A point inside the gutter is the leg, not the gutter.
    fireEvent.click(pointFor('ZZ 20261120 C 250 · 3 contracts · cushion n/a (no quote) · 3d'))
    expect(onLegClick).toHaveBeenLastCalledWith(legs[1])
    expect(onUnpricedClick).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '1 unpriced' }))
    expect(onUnpricedClick).toHaveBeenCalledTimes(2)
  })

  it('reaches every control from the keyboard without a gutter point also opening the gutter', () => {
    const onLegClick = vi.fn()
    const onExpiryClick = vi.fn()
    const onUnpricedClick = vi.fn()
    const legs = [leg({ key: 'p' }), leg({ key: 'u', symbol: 'ZZ', cushionPct: null, dte: 3 })]
    render(
      <ShortLegRiskMap
        legs={legs}
        tightPct={0.03}
        onLegClick={onLegClick}
        onExpiryClick={onExpiryClick}
        onUnpricedClick={onUnpricedClick}
      />,
    )

    const gutterPoint = pointFor('ZZ 20261120 C 250 · 3 contracts · cushion n/a (no quote) · 3d')
    expect(gutterPoint).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(gutterPoint, { key: 'Enter' })
    expect(onLegClick).toHaveBeenCalledTimes(1)
    expect(onLegClick).toHaveBeenCalledWith(legs[1])
    expect(onUnpricedClick).not.toHaveBeenCalled()

    fireEvent.keyDown(screen.getByTestId('unpriced-gutter'), { key: ' ' })
    expect(onUnpricedClick).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(pointFor(PRICED_TITLE), { key: ' ' })
    expect(onLegClick).toHaveBeenLastCalledWith(legs[0])

    fireEvent.keyDown(screen.getByRole('button', { name: 'expiry 20261120, 76 days' }), { key: 'Enter' })
    expect(onExpiryClick).toHaveBeenCalledWith('20261120')

    // Other keys do nothing.
    fireEvent.keyDown(pointFor(PRICED_TITLE), { key: 'a' })
    expect(onLegClick).toHaveBeenCalledTimes(2)
  })

  it('does not make an empty unpriced gutter a control', () => {
    const onUnpricedClick = vi.fn()
    render(<ShortLegRiskMap legs={[leg()]} tightPct={0.03} onUnpricedClick={onUnpricedClick} />)
    const gutter = screen.getByTestId('unpriced-gutter')
    expect(gutter).not.toHaveAttribute('role')
    expect(gutter).not.toHaveAttribute('tabindex')
    fireEvent.click(gutter)
    fireEvent.keyDown(gutter, { key: 'Enter' })
    expect(onUnpricedClick).not.toHaveBeenCalled()
    expect(screen.queryByText(/unpriced/)).toBeNull()
  })

  it('renders nothing as a control when no handlers are given', () => {
    render(<ShortLegRiskMap legs={[leg(), leg({ key: 'u', cushionPct: null })]} tightPct={0.03} />)
    expect(screen.queryByRole('button', { name: /expiry/ })).toBeNull()
    expect(pointFor(PRICED_TITLE)).not.toHaveAttribute('role')
    expect(screen.getByTestId('unpriced-gutter')).not.toHaveAttribute('role')
  })
})
