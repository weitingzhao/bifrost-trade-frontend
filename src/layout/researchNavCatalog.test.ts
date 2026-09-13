/**
 * One page, one row, one lit seat.
 *
 * The menu used to carry all twenty-seven Research pages in every seat, the
 * other two seats folded into a row each — so sitting in Autopilot, half the
 * top-level rows were menus for postures you were not in, and the rail above
 * already offered them. Each seat now carries its own pages only, and the seat
 * follows the route so nothing goes missing.
 */
import { describe, expect, it } from 'vitest'
import { RESEARCH_SEATS } from '@/lib/research/seat'
import {
  allResearchRoutes,
  buildResearchNavGroup,
  MARKET_PAGES,
  seatForRoute,
  SEATLESS_ROUTES,
  seatItems,
  staticResearchSubGroups,
} from './researchNavCatalog'
import type { ShellNavItem } from '@bifrost/ui'

const ctx = {
  objectives: [
    { id: 'obj-a', title: 'Daily Loop Stock Explorer' },
    { id: 'obj-b', title: 'Morning IV Hot Watch' },
  ],
}

const HOMES = {
  autopilot: '/research/loop/harness',
  copilot: '/research/copilot',
  workbench: '/research/workbench',
} as const

const OVERVIEW = '/research/overview'
const SEATLESS = new Set<string>(SEATLESS_ROUTES)

function flatten(items: ShellNavItem[]): ShellNavItem[] {
  return items.flatMap((i) => [i, ...flatten(i.children ?? [])])
}

/**
 * Every page a seat reaches. A fold owns no page — its row borrows its first
 * child's route — so counting it would count that page twice.
 */
function routesOf(items: ShellNavItem[]): string[] {
  return flatten(items)
    .filter((i) => !i.id.startsWith('fold:'))
    .map((i) => i.to ?? i.id)
}

describe('a seat carries its own pages and no others', () => {
  it('splits every page across the three seats, each page in exactly one', () => {
    const seen = new Map<string, string[]>()
    for (const seat of RESEARCH_SEATS) {
      for (const r of routesOf(seatItems(seat, ctx))) {
        if (SEATLESS.has(r) || r.startsWith('/research/loop/objectives/')) continue
        seen.set(r, [...(seen.get(r) ?? []), seat])
      }
    }
    for (const [route, seats] of seen) {
      expect(seats, `${route} appears in ${seats.join(' and ')}`).toHaveLength(1)
    }
    expect([...seen.keys()].sort()).toEqual(
      allResearchRoutes()
        .filter((r) => !SEATLESS.has(r))
        .sort(),
    )
  })

  it('stands the seatless pages in all three — they belong to no posture', () => {
    // Overview is about the three seats; Market is about neither — whether the
    // session is open is worth knowing from Autopilot as much as the bench.
    for (const seat of RESEARCH_SEATS) {
      const routes = routesOf(seatItems(seat, ctx))
      for (const r of SEATLESS_ROUTES) expect(routes, `${r} missing from ${seat}`).toContain(r)
    }
    expect([...SEATLESS_ROUTES].sort()).toEqual(
      [OVERVIEW, MARKET_PAGES.live.to, MARKET_PAGES.radar.to].sort(),
    )
  })

  it('shows Overview in every seat — it is the page about all three', () => {
    for (const seat of RESEARCH_SEATS) {
      expect(routesOf(seatItems(seat, ctx)), seat).toContain(OVERVIEW)
    }
  })

  it('leads with the seat home, open, then only the seatless rows', () => {
    for (const seat of RESEARCH_SEATS) {
      const items = seatItems(seat, ctx)
      expect(items.map((i) => i.to), seat).toEqual([
        HOMES[seat],
        MARKET_PAGES.live.to,
        OVERVIEW,
      ])
      expect(items[0].defaultOpen, seat).toBe(true)
      expect(items[0].children?.length, seat).toBeGreaterThan(0)
    }
  })

  it('carries no other seat as a row', () => {
    for (const seat of RESEARCH_SEATS) {
      const mine = HOMES[seat]
      const others = Object.values(HOMES).filter((h) => h !== mine)
      expect(routesOf(seatItems(seat, ctx)), seat).not.toContain(others[0])
      expect(routesOf(seatItems(seat, ctx)), seat).not.toContain(others[1])
    }
  })

  it('carries no section headings — a heading you cannot click is a wasted row', () => {
    for (const seat of RESEARCH_SEATS) {
      expect(buildResearchNavGroup(seat, ctx).subGroups, seat).toBeUndefined()
    }
  })
})

