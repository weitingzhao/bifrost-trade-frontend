// @vitest-environment jsdom
/** The earnings-gap levels on the P/L: drawn inside the price span, left off outside it. Curves are invented. */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PayoffChart } from './PayoffChart'
import type { PayoffCurves } from './payoffModel'

const xs = Array.from({ length: 41 }, (_, i) => 300 + i * 5)
const curves = {
  xs,
  atExpiry: xs.map((s) => Math.min(500, (s - 350) * 100)),
  today: xs.map((s) => Math.min(450, (s - 355) * 90)),
  sigma: 0.12,
  breakeven: 350,
} as unknown as PayoffCurves

describe('PayoffChart gap levels', () => {
  it('draws both levels with their labels and a legend entry', () => {
    const { container } = render(<PayoffChart curves={curves} spot={372} gap={{ lo: 356, hi: 388, title: 'gap' }} />)
    expect(screen.getByText('E −gap 356')).toBeTruthy()
    expect(screen.getByText('E +gap 388')).toBeTruthy()
    expect(screen.getByText('earnings ±gap (estimated print)')).toBeTruthy()
    expect(container.querySelectorAll('line.stroke-warning')).toHaveLength(2)
  })

  it('leaves off a level outside the drawn prices, and draws nothing without a gap', () => {
    const { container, rerender } = render(<PayoffChart curves={curves} spot={372} gap={{ lo: 250, hi: 388 }} />)
    expect(container.querySelectorAll('line.stroke-warning')).toHaveLength(1)
    rerender(<PayoffChart curves={curves} spot={372} />)
    expect(container.querySelectorAll('line.stroke-warning')).toHaveLength(0)
    expect(screen.queryByText('earnings ±gap (estimated print)')).toBeNull()
  })
})
