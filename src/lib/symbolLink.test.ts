import { describe, expect, it } from 'vitest'
import { withSymbolParam } from './symbolLink'

describe('withSymbolParam', () => {
  it('joins with ? on a bare route and & on one that already has a query', () => {
    expect(withSymbolParam('/research/flow', 'SPY')).toBe('/research/flow?symbol=SPY')
    expect(withSymbolParam('/research/vol-regime?view=vrp', 'nvda')).toBe(
      '/research/vol-regime?view=vrp&symbol=NVDA',
    )
  })

  it('keeps the anchor last — a param appended after it would not be read', () => {
    expect(withSymbolParam('/research/flow#multi-leg', 'SPY')).toBe('/research/flow?symbol=SPY#multi-leg')
    expect(withSymbolParam('/portfolio/backing?view=room#model', 'nvda')).toBe(
      '/portfolio/backing?view=room&symbol=NVDA#model',
    )
  })

  it('normalizes the symbol so the same ticker is one URL, not three', () => {
    expect(withSymbolParam('/research/flow', ' nvda ')).toBe('/research/flow?symbol=NVDA')
  })

  it('encodes what would otherwise break the query', () => {
    expect(withSymbolParam('/research/flow', 'brk b')).toBe('/research/flow?symbol=BRK%20B')
  })

  it('returns the route untouched when there is no symbol', () => {
    expect(withSymbolParam('/research/flow', '')).toBe('/research/flow')
    expect(withSymbolParam('/research/flow', null)).toBe('/research/flow')
    expect(withSymbolParam('/research/flow')).toBe('/research/flow')
  })
})
