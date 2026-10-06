// @vitest-environment jsdom
/**
 * Pine library › Check draws the last 60 sessions and the dry run's marks on
 * them: ink glyphs, ▲ under the low and ▼ over the high, dates off the window
 * left out. Bars are invented.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { IndicatorBar } from '@/api/research/indicators'
import { PineCheckChart } from './PineCheckChart'

function bar(i: number): IndicatorBar {
  const d = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)
  const c = 100 + Math.sin(i / 5) * 10
  return { date: d, open: c - 1, high: c + 2, low: c - 3, close: c, volume: 1, rsi: null, macd: null, macd_signal: null, macd_hist: null, bb_mid: null, bb_upper: null, bb_lower: null, ema: {} }
}

describe('PineCheckChart', () => {
  const bars = Array.from({ length: 80 }, (_, i) => bar(i))
  it('draws the last 60 sessions with the marks inside them', () => {
    render(
      <PineCheckChart
        bars={bars}
        marks={[
          { date: bars[79].date, side: 'buy', close: null },
          { date: bars[30].date, side: 'sell', close: null },
          { date: bars[5].date, side: 'sell', close: null },
        ]}
      />,
    )
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Last 60 sessions with 2 marks')
    const up = screen.getByText('▲')
    const dn = screen.getByText('▼')
    expect(up.className).toContain('text-foreground')
    expect(up.getAttribute('title')).toContain(`${bars[79].date} · buy`)
    expect(dn.getAttribute('title')).toContain(`${bars[30].date} · sell`)
  })

  it('draws nothing with fewer than two bars', () => {
    const { container } = render(<PineCheckChart bars={bars.slice(0, 1)} marks={[]} />)
    expect(container.innerHTML).toBe('')
  })
})
