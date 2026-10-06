import { describe, expect, it } from 'vitest'
import { eventQueryParams } from './eventQueryParams'

const opts = { symbols: ['NVDA'], sepaMinScore: 70, ivThreshold: 80, ivDirection: 'above' as const, signalId: 'macd_cross_up' }

describe('eventQueryParams', () => {
  it('sends SEPA as `threshold` on the 0–100 scale research reads', () => {
    expect(eventQueryParams('sepa_hit', opts)).toEqual({ symbols: ['NVDA'], threshold: 70 })
  })

  it('sends the IV percentile threshold on 0–100 with its direction', () => {
    expect(eventQueryParams('iv_percentile_threshold', { ...opts, ivDirection: 'below', ivThreshold: 20 })).toEqual({
      symbols: ['NVDA'],
      threshold: 20,
      direction: 'below',
    })
  })

  it('sends only symbols for dated events', () => {
    expect(eventQueryParams('earnings', opts)).toEqual({ symbols: ['NVDA'] })
  })
})
