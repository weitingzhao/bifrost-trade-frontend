import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SvgBarChart } from './SvgBarChart'

const LABELS = ['2023', '2024', '2025', '2026']
const SERIES = [
  { key: 'Revenue', color: 'var(--color-success)', values: [1_200, 1_850, 2_400, 3_100] },
]

function svgOf(ui: React.ReactElement) {
  const { container } = render(ui)
  return container.querySelector('svg')
}

describe('SvgBarChart after the scale migration', () => {
  it('still renders, with a bar per point', () => {
    const svg = svgOf(<SvgBarChart labels={LABELS} series={SERIES} />)
    expect(svg).not.toBeNull()
    expect(svg!.querySelectorAll('rect')).toHaveLength(LABELS.length)
  })

  it('labels its axis with round numbers, not whatever the data reached', () => {
    const svg = svgOf(<SvgBarChart labels={LABELS} series={SERIES} />)
    const ticks = [...svg!.querySelectorAll('text')]
      .map((t) => t.textContent ?? '')
      .filter((t) => !LABELS.includes(t))
    expect(ticks.length).toBeGreaterThan(0)
    // 3100 -> the old code labelled 0 / 1550 / 3100; niceTicks gives round steps.
    expect(ticks.every((t) => /^-?[\d.,]+[KMB]?$/.test(t))).toBe(true)
  })

  it('keeps every drawn coordinate finite', () => {
    // The scale used to divide by `range || 1`; a flat or empty series is the
    // case that produced NaN geometry and an invisible chart.
    for (const values of [[5, 5, 5, 5], [0, 0, 0, 0], [-2, 4, -6, 8]]) {
      const svg = svgOf(<SvgBarChart labels={LABELS} series={[{ ...SERIES[0], values }]} />)
      for (const r of svg!.querySelectorAll('rect')) {
        for (const a of ['x', 'y', 'width', 'height']) {
          expect(Number.isFinite(Number(r.getAttribute(a)))).toBe(true)
        }
      }
    }
  })

  it('puts negative bars below the zero baseline', () => {
    const svg = svgOf(
      <SvgBarChart labels={['a', 'b']} series={[{ key: 'k', color: 'red', values: [10, -10] }]} />,
    )
    const [pos, neg] = [...svg!.querySelectorAll('rect')]
    expect(Number(pos.getAttribute('y'))).toBeLessThan(Number(neg.getAttribute('y')))
  })

  it('draws no raw palette colour — grid and axis come from tokens', () => {
    const { container } = render(<SvgBarChart labels={LABELS} series={SERIES} />)
    expect(container.innerHTML).not.toMatch(/rgba\(148/)
    expect(container.innerHTML).toMatch(/var\(--/)
  })

  it('renders nothing rather than a broken frame when there is no series', () => {
    expect(svgOf(<SvgBarChart labels={[]} series={[]} />)).toBeNull()
  })
})