describe('no page lights two rows', () => {
  it('gives every row a route of its own, folds excluded', () => {
    for (const seat of RESEARCH_SEATS) {
      const routes = routesOf(seatItems(seat, ctx))
      expect(new Set(routes).size, seat).toBe(routes.length)
    }
  })

  it('sends Objectives to an objective, not to the console above it', () => {
    // It used to borrow the Autopilot home's route, so standing on the console
    // lit both rows and either one went to the same page.
    const [objectives] = flatten(seatItems('autopilot', ctx)).filter((i) => i.label === 'Objectives')
    expect(objectives.to).toBe('/research/loop/objectives/obj-a')
    expect(objectives.to).not.toBe(HOMES.autopilot)
  })

  it('drops the Objectives row when there is nothing to list', () => {
    expect(flatten(seatItems('autopilot', { objectives: [] })).filter((i) => i.label === 'Objectives')).toEqual([])
  })

  it('folded categories land on their first page and carry the rest', () => {
    const folds = flatten(seatItems('workbench', ctx)).filter((i) => i.id.startsWith('fold:'))
    expect(folds.map((f) => f.label)).toEqual(['Analyze', 'Validate', 'Data', 'Market'])
    for (const f of folds) {
      expect(f.to, f.label).toBe(f.children?.[0].to)
    }
    // Seat-keyed, so an open fold in one seat is not an open fold in the next
    // — except Market, which is the same fold in all three and keeps one id.
    const perSeat = folds.filter((f) => f.label !== 'Market')
    expect(perSeat.every((f) => f.id.startsWith('fold:workbench:'))).toBe(true)
    expect(flatten(seatItems('autopilot', ctx)).some((i) => i.id === 'fold:market')).toBe(true)
  })
})

describe('the seat follows the route', () => {
  it('sends every page to the seat that carries it', () => {
    for (const seat of RESEARCH_SEATS) {
      for (const r of routesOf(seatItems(seat, ctx))) {
        if (SEATLESS.has(r)) continue
        // "Ask the Copilot" is a command, not a page: its path is the Research
        // root, which belongs to no seat.
        if (r.startsWith('/research?')) continue
        expect(seatForRoute(r), `${r} in ${seat}`).toBe(seat)
      }
    }
  })

  it('follows an objective row to Autopilot', () => {
    expect(seatForRoute('/research/loop/objectives/obj-a')).toBe('autopilot')
  })

  it('leaves the rail alone on the seatless pages', () => {
    expect(seatForRoute(OVERVIEW)).toBeNull()
    expect(seatForRoute('/research')).toBeNull()
    // Market stands in all three seats, so no seat may claim it — landing on
    // Live would otherwise drag the rail to whichever listed it first.
    for (const r of SEATLESS_ROUTES) expect(seatForRoute(r), r).toBeNull()
  })

  it('does not answer for routes outside Research', () => {
    expect(seatForRoute('/portfolio/performance')).toBeNull()
    expect(seatForRoute('/strategy/instances')).toBeNull()
  })

  it('never lets the Copilot claim the whole domain', () => {
    // "Ask the Copilot" strips to `/research`, every Research route's prefix.
    expect(seatForRoute('/research/workbench')).toBe('workbench')
    expect(seatForRoute('/research/loop/harness')).toBe('autopilot')
  })

  it('matches on whole segments, not on characters', () => {
    expect(seatForRoute('/research/scanner-that-does-not-exist')).toBeNull()
  })
})

describe('the seat-less layout', () => {
  it('lists the three levels top down for the top nav and the home page', () => {
    expect(staticResearchSubGroups().map((s) => s.label)).toEqual([
      '',
      'Market',
      'Autopilot · unattended',
      'Copilot · on request',
      'Workbench · Discover',
      'Workbench · Analyze',
      'Workbench · Validate',
      'Workbench · Data',
    ])
  })
})
