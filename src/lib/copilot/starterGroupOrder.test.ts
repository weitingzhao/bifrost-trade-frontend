import { describe, expect, it } from 'vitest'
import { starterGroupOrder, starterToolCaption } from './starterGroupOrder'

describe('starterGroupOrder', () => {
  it('leads with The book on Portfolio and the Trading Copilot page', () => {
    expect(starterGroupOrder('/portfolio/positions')).toEqual(['book', 'page', 'loop'])
    expect(starterGroupOrder('/portfolio')).toEqual(['book', 'page', 'loop'])
    expect(starterGroupOrder('/research/copilot/trading')).toEqual(['book', 'page', 'loop'])
  })

  it('leads with This page everywhere else — not a guessed origin', () => {
    expect(starterGroupOrder('/research/analyze/symbol')).toEqual(['page', 'book', 'loop'])
    expect(starterGroupOrder('/')).toEqual(['page', 'book', 'loop'])
  })

  it('omits the tool caption when we do not know the tools', () => {
    expect(starterToolCaption(undefined)).toBeNull()
    expect(starterToolCaption([])).toBeNull()
  })

  it('joins known tool names, nothing invented', () => {
    expect(starterToolCaption(['trade.strategy.gate_safety'])).toBe(
      'trade.strategy.gate_safety',
    )
    expect(
      starterToolCaption(['trade.portfolio.snapshot', 'trade.portfolio.risk_summary']),
    ).toBe('trade.portfolio.snapshot · trade.portfolio.risk_summary')
  })
})
