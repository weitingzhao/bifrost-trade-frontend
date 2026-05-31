import { describe, expect, it } from 'vitest'
import { getScopeDisplay } from './strategyFormUtils'

describe('getScopeDisplay', () => {
  it('returns None for empty scope type', () => {
    expect(getScopeDisplay(null, ['NVDA'])).toEqual({ text: '— None', title: '' })
  })

  it('joins explicit symbols', () => {
    expect(getScopeDisplay('explicit_symbols', ['DAVE', 'GOOG'])).toEqual({
      text: 'DAVE, GOOG',
      title: 'DAVE, GOOG',
    })
  })

  it('falls back to label when explicit symbols list is empty', () => {
    expect(getScopeDisplay('explicit_symbols', [])).toEqual({
      text: 'Explicit symbols',
      title: '',
    })
  })

  it('shows watchlist label when no symbols selected', () => {
    expect(getScopeDisplay('watchlist_stk', [])).toEqual({
      text: 'Watchlist (stocks)',
      title: 'All watchlist STK',
    })
  })
})
