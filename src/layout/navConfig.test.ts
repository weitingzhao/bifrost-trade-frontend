import { describe, expect, it } from 'vitest'
import { NAV_GROUPS, SYSTEM_NAV_GROUPS } from './navConfig'
import { isSystemRoute, routeFor } from './routeRegistry'
import { COPILOT_DESK } from './researchNavCatalog'

const trade = NAV_GROUPS.find((g) => g.label === 'Trade')!
const portfolio = NAV_GROUPS.find((g) => g.label === 'Portfolio')!

/** Every route a group reaches, parents included. */
function routesOf(group: (typeof NAV_GROUPS)[number]): (string | undefined)[] {
  return (group.items ?? []).flatMap((i) => [i.to, ...(i.children?.map((c) => c.to) ?? [])])
}

describe('Trade nav', () => {
  it('stands before Portfolio, with Playbook as the only row', () => {
    // Owner (a), 2026-09-14: new top-level Trade group, design order Home ·
    // Trade · Portfolio · Research · …, one row until the rest of Trade exists.
    // Risk joined 2026-09-17 with its first built row (Portfolio Exposure); the
    // design files it as its own group of six, after Portfolio.
    // Home joined 2026-09-17 at the head, where the design's order puts it: it
    // belongs to no layer and cuts across all five by time of day.
    // Review joined 2026-09-17 with all five of its rows, filed after Risk as
    // the design has it: what was closed, and what it argues for.
    // Strategy left on 2026-09-18 when its seven pages retired into the chain,
    // so the business tree is the design's six groups and nothing else.
    expect(NAV_GROUPS.map((g) => g.label)).toEqual([
      'Home',
      'Trade',
      'Portfolio',
      'Risk',
      'Review',
      'Research',
    ])
    // The heading is the Desk (§5a.1): the layer wrapped exactly one row and
    // that row was the layer, so the six pages came up a level. Plans first,
    // because a trade starts as a plan, and Assignment last, where one ends
    // when it goes to stock.
    expect(trade.to).toBe('/trade/desk')
    expect(trade.items!.map((c) => [c.label, c.to])).toEqual([
      ['Plans', '/trade/plans'],
      ['Orders & Fills', '/trade/fills'],
      ['Rules', '/trade/rules'],
      ['Playbook', '/trade/playbook'],
      ['Expiration', '/trade/expiration'],
      ['Assignment', '/trade/assignment'],
    ])
    const entry = routeFor('/trade/playbook')
    expect(entry.path).toBe('/trade/playbook')
    expect(entry.redirect ?? false).toBe(false)
  })

  it('keeps the old Copilot address as a one-hop redirect onto Playbook', () => {
    const retired = routeFor('/research/playbook')
    expect(retired.redirect).toBe('/trade/playbook')
    expect(routeFor(retired.redirect!).redirect ?? false).toBe(false)
  })
})

describe('Portfolio nav', () => {
  it('is two homes with their pages beneath and no section labels: the book under Performance, the ledger under Accounts', () => {
    expect(portfolio.subGroups).toBeUndefined()
    // The layer's own page is its heading now (§5a.1), so the stand-in row
    // retired and the two folds are the whole list again.
    expect(portfolio.to).toBe('/portfolio')
    const [performance, accounts] = portfolio.items!
    expect(portfolio.items!.map((i) => i.to)).toEqual([
      '/portfolio/performance',
      '/portfolio/accounts',
    ])
    expect(performance.children?.map((c) => c.to)).toEqual([
      '/portfolio/positions',
      '/portfolio/pnl-explain',
      '/portfolio/backing',
      '/portfolio/outcome',
    ])
    // Corporate Actions sits with the ledger, where the design files it: what
    // the broker did to the book, beside what was traded and what cash moved.
    expect(accounts.children?.map((c) => c.to)).toEqual([
      '/portfolio/ledger',
      '/portfolio/transfer',
      '/portfolio/corporate-actions',
    ])
    expect([performance.defaultOpen, accounts.defaultOpen]).toEqual([true, true])
  })
  it('does not carry the Copilot — its pages live under Research, in the seat-free fold', () => {
    const all = routesOf(portfolio)
    expect(all.some((to) => to?.includes('copilot'))).toBe(false)
    // The Desk is the Copilot fold itself now (§5a), not a row beneath it.
    expect(COPILOT_DESK).toBe('/research/copilot')
    // Out of the menu (Design 2026-09-14 ①) but still a route — reached from
    // the panel empty state's "all starters →" link.
    expect(routeFor('/research/copilot/trading').path).toBe('/research/copilot/trading')
  })
})

describe('Risk nav', () => {
  it('reads forwards through a decision, which is the design’s own order', () => {
    // shell-registry `G.Risk`. The app had the reverse — the measurements
    // first — which is the order you read after the fact rather than before.
    const risk = NAV_GROUPS.find((g) => g.label === 'Risk')!
    // The layer's own page is its heading (§5a.1); the six rows are the six.
    expect(risk.to).toBe('/risk')
    expect(risk.items!.map((i) => i.to)).toEqual([
      '/risk/sizing',
      '/risk/budget',
      '/risk/limits',
      '/risk/margin',
      '/risk/portfolio',
      '/risk/stress',
    ])
    // Flat, like the design: no page in this group is read through another.
    expect(risk.items!.every((i) => !i.children?.length)).toBe(true)
  })
})

