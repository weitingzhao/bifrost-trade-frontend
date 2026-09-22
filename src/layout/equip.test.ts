/**
 * The rail's table, and the promise taking three folds out of the tree makes.
 *
 * The design's first attempt at §5a.8 failed in one round because the Copilot's
 * pages lost their entrance entirely. That is the failure this file exists to
 * prevent: every route the rail claims has to be a page that exists, and every
 * page the equipment owns has to be claimed by exactly one surface.
 */
import { describe, expect, it } from 'vitest'
import { EQUIP_GROUPS, EQUIP_HUE, equipGroupOf, equipRoutes } from './equip'
import { ROUTES } from './routeTable'

const byPath = new Map(ROUTES.map((r) => [r.path, r]))

describe('the companion rail', () => {
  it('is three groups, in the design order: will, memory, instrument', () => {
    // The order is the Owner's criterion: what has state that changes without
    // my hand comes first, and it is the only one that earns an indicator.
    expect(EQUIP_GROUPS.map((g) => g.id)).toEqual(['autopilot', 'book', 'copilot'])
    expect(EQUIP_GROUPS.map((g) => g.label)).toEqual(['Autopilot', 'The Book', 'Copilot'])
  })

  it('gives every group a hue of its own, and none of them a rainbow inside', () => {
    const hues = EQUIP_GROUPS.map((g) => EQUIP_HUE[g.id])
    expect(new Set(hues).size).toBe(3)
    // The buttons do not carry their own colours: in this design system a
    // colour variation is a meaning, so a row of hues reads as status lamps.
    for (const g of EQUIP_GROUPS) {
      expect(Object.keys(g.hub)).not.toContain('hue')
      for (const p of g.pages) expect(Object.keys(p)).not.toContain('hue')
    }
  })

  it('opens a page that exists and is not a redirect', () => {
    // The contract the tree has always had, now owed by the rail too: an icon
    // navigates. A route with no entry lands on the fallback; a redirect-only
    // one makes the URL jump the moment you arrive.
    for (const to of equipRoutes()) {
      const entry = byPath.get(to)
      expect(entry, `${to} has no registry entry`).toBeDefined()
      expect(entry?.redirect ?? false, `${to} is redirect-only`).toBe(false)
    }
  })

  it('claims nine pages — the design\u2019s eleven less what this app has not built', () => {
    // Loop Run has no route here at all, so the rail would be offering a door
    // to nothing; the design draws it as a drawer over the Console. Objectives
    // are reached from the Console, which is their roster — a data row is not
    // a place, so they are not icons in either design.
    expect(equipRoutes()).toHaveLength(9)
    expect(equipRoutes()).not.toContain('/research/loop/runs')
  })

  it('answers which group a page belongs to, and nothing for a page that is not equipment', () => {
    expect(equipGroupOf('/research/watchlist')?.id).toBe('book')
    expect(equipGroupOf('/research/loop/harness')?.id).toBe('autopilot')
    expect(equipGroupOf('/research/symbol')).toBeNull()
    expect(equipGroupOf('/portfolio/positions')).toBeNull()
    // Data pages the group owns without an icon: standing on an objective is
    // standing inside Autopilot, and the rail's frame has to say so.
    expect(equipGroupOf('/research/loop/objectives/obj-1')?.id).toBe('autopilot')
    expect(equipGroupOf('/research/loop/runs/42')?.id).toBe('autopilot')
    // And the prefix is explicit for a reason — two of The Book's pages sit
    // under `/research/loop/` too.
    expect(equipGroupOf('/research/loop/hypotheses')?.id).toBe('book')
  })

  it('carries a float size for the two list pages the design grades Phone', () => {
    // Not used until the float lands, and carried now so the table does not
    // have to be revisited to grow it. Phone is the grade for a page you scan
    // or act one row of; Pad is for the tables.
    const phones = EQUIP_GROUPS.flatMap((g) => [g.hub, ...g.pages]).filter(
      (p) => p.size === 'phone',
    )
    expect(phones.map((p) => p.to)).toEqual(['/research/loop/decisions', '/research/watchlist'])
  })
})
