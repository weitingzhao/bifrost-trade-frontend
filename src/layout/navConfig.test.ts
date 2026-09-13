import { describe, expect, it } from 'vitest'
import { NAV_GROUPS, SYSTEM_NAV_GROUPS } from './navConfig'
import { isSystemRoute, routeFor } from './routeRegistry'
import { COPILOT_PAGES } from './researchNavCatalog'

const portfolio = NAV_GROUPS.find((g) => g.label === 'Portfolio')!
const strategy = NAV_GROUPS.find((g) => g.label === 'Strategy')!

/** Every route a group reaches, parents included. */
function routesOf(group: (typeof NAV_GROUPS)[number]): (string | undefined)[] {
  return (group.items ?? []).flatMap((i) => [i.to, ...(i.children?.map((c) => c.to) ?? [])])
}

describe('Portfolio nav', () => {
  it('is two homes with their pages beneath and no section labels: the book under Performance, the ledger under Accounts', () => {
    expect(portfolio.subGroups).toBeUndefined()
    const [performance, accounts] = portfolio.items!
    expect(portfolio.items!.map((i) => i.to)).toEqual(['/portfolio/performance', '/portfolio/accounts'])
    expect(performance.children?.map((c) => c.to)).toEqual(['/portfolio/positions', '/portfolio/backing'])
    expect(accounts.children?.map((c) => c.to)).toEqual(['/portfolio/ledger', '/portfolio/transfer'])
    expect([performance.defaultOpen, accounts.defaultOpen]).toEqual([true, true])
  })
  it('does not carry the Copilot — that is a Copilot-seat page under Research', () => {
    const all = routesOf(portfolio)
    expect(all.some((to) => to?.includes('copilot'))).toBe(false)
    expect(COPILOT_PAGES.trading.to).toBe('/research/copilot/trading')
  })
})

describe('Strategy nav', () => {
  it('is two homes with their pages beneath and no section labels', () => {
    expect(strategy.subGroups).toBeUndefined()
    const [instances, allocations] = strategy.items!
    expect(strategy.items!.map((i) => i.to)).toEqual(['/strategy/instances', '/strategy/allocations'])
    expect([instances.defaultOpen, allocations.defaultOpen]).toEqual([true, true])
  })

  it('puts how it has gone under what is running, and the parts under what was assembled', () => {
    const [instances, allocations] = strategy.items!
    expect(instances.children?.map((c) => c.to)).toEqual(['/strategy/win-rate'])
    // The chain the domain is built on, outermost first: an allocation
    // bundles opportunities, an opportunity names a structure, a structure
    // comes from the category catalog, and gates bound the whole thing.
    expect(allocations.children?.map((c) => c.to)).toEqual([
      '/strategy/opportunities',
      '/strategy/structures',
      '/strategy/option-category',
      '/strategy/gates',
    ])
  })

  it('still reaches all seven pages, each exactly once', () => {
    const routes = routesOf(strategy)
    expect(new Set(routes).size).toBe(routes.length)
    expect([...routes].sort()).toEqual(
      [
        '/strategy/allocations',
        '/strategy/gates',
        '/strategy/instances',
        '/strategy/option-category',
        '/strategy/opportunities',
        '/strategy/structures',
        '/strategy/win-rate',
      ].sort(),
    )
  })
})

// ── System ──────────────────────────────────────────────────────────────────

const system = SYSTEM_NAV_GROUPS[0]

/** Every destination the System tree offers, folds and leaves alike. */
function systemDestinations(): string[] {
  return (system.items ?? []).flatMap((i) => [i.to!, ...(i.children?.map((c) => c.to!) ?? [])])
}

describe('System nav', () => {
  it('is one group of four folds — what we hold, whether it answers, what it was told, and the reading', () => {
    expect(SYSTEM_NAV_GROUPS).toHaveLength(1)
    expect(system.label).toBe('System')
    expect(system.items!.map((i) => i.label)).toEqual([
      'Data',
      'Runtime',
      'Configuration',
      'Reference',
    ])
  })

  it('gives every fold an id of its own, so a fold and its first row are two rows', () => {
    // `route()` keys an item by its path, and three of the four folds share a
    // path with their first child. Colliding ids would collapse them into one
    // row in React and in the open-groups store.
    const ids = (system.items ?? []).flatMap((i) => [i.id, ...(i.children?.map((c) => c.id) ?? [])])
    expect(new Set(ids).size).toBe(ids.length)
    expect(system.items!.map((i) => i.id)).toEqual([
      'system:data',
      'system:runtime',
      'system:config',
      'system:reference',
    ])
  })

  it('every row leads to a page that exists and is not a redirect', () => {
    // The contract the old sidebar broke: a nav row navigates. A row pointing
    // at a path with no entry lands on the fallback; one pointing at a
    // redirect-only path makes the URL bar jump the moment you arrive.
    for (const to of systemDestinations()) {
      const entry = routeFor(to)
      expect(entry.path, `${to} has no registry entry`).toBe(to)
      expect(entry.redirect ?? false, `${to} is redirect-only`).toBe(false)
    }
  })

  it('every row is inside the tree it swaps in for', () => {
    // If a System row pointed outside `/system/*` and `/docs/*`, clicking it
    // would swap the sidebar back to the business tree mid-navigation.
    for (const to of systemDestinations()) {
      expect(isSystemRoute(to), `${to} would swap the tree back`).toBe(true)
    }
  })

  it('is not a ninth business group, and exactly one business row crosses into it', () => {
    expect(NAV_GROUPS.some((g) => g.label === 'System')).toBe(false)
    const business = NAV_GROUPS.flatMap((g) => [
      ...(g.items ?? []).flatMap((i) => [i.to, ...(i.children?.map((c) => c.to) ?? [])]),
      ...(g.subGroups ?? []).flatMap((sg) =>
        (sg.items ?? []).flatMap((i) => [i.to, ...(i.children?.map((c) => c.to) ?? [])]),
      ),
    ])
    // Clicking one of these swaps the sidebar out from under the reader, so
    // the set is pinned rather than merely allowed. Data Readiness earns it:
    // the page is Research's, but "is the data there" is asked from both
    // sides. It already left the business shell before this — it pointed at
    // `/settings/data-readiness`, which opened the second shell entirely.
    expect(business.filter((to) => to != null && isSystemRoute(to))).toEqual([
      '/system/data-readiness',
    ])
  })
})

describe('isSystemRoute', () => {
  it('claims the System tree and the reference pages it holds, and nothing else', () => {
    expect(isSystemRoute('/system/topology')).toBe(true)
    expect(isSystemRoute('/docs/tech-stack')).toBe(true)
    expect(isSystemRoute('/portfolio/positions')).toBe(false)
    expect(isSystemRoute('/research')).toBe(false)
    // `/system` and `/docs` bare are not routes; the prefixes carry a slash so
    // a future `/systems-something` cannot be swallowed by accident.
    expect(isSystemRoute('/systemic')).toBe(false)
  })
})

describe('the old names', () => {
  it('still resolve, so bookmarks predating the rename do not 404', () => {
    const renamed = [
      '/settings',
      '/settings/coverage',
      '/settings/feed',
      '/settings/data-readiness',
      '/settings/ib',
      '/settings/api',
      '/settings/socket',
      '/settings/daemon',
      '/operations/daemon',
      '/operations/platform',
    ]
    for (const path of renamed) {
      const entry = routeFor(path)
      expect(entry.path, `${path} fell through to the fallback`).toBe(path)
      expect(entry.redirect, `${path} should be redirect-only now`).toBeTruthy()
    }
  })
})
