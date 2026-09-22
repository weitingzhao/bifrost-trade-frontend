import { describe, expect, it } from 'vitest'
import {
  ambientPageContext,
  asofRegistry,
  isShellAmbientView,
  oldestAsofOnScreen,
} from './copilotPageContext'

describe('ambientPageContext', () => {
  it('carries route, symbol and asof when all three exist', () => {
    expect(ambientPageContext('/research/symbol', '?symbol=nvda&tab=vol', '2026-09-12')).toEqual({
      originPage: '/research/symbol',
      originLabel: 'Symbol',
      symbol: 'NVDA',
      date: '2026-09-12',
    })
  })

  it('sends no symbol when the URL has none — held is not narrowing this page', () => {
    const ctx = ambientPageContext('/portfolio/positions', '', '2026-09-12')
    expect(ctx.symbol).toBeUndefined()
    expect(ctx.originLabel).toBe('Positions')
    expect(ctx.date).toBe('2026-09-12')
  })

  it('sends no date when no AsofTag is mounted — absent, not guessed', () => {
    const ctx = ambientPageContext('/research/symbol', '?symbol=NVDA', null)
    expect(ctx.date).toBeUndefined()
    expect(ctx.symbol).toBe('NVDA')
  })

  it('is route-only on a bare page', () => {
    expect(ambientPageContext('/research/workbench', '', null)).toEqual({
      originPage: '/research/workbench',
      // The route's label took the Vision name with the seat retirement.
      originLabel: 'Pipeline census',
    })
  })
})

describe('asofRegistry', () => {
  it('speaks with the oldest session on screen, and forgets a withdrawn tag', () => {
    expect(oldestAsofOnScreen()).toBeNull()
    asofRegistry.publish('a', '2026-09-12')
    asofRegistry.publish('b', '2026-09-10')
    expect(oldestAsofOnScreen()).toBe('2026-09-10')
    asofRegistry.publish('b', null)
    expect(oldestAsofOnScreen()).toBe('2026-09-12')
    asofRegistry.publish('a', null)
    expect(oldestAsofOnScreen()).toBeNull()
  })
})

describe('isShellAmbientView', () => {
  it('tells the shell floor (a pathname) from a page widget (a slug)', () => {
    expect(isShellAmbientView({ originPage: '/research/symbol' })).toBe(true)
    expect(isShellAmbientView({ originPage: 'research-workbench' })).toBe(false)
    expect(isShellAmbientView(null)).toBe(false)
  })
})
