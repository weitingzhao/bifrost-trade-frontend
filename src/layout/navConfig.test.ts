import { describe, expect, it } from 'vitest'
import { NAV_GROUPS } from './navConfig'
import { COPILOT_PAGES } from './researchNavCatalog'

const portfolio = NAV_GROUPS.find((g) => g.label === 'Portfolio')!

describe('Portfolio nav', () => {
  it('is two homes with their pages beneath and no section labels: the book under Performance, the ledger under Accounts', () => {
    expect(portfolio.subGroups).toBeUndefined()
    const [performance, accounts] = portfolio.items!
    expect(portfolio.items!.map((i) => i.to)).toEqual(['/portfolio/performance', '/portfolio/accounts'])
    expect(performance.children?.map((c) => c.to)).toEqual(['/portfolio/positions', '/portfolio/backing'])
    expect(accounts.children?.map((c) => c.to)).toEqual(['/portfolio/ledger', '/portfolio/transfer'])
  })
  it('does not carry the Copilot — that is a Copilot-seat page under Research', () => {
    const all = portfolio.items!.flatMap((i) => [i.to, ...(i.children?.map((c) => c.to) ?? [])])
    expect(all.some((to) => to?.includes('copilot'))).toBe(false)
    expect(COPILOT_PAGES.trading.to).toBe('/research/copilot/trading')
  })
})
