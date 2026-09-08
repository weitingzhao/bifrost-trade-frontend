import { describe, expect, it } from 'vitest'
import { NAV_GROUPS } from './navConfig'
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
