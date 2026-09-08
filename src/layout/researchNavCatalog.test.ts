/**
 * The seat layouts, held to the Portfolio standard.
 *
 * Research used to open each seat with dead section headings — "Now",
 * "Objects", "Copilot · on request" — and two of the three sat directly above
 * a row of the same name that was a link and did the same job. The heading is
 * now the home page itself, as Portfolio has read since 2026-09-07.
 */
import { describe, expect, it } from 'vitest'
import { RESEARCH_SEATS } from '@/lib/research/seat'
import { allResearchRoutes, buildResearchNavGroup, seatItems, staticResearchSubGroups } from './researchNavCatalog'
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

/**
 * Every page a seat reaches.
 *
 * A fold is a category with no page of its own, so its row borrows its first
 * child's route; counting it would double that page. A home owns its route,
 * so it counts.
 */
function routesOf(items: ShellNavItem[]): string[] {
  const out: string[] = []
  const walk = (item: ShellNavItem) => {
    if (!item.id.startsWith('fold:')) out.push(item.to ?? item.id)
    for (const child of item.children ?? []) walk(child)
  }
  items.forEach(walk)
  return out
}

function flatten(items: ShellNavItem[]): ShellNavItem[] {
  return items.flatMap((i) => [i, ...flatten(i.children ?? [])])
}

describe('research seat layouts', () => {
  it('every seat reaches every Research route exactly once; the two model seats list the objectives', () => {
    const all = allResearchRoutes()
    for (const seat of RESEARCH_SEATS) {
      const routes = routesOf(seatItems(seat, ctx))
      const objectiveRoutes = routes.filter((r) => r.startsWith('/research/loop/objectives/'))
      const pageRoutes = routes.filter((r) => !r.startsWith('/research/loop/objectives/'))
      expect(new Set(pageRoutes).size, seat).toBe(pageRoutes.length)
      expect([...pageRoutes].sort(), seat).toEqual([...all].sort())
      expect(objectiveRoutes, seat).toEqual(
        seat === 'workbench' ? [] : ['/research/loop/objectives/obj-a', '/research/loop/objectives/obj-b'],
      )
    }
  })

  it('opens on the seat home, and the home is a page you can go to', () => {
    for (const seat of RESEARCH_SEATS) {
      const [first] = seatItems(seat, ctx)
      expect(first.to, seat).toBe(HOMES[seat])
      expect(first.defaultOpen, seat).toBe(true)
      expect(first.children?.length, seat).toBeGreaterThan(0)
    }
  })

  it('carries no section headings — a heading you cannot click is a wasted row', () => {
    for (const seat of RESEARCH_SEATS) {
      expect(buildResearchNavGroup(seat, ctx).subGroups, seat).toBeUndefined()
    }
  })

  it('the other two seats are present as folded homes, one click from their landing page', () => {
    for (const seat of RESEARCH_SEATS) {
      const items = seatItems(seat, ctx)
      const homes = items.filter((i) => i.id.startsWith('home:'))
      expect(homes.map((h) => h.to).sort(), seat).toEqual([...Object.values(HOMES)].sort())
      for (const h of homes.filter((h) => h.to !== HOMES[seat])) {
        expect(h.defaultOpen, `${seat} / ${h.label}`).toBe(false)
      }
    }
  })

  it('ends on Overview', () => {
    for (const seat of RESEARCH_SEATS) {
      const items = seatItems(seat, ctx)
      expect(items[items.length - 1].to, seat).toBe('/research/overview')
    }
  })

  it('folded categories land on their first page and carry the rest as children', () => {
    const folds = flatten(seatItems('autopilot', ctx)).filter((i) => i.id.startsWith('fold:'))
    expect(folds.map((f) => f.label)).toEqual(['Objectives', 'Analyze', 'Validate', 'Data'])
    expect(folds.every((f) => f.id.startsWith('fold:autopilot:'))).toBe(true)
    for (const f of folds) {
      expect(f.to, f.label).toBeTruthy()
      expect(f.children?.length, f.label).toBeGreaterThan(0)
    }
  })

  it('drops the Objectives fold when there is nothing to list', () => {
    const folds = flatten(seatItems('autopilot', { objectives: [] })).filter((i) => i.label === 'Objectives')
    expect(folds).toEqual([])
  })

  it('the seat-less layout lists the three levels top down', () => {
    expect(staticResearchSubGroups().map((s) => s.label)).toEqual([
      '',
      'Autopilot · unattended',
      'Copilot · on request',
      'Workbench · Discover',
      'Workbench · Analyze',
      'Workbench · Validate',
      'Workbench · Data',
    ])
  })
})
