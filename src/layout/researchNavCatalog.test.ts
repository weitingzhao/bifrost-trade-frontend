import { describe, expect, it } from 'vitest'
import { getAllNavItems } from '@bifrost/ui'
import { RESEARCH_SEATS } from '@/lib/research/seat'
import { allResearchRoutes, buildResearchNavGroup, staticResearchSubGroups } from './researchNavCatalog'

const ctx = {
  objectives: [
    { id: 'obj-a', title: 'Daily Loop Stock Explorer' },
    { id: 'obj-b', title: 'Morning IV Hot Watch' },
  ],
}

function routesOf(group: ReturnType<typeof buildResearchNavGroup>): string[] {
  const out: string[] = []
  for (const item of getAllNavItems(group)) {
    if (item.children?.length) {
      for (const c of item.children) out.push(c.to ?? c.id)
    } else {
      out.push(item.to ?? item.id)
    }
  }
  return out
}

describe('research seat layouts', () => {
  it('every seat reaches every Research route exactly once; the two model seats list the objectives', () => {
    const all = allResearchRoutes()
    for (const seat of RESEARCH_SEATS) {
      const routes = routesOf(buildResearchNavGroup(seat, ctx))
      const objectiveRoutes = routes.filter((r) => r.startsWith('/research/loop/objectives/'))
      const pageRoutes = routes.filter((r) => !r.startsWith('/research/loop/objectives/'))
      expect(new Set(pageRoutes).size, seat).toBe(pageRoutes.length)
      expect([...pageRoutes].sort(), seat).toEqual([...all].sort())
      expect(objectiveRoutes, seat).toEqual(
        seat === 'workbench' ? [] : ['/research/loop/objectives/obj-a', '/research/loop/objectives/obj-b'],
      )
    }
  })

  it('opens with Now, and Now holds the seat home', () => {
    const homes = { autopilot: '/research/loop/harness', copilot: '/research/daily-brief', workbench: '/research/explorer' }
    for (const seat of RESEARCH_SEATS) {
      const g = buildResearchNavGroup(seat, ctx)
      expect(g.subGroups?.[0].label).toBe('Now')
      expect(g.subGroups?.[0].items.map((i) => i.to)).toContain(homes[seat])
    }
  })

  it('folded entries land on their first page and carry the rest as children', () => {
    const g = buildResearchNavGroup('autopilot', ctx)
    const folds = getAllNavItems(g).filter((i) => i.id.startsWith('fold:'))
    expect(folds.map((f) => f.label)).toEqual(['Objectives', 'Copilot', 'Discover', 'Analyze', 'Validate', 'Data'])
    for (const f of folds) {
      expect(f.to, f.label).toBeTruthy()
      expect(f.children?.length, f.label).toBeGreaterThan(0)
    }
  })

  it('the seat-less layout lists the three levels top down', () => {
    expect(staticResearchSubGroups().map((s) => s.label)).toEqual([
      'Autopilot · unattended',
      'Copilot · on request',
      'Workbench · Discover',
      'Workbench · Analyze',
      'Workbench · Validate',
      'Workbench · Data',
    ])
  })
})
