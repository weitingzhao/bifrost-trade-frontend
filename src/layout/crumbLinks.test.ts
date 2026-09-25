import { describe, expect, it } from 'vitest'
import { crumbLinks } from './crumbLinks'
import { PAGE_ROUTES, routeFor } from './routeRegistry'
import { NAV_GROUPS, SYSTEM_ITEM } from './navConfig'
import type { RouteEntry } from './routeTable'

const ROUTES: RouteEntry[] = [
  { path: '/risk', label: 'Risk' },
  { path: '/risk/limits', label: 'Limits & Breaches', crumbs: ['Risk'] },
  { path: '/research/overview', label: 'Overview', crumbs: ['Research'] },
  { path: '/research/analyze', label: 'Analyze', crumbs: ['Research'] },
  { path: '/review/analyze', label: 'Analyze', crumbs: ['Review'] },
  { path: '/research/symbol', label: 'Symbol', crumbs: ['Research', 'Analyze'] },
  { path: '/research/:id', label: 'Analyze', crumbs: ['Research'] },
]
const GROUPS = [
  { label: 'Research', to: '/research/overview' },
  { label: 'Risk', to: '/risk' },
]

describe('crumbLinks', () => {
  it('takes the layer’s own path for the top level when the app routes it', () => {
    expect(crumbLinks(['Risk'], ROUTES, GROUPS)).toEqual([{ label: 'Risk', to: '/risk' }])
  })

  it('falls back to the top group’s heading target when the layer has no page', () => {
    expect(crumbLinks(['Research'], ROUTES, GROUPS)[0].to).toBe('/research/overview')
  })

  it('resolves an inner level only to a route with the same label under the same prefix', () => {
    const [, analyze] = crumbLinks(['Research', 'Analyze'], ROUTES, GROUPS)
    // Not /review/analyze (same label, other prefix), and never a :param path.
    expect(analyze.to).toBe('/research/analyze')
  })

  it('leaves a level it cannot resolve as plain text', () => {
    expect(crumbLinks(['Research', 'Validate'], ROUTES, GROUPS)[1].to).toBeNull()
    expect(crumbLinks(['Nowhere'], ROUTES, GROUPS)[0].to).toBeNull()
  })

  it('resolves every crumb the app shows to a page that exists, or to nothing', () => {
    const groups = [...NAV_GROUPS, { label: 'System', to: SYSTEM_ITEM.to }]
    const known = new Set(PAGE_ROUTES.map((r) => r.path))
    for (const r of PAGE_ROUTES) {
      const crumbs = routeFor(r.path).crumbs ?? []
      for (const c of crumbLinks(crumbs, PAGE_ROUTES, groups)) {
        if (c.to != null) expect(known.has(c.to), `${r.path} › ${c.label} → ${c.to}`).toBe(true)
      }
    }
  })
})
