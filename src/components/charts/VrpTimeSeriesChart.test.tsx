// @vitest-environment jsdom
/** Earnings marks on the IV chart: where they sit, what they say. Rows are invented. */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { VrpRow } from '@/api/research/vrp'
import { VrpTimeSeriesChart } from './VrpTimeSeriesChart'

const row = (trade_date: string, iv: number): VrpRow =>
  ({ trade_date, atm_iv_30d: iv, rv_20d: iv - 0.05, rv_60d: iv - 0.04, vrp_20d: 0.05, vrp_60d: 0.04 }) as VrpRow

const ROWS = [row('2031-08-01', 0.5), row('2031-08-04', 0.6), row('2031-08-05', 0.45), row('2031-08-06', 0.44)]

describe('VrpTimeSeriesChart marks', () => {
  it('puts a mark on the first session on or after its date, and leaves off one outside the rows', () => {
    const { container } = render(
      <VrpTimeSeriesChart
        rows={ROWS}
        marks={[
          { date: '2031-08-02', label: '2 Aug 31' },
          { date: '2031-07-01', label: '1 Jul 31' },
        ]}
      />
    )
    const drawn = [...container.querySelectorAll('[data-chart-mark]')].map((g) => g.getAttribute('data-chart-mark'))
    expect(drawn).toEqual(['2031-08-02'])
    expect(screen.getByText('2 Aug 31')).toBeTruthy()
    expect(screen.getByText('Earnings — hover the day for the move')).toBeTruthy()
  })

  it("adds the print's reading to the hover readout on its session only", () => {
    const { container } = render(
      <VrpTimeSeriesChart rows={ROWS} marks={[{ date: '2031-08-04', label: '4 Aug 31', detail: 'Earnings 4 Aug 31 · priced ±9.0%' }]} />
    )
    const hover = container.querySelectorAll('rect[fill="transparent"]')
    fireEvent.mouseEnter(hover[1])
    expect(screen.getByText('Earnings 4 Aug 31 · priced ±9.0%')).toBeTruthy()
    fireEvent.mouseLeave(hover[1])
    fireEvent.mouseEnter(hover[2])
    expect(screen.queryByText('Earnings 4 Aug 31 · priced ±9.0%')).toBeNull()
  })

  it('draws no legend entry when no mark falls in the rows', () => {
    render(<VrpTimeSeriesChart rows={ROWS} />)
    expect(screen.queryByText('Earnings — hover the day for the move')).toBeNull()
  })
})
