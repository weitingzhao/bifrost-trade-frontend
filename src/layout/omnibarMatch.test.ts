import { describe, expect, it } from 'vitest'
import { matches } from './omnibarMatch'
import { PAGE_ROUTES, routeFor } from './routeRegistry'

function found(term: string): string[] {
  return PAGE_ROUTES.filter((r) => matches(r, term)).map((r) => r.path)
}

describe('omnibar page search', () => {
  it('finds a page by a name it was retired under', () => {
    // These URLs have resolved all along; the search did not know them,
    // because it looks at PAGE_ROUTES and a retired path is not one.
    expect(found('vol regime')).toEqual(['/research/symbol'])
    expect(found('dossier')).toEqual(['/research/symbol'])
    expect(found('iv radar')).toEqual(['/research/symbol'])
    expect(found('trade history')).toEqual(['/portfolio/ledger'])
  })

  it('finds every System page under the name they all used to share', () => {
    const settings = found('settings')
    expect(settings).toContain('/system/coverage')
    expect(settings).toContain('/system/ib')
    expect(settings).toContain('/docs/tech-stack')
    expect(settings).not.toContain('/portfolio/positions')
  })

  it('reads a hyphen as a space, in the path as well as the name', () => {
    expect(found('data readiness')).toContain('/system/data-readiness')
    expect(found('option scan')).toContain('/research/scan')
  })

  it('still matches a page on its own name', () => {
    expect(found('positions')).toEqual(['/portfolio/positions'])
    expect(matches(routeFor('/research/backtest'), 'validate')).toBe(true)
  })

  it('offers no retired path as a destination', () => {
    for (const term of ['vol regime', 'settings', 'dossier']) {
      for (const path of found(term)) {
        expect(routeFor(path).redirect, `${term} -> ${path}`).toBeUndefined()
      }
    }
  })
})
