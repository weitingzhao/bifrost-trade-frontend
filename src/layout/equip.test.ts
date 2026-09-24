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
  it('is four groups, in the design order: will, memory, instrument, tape', () => {
    // The order is the Owner's criterion: what has state that changes without
    // my hand comes first. Market joined fourth at Rev 2026-09-23.7 (§5a.10,
    // option B): Live and Alerts left Home for the rail — the left rail is
    // where you stand, the right rail is what you glance at beside the page —
    // and both change without your hand, which is what earns the group its
    // feed dot and its amber fired-today count.
    expect(EQUIP_GROUPS.map((g) => g.id)).toEqual(['autopilot', 'book', 'copilot', 'market'])
    expect(EQUIP_GROUPS.map((g) => g.label)).toEqual(['Autopilot', 'The Book', 'Copilot', 'Market'])
  })

  it('says on every head what the module is and which key opens it', () => {
    // Rev .26: the dock's tooltips print the alt-digit key, as the Omnibar prints its own.
    EQUIP_GROUPS.forEach((g, i) => expect(g.title, g.id).toContain(String(i + 1)))
  })

  it('gives every group a hue of its own, and none of them a rainbow inside', () => {
    const hues = EQUIP_GROUPS.map((g) => EQUIP_HUE[g.id])
    expect(new Set(hues).size).toBe(4)
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

  it('claims eleven pages — the design\u2019s thirteen less what this app has not built', () => {
    // Loop Run has no route here at all, so the rail would be offering a door
    // to nothing; the design draws it as a drawer over the Console. Objectives
    // are reached from the Console, which is their roster — a data row is not
    // a place, so they are not icons in either design.
    expect(equipRoutes()).toHaveLength(11)
    expect(equipRoutes()).not.toContain('/research/loop/runs')
    // The Market pair, out of the tree since Rev .7.
    expect(equipRoutes()).toContain('/market/live')
    expect(equipRoutes()).toContain('/research/event-radar')
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

  it('grades nothing by size, because every first open is a Phone', () => {
    // §5a.8's fourteenth round: per-task size grades were architected away by
    // per-surface memory — someone who wants a work surface clicks ▭ once and
    // it is remembered. Leaving the field populated would mean two rules for
    // the same question, and the dead one would win by being written down.
    for (const page of EQUIP_GROUPS.flatMap((g) => [g.hub, ...g.pages])) {
      expect(Object.keys(page), page.to).not.toContain('size')
    }
  })
})
