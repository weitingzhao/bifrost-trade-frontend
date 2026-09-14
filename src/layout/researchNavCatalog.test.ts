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
import { isSystemRoute } from './routeRegistry'
import {
  allResearchRoutes,
  BENCHES,
  buildResearchNavGroup,
  COPILOT_PAGES,
  MARKET_PAGES,
  seatForRoute,
  SEATLESS_ROUTES,
  seatItems,
  staticResearchSubGroups,
  WORKBENCH_LIFTED_FROM_DATA,
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
  workbench: '/research/workbench',
} as const

/** In every seat's menu; the trading route is a deep-link alias, not a row. */
const SEATLESS_MENU_ROWS = SEATLESS_ROUTES.filter((r) => r !== '/research/copilot/trading')

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
  it('splits every page across the two seats, each page in exactly one', () => {
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

  it('stands the seatless pages in both seats — they belong to no posture', () => {
    // Overview is about the seats; Market and the Copilot fold are about
    // neither — whether the session is open, and what the conversation has
    // deposited, are worth knowing from Autopilot as much as the bench.
    for (const seat of RESEARCH_SEATS) {
      const routes = routesOf(seatItems(seat, ctx))
      for (const r of SEATLESS_MENU_ROWS) expect(routes, `${r} missing from ${seat}`).toContain(r)
    }
    expect([...SEATLESS_ROUTES].sort()).toEqual(
      [
        OVERVIEW,
        MARKET_PAGES.live.to,
        MARKET_PAGES.radar.to,
        '/research/copilot',
        '/research/daily-brief',
        '/research/agent-personas',
        '/research/copilot/trading',
      ].sort(),
    )
  })

  it('shows Overview in every seat — it is the page about them all', () => {
    for (const seat of RESEARCH_SEATS) {
      expect(routesOf(seatItems(seat, ctx)), seat).toContain(OVERVIEW)
    }
  })

  it('brackets the open seat home with the seatless rows: Overview, home, Copilot, Market', () => {
    // The design's order since 2026-09-14 (`navGroups` in shell-registry.js):
    // Overview and the two seat-free folds state facts, so they sit either
    // side of the workflow.
    for (const seat of RESEARCH_SEATS) {
      const items = seatItems(seat, ctx)
      expect(items.map((i) => i.to), seat).toEqual([
        OVERVIEW,
        HOMES[seat],
        COPILOT_PAGES.desk.to,
        MARKET_PAGES.live.to,
      ])
      const home = items.find((i) => i.to === HOMES[seat])
      expect(home?.defaultOpen, seat).toBe(true)
      expect(home?.children?.length, seat).toBeGreaterThan(0)
    }
  })

  it('carries the Copilot fold in both seats: Desk · Daily Brief · Personas, one id', () => {
    // §11.0: conversation is an action, its sediment is pages. The fold is
    // seat-free like Market — same id everywhere, the design's own
    // `fold:copilot`. Playbook left for Trade (Owner (a), 2026-09-14).
    for (const seat of RESEARCH_SEATS) {
      const fold = flatten(seatItems(seat, ctx)).find((i) => i.id === 'fold:copilot')
      expect(fold, seat).toBeTruthy()
      expect(fold!.label, seat).toBe('Copilot')
      expect(fold!.children?.map((c) => [c.label, c.to]), seat).toEqual([
        ['Desk', '/research/copilot'],
        ['Daily Brief', '/research/daily-brief'],
        ['Personas', '/research/agent-personas'],
      ])
    }
  })

  it('lifts Signal Health out of Data on the bench, and only that one', () => {
    // It lifted by index. `data.items[1]` was Signal Health when that was
    // written and became Lens Coverage as soon as a row was inserted above it,
    // so the bench showed the wrong page for 39 commits and nothing here
    // noticed. The lift is by path now; this pins which page.
    expect(WORKBENCH_LIFTED_FROM_DATA).toBe('/research/signal-health')
    const top = seatItems('workbench', ctx).find((i) => i.to === HOMES.workbench)?.children ?? []
    const lifted = top.filter((i) => !i.id.startsWith('fold:')).map((i) => i.to)
    expect(lifted).toContain(WORKBENCH_LIFTED_FROM_DATA)

    const data = flatten(seatItems('workbench', ctx)).find((i) => i.label === 'Data')
    const inFold = (data?.children ?? []).map((i) => i.to)
    expect(inFold, 'the lifted page is still in the fold as well').not.toContain(
      WORKBENCH_LIFTED_FROM_DATA,
    )
    // Everything else stays put — a lift is one page, not a habit.
    const bench = BENCHES.find((b) => b.id === 'data')!
    expect([...inFold, WORKBENCH_LIFTED_FROM_DATA].sort()).toEqual(
      bench.items.map((i) => i.to).sort(),
    )
  })

  it('carries no other seat as a row', () => {
    for (const seat of RESEARCH_SEATS) {
      const mine = HOMES[seat]
      const others = Object.values(HOMES).filter((h) => h !== mine)
      for (const other of others) {
        expect(routesOf(seatItems(seat, ctx)), seat).not.toContain(other)
      }
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

  it('never lets a heading leave the business tree', () => {
    // A fold's row borrows its first child's route. `Data` led with Stock Data
    // Readiness, which is a `/system/*` page — so clicking the Research
    // heading `Data` navigated into System and swapped the entire sidebar for
    // the System tree. The row may cross (it is the one that earns it); the
    // heading may not.
    for (const seat of RESEARCH_SEATS) {
      for (const f of flatten(seatItems(seat, ctx)).filter((i) => i.children?.length)) {
        expect(isSystemRoute(f.to ?? ''), `${seat}: heading "${f.label}" -> ${f.to}`).toBe(false)
      }
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
    expect(folds.map((f) => f.label)).toEqual(['Analyze', 'Validate', 'Data', 'Copilot', 'Market'])
    for (const f of folds) {
      expect(f.to, f.label).toBe(f.children?.[0].to)
    }
    // Seat-keyed, so an open fold in one seat is not an open fold in the next
    // — except Copilot and Market, which are the same fold in every seat and
    // keep one id each.
    const perSeat = folds.filter((f) => f.label !== 'Market' && f.label !== 'Copilot')
    expect(perSeat.every((f) => f.id.startsWith('fold:workbench:'))).toBe(true)
    expect(flatten(seatItems('autopilot', ctx)).some((i) => i.id === 'fold:market')).toBe(true)
    expect(flatten(seatItems('autopilot', ctx)).some((i) => i.id === 'fold:copilot')).toBe(true)
  })
})

describe('the seat follows the route', () => {
  it('sends every page to the seat that carries it', () => {
    for (const seat of RESEARCH_SEATS) {
      for (const r of routesOf(seatItems(seat, ctx))) {
        if (SEATLESS.has(r)) continue
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
    // Market and the Copilot fold stand in both seats, so no seat may claim
    // them — landing on Live or Desk would otherwise drag the rail to
    // whichever listed it first.
    for (const r of SEATLESS_ROUTES) expect(seatForRoute(r), r).toBeNull()
    expect(seatForRoute('/research/agent-personas')).toBeNull()
    expect(seatForRoute('/research/copilot/trading')).toBeNull()
  })

  it('does not answer for routes outside Research', () => {
    expect(seatForRoute('/portfolio/performance')).toBeNull()
    expect(seatForRoute('/strategy/instances')).toBeNull()
    expect(seatForRoute('/trade/playbook')).toBeNull()
  })

  it('never lets the Copilot claim the whole domain', () => {
    // `?copilot=open` strips to `/research`, every Research route's prefix.
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
