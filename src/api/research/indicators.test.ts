import { describe, expect, it } from 'vitest'
import { INDICATOR_SIGNALS, indicatorSignal, signalShortLabel } from './indicators'

describe('indicator signals', () => {
  it('names a signal by its indicator and direction', () => {
    expect(signalShortLabel('macd_cross_up')).toBe('MACD ↑')
    expect(signalShortLabel('macd_zero_down')).toBe('MACD/0 ↓')
    expect(signalShortLabel('bb_lower_reclaim')).toBe('BB lower ↑')
    expect(signalShortLabel('close_ema_cross_down')).toBe('Close/EMA ↓')
  })

  it('adds only the parameters that differ from the defaults', () => {
    expect(signalShortLabel('rsi_cross_up', { period: 14, level: 25, symbols: ['X'] })).toBe(
      'RSI ↑ · level 25'
    )
  })

  it('falls back to the raw id for a signal it does not know', () => {
    expect(signalShortLabel('pine:my_script')).toBe('pine:my_script')
    expect(indicatorSignal('nope')).toBeUndefined()
  })

  it('carries thirteen signals, each with defaults', () => {
    expect(INDICATOR_SIGNALS).toHaveLength(13)
    for (const s of INDICATOR_SIGNALS) expect(Object.keys(s.defaults).length).toBeGreaterThan(0)
  })
})
