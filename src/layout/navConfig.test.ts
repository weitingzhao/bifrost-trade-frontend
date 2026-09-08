import { describe, expect, it } from 'vitest'
import { NAV_GROUPS } from './navConfig'
import { COPILOT_PAGES } from './researchNavCatalog'

const portfolio = NAV_GROUPS.find((g) => g.label === 'Portfolio')!

describe('Portfolio nav', () => {
  it('is two homes, each with its pages beneath: the book under Performance, the ledger under Accounts', () => {
    expect(portfolio.subGroups?.map((s) => s.label)).toEqual(['Book', 'Ledger'])
    const [book, ledger] = portfolio.subGroups!
    expect(book.items.map((i) => i.to)).toEqual(['/portfolio/performance'])
    expect(book.items[0].children?.map((c) => c.to)).toEqual(['/portfolio/positions', '/portfolio/backing'])
    expect(ledger.items.map((i) => i.to)).toEqual(['/portfolio/accounts'])
    expect(ledger.items[0].children?.map((c) => c.to)).toEqual(['/portfolio/ledger', '/portfolio/transfer'])
  })
  it('does not carry the Copilot — that is a Copilot-seat page under Research', () => {
    const all = portfolio.subGroups!.flatMap((s) => s.items.flatMap((i) => [i.to, ...(i.children?.map((c) => c.to) ?? [])]))
    expect(all.some((to) => to?.includes('copilot'))).toBe(false)
    expect(COPILOT_PAGES.trading.to).toBe('/research/copilot/trading')
  })
})