describe('Strategy, retired', () => {
  it('has no group of its own — the seven pages dissolved into the chain', () => {
    // Design DECISIONS 2026-09-12 and 2026-09-18. The group went on
    // 2026-09-18, once every capability it carried had a home: the chain and
    // its edit sheets, the shared instance sheet on Positions, Playbook stats,
    // and the Desk.
    expect(NAV_GROUPS.some((g) => g.label === 'Strategy')).toBe(false)
    expect(NAV_GROUPS.flatMap(routesOf).some((to) => to?.startsWith('/strategy/'))).toBe(false)
  })

  it('forwards each old address to where its subject now lives, in one hop', () => {
    // Not all to one page: Win Rate became a cut of Playbook stats, and the
    // whole instance book is a pick on the chain.
    const target = (path: string) => routeFor(path).redirect
    expect(target('/strategy/instances')).toBe('/trade/rules?pick=instance:all')
    expect(target('/strategy/win-rate')).toBe('/review/playbook-stats?cut=structure')
    for (const p of ['/strategy/allocations', '/strategy/opportunities', '/strategy/structures', '/strategy/gates', '/strategy/option-category']) {
      expect(target(p), p).toBe('/trade/rules')
    }
  })
})

// ── System ──────────────────────────────────────────────────────────────────

const system = SYSTEM_NAV_GROUPS[0]

/** Every destination the System tree offers, folds and leaves alike. */
function systemDestinations(): string[] {
  return (system.items ?? []).flatMap((i) => [i.to!, ...(i.children?.map((c) => c.to!) ?? [])])
}

describe('System nav', () => {
  it('is one group: the landing, then five folds — what we hold, who reads it, whether it answers, what it was told, and the reading', () => {
    expect(SYSTEM_NAV_GROUPS).toHaveLength(1)
    expect(system.label).toBe('System')
    // Agents arrived 2026-09-22 (§5a.8): the roster and the wiring diagram are
    // the operator's and the engineer's pages, and a trader's tree is the one
    // place they do not belong. Status arrived the same day, built against the
    // design — it is the group's landing (Owner ruling 2026-09-15: System
    // collapses to it and Settings), so it sits above the folds rather than
    // inside one: the three questions come before the machinery that answers
    // how.
    expect(system.items!.map((i) => i.label)).toEqual([
      'System Status',
      'Settings',
      'Data',
      'Alignment',
      'Agents',
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
      '/system/status',
      '/settings',
      'system:data',
      'system:alignment',
      'system:agents',
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

  it('is not a ninth business group, and no business row crosses into it', () => {
    expect(NAV_GROUPS.some((g) => g.label === 'System')).toBe(false)
    const business = NAV_GROUPS.flatMap((g) => [
      ...(g.items ?? []).flatMap((i) => [i.to, ...(i.children?.map((c) => c.to) ?? [])]),
      ...(g.subGroups ?? []).flatMap((sg) =>
        (sg.items ?? []).flatMap((i) => [i.to, ...(i.children?.map((c) => c.to) ?? [])]),
      ),
    ])
    // Clicking one of these swaps the sidebar out from under the reader, so
    // the set is pinned rather than merely allowed — and it is now empty.
    // Data Readiness used to earn the crossing, on the argument that "is the
    // data there" is asked from both sides; what it actually had was a second
    // row for a page System already listed. The design's Data move (package
    // 2026-09-20.1) retired the duplicate rather than the argument.
    expect(business.filter((to) => to != null && isSystemRoute(to))).toEqual([])
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
    // `/settings` itself left this list on 2026-09-22: it is the design's own
    // address for the collapse's second half and a real page now. Its children
    // are still the old names and still redirect.
    const renamed = [
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

const review = NAV_GROUPS.find((g) => g.label === 'Review')!

describe('Review nav', () => {
  it('is the Queue as its heading, with the other four beneath it', () => {
    // §5a.1: the heading is the page. The Queue row retired into it.
    // Objectives joined 2026-09-20 and left for Home at Rev .55 — an
    // objective is the whole desk's working object, not this layer's.
    expect(review.to).toBe('/review')
    expect(review.items!.map((c) => c.to)).toEqual([
      '/review/fit',
      '/review/habits',
      '/review/playbook-stats',
      // One inbox, not two (§5a.8): Decision Inbox replaced Rule proposals
      // here — the same act with a row each, because the engine touches both
      // ends of the loop. `/review/proposals` stays a route and a deep link
      // until its rows fold into the Inbox page.
      '/research/loop/decisions',
    ])
  })
})

describe('Home nav', () => {
  it('opens with Objectives, then the market clock (Rev .55)', () => {
    const home = NAV_GROUPS.find((g) => g.label === 'Home')!
    expect(home.items!.map((c) => c.to)).toEqual(['/review/objectives', '/research/events', '/research/daily-brief'])
  })
})
