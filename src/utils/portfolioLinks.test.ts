import { describe, it, expect } from 'vitest'
import { positionsSymbolHref } from './portfolioLinks'

describe('positionsSymbolHref', () => {
  it('scopes Positions to the symbol, upper-cased and trimmed', () => {
    expect(positionsSymbolHref(' nvda ')).toBe('/portfolio/positions?symbol=NVDA')
  })
  it('falls back to the bare page when there is no symbol', () => {
    expect(positionsSymbolHref('')).toBe('/portfolio/positions')
  })
})
