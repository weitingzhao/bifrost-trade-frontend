import { describe, expect, it } from 'vitest'
import { workbenchStops } from './handoff'

describe('workbenchStops', () => {
  it('carries the symbol, and the date when there is one', () => {
    const stops = workbenchStops('nvda', '2026-09-08')
    const vol = stops.find((s) => s.id === 'vol-regime')!
    expect(vol.to).toBe('/research/vol-regime?view=iv-rank&symbol=NVDA&date=2026-09-08')
    const gex = stops.find((s) => s.id === 'dealer-levels')!
    expect(gex.to).toBe('/research/dealer-levels?symbol=NVDA&date=2026-09-08')
  })

  it('omits the date when none is given', () => {
    const stops = workbenchStops('AMD')
    expect(stops.find((s) => s.id === 'scenario')!.to).toBe('/research/scenario?symbol=AMD')
  })

  it('uses the per-symbol route where one exists', () => {
    expect(workbenchStops('BRK.B').find((s) => s.id === 'signal-decay')!.to).toBe(
      '/research/signal-decay/BRK.B',
    )
  })

  it('every stop lands in the Workbench seat, and an empty symbol has no stops', () => {
    expect(workbenchStops('NVDA').every((s) => s.seat === 'workbench')).toBe(true)
    expect(workbenchStops('  ')).toEqual([])
  })
})
