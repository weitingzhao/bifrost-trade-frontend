import { describe, expect, it } from 'vitest'
import {
  DESIGN_EQUIP_GROUP_GLYPH,
  DESIGN_EQUIP_ROUTE_GLYPH,
  DESIGN_FOLD_GLYPH,
  DESIGN_GLYPHS,
  DESIGN_ROUTE_GLYPH,
} from './designRoutes.generated'
import { EQUIP_GROUPS } from '@/layout/equip'
import { foldGlyph, glyph, routeGlyph } from './glyphs'
import { NAV_GROUPS } from '@/layout/navConfig'
import { buildResearchNavGroup } from '@/layout/researchNavCatalog'
import type { ShellNavItem } from '@bifrost/ui'

describe('the generated glyph table', () => {
  it('has a shape for every name it assigns', () => {
    // A name with no path renders the empty box — deliberately obvious, and
    // deliberately never expected. If this fails, the snapshot and the design
    // package went out of step.
    for (const name of [...Object.values(DESIGN_ROUTE_GLYPH), ...Object.values(DESIGN_FOLD_GLYPH)]) {
      expect(DESIGN_GLYPHS[name], name).toBeTruthy()
    }
  })

  it('carries the drawn glyphs that no icon library has', () => {
    // The design's handoff names these as the ones that must be drawn rather
    // than imported. Losing any of them would not fail a build — the row would
    // simply fall back to its lucide argument and look plausible, which is
    // exactly why it is asserted here instead.
    expect(DESIGN_ROUTE_GLYPH['/portfolio/positions']).toBe('payoff')
    expect(DESIGN_ROUTE_GLYPH['/portfolio/backing']).toBe('pillars')
    expect(DESIGN_ROUTE_GLYPH['/research/scan']).toBe('smile')
    expect(DESIGN_ROUTE_GLYPH['/research/contract-screener']).toBe('ladder')
    expect(DESIGN_ROUTE_GLYPH['/research/loop/decisions']).toBe('valve')
  })

  it('has no glyph for a page the tree no longer holds', () => {
    // This table is built from the tree, so §5a.8 takes the equipment's
    // glyphs out with its rows — `rotor` (the Console) was asserted here
    // until Package 2026-09-22.3, and the seven others went with it. Nothing
    // was lost: the companion rail draws them, and on this side it draws them
    // from lucide rather than from the design's paths, because the rail is
    // the one surface where the glyph is the only readable thing and the app
    // owns its own icon set there.
    for (const to of ['/research/loop/harness', '/research/book', '/research/watchlist']) {
      expect(DESIGN_ROUTE_GLYPH[to], to).toBeUndefined()
    }
  })

  it('keys folds by label, because a heading borrows a child’s route', () => {
    // `/research/book` is both The Book's heading and a page under it, and
    // the two carry different shapes. Keying folds by path would give the
    // heading its child's glyph.
    //
    // Validate was the example until §5a.7 (Rev 2026-09-21.3) turned the
    // three Pipeline folds into captions — a caption draws no glyph, so its
    // three entries left the table along with the shapes only they used.
    expect(DESIGN_FOLD_GLYPH['Data']).toBe('db')
    expect(DESIGN_ROUTE_GLYPH['/research/backtest']).toBe('replay')
  })

  it('keeps no fold glyph for a heading that became a caption', () => {
    for (const label of ['Discover', 'Analyze', 'Validate']) {
      expect(DESIGN_FOLD_GLYPH[label], label).toBeUndefined()
    }
  })
})

describe('glyph()', () => {
  it('returns the same component for a name, so rows do not remount', () => {
    expect(glyph('payoff')).toBe(glyph('payoff'))
    expect(glyph('payoff')).not.toBe(glyph('pillars'))
  })

  it('answers null where the design’s menu has no row', () => {
    // Not a fallback shape: the app has pages the design does not carry, and
    // those keep their own icon rather than borrowing one that means
    // something else.
    expect(routeGlyph('/nowhere/at/all')).toBeNull()
    expect(foldGlyph('Not A Fold')).toBeNull()
  })
})

function walk(items: readonly ShellNavItem[] | undefined, visit: (siblings: readonly ShellNavItem[]) => void) {
  if (!items || items.length === 0) return
  visit(items)
  for (const it of items) walk(it.children, visit)
}

describe('the sidebar', () => {
  it('never puts one shape on two rows the reader sees together', () => {
    // The whole reason the set was redrawn, and the reason a near-synonym
    // from an icon library is not an acceptable substitute: a row folded to
    // its glyph is identified by that glyph alone. Siblings, not the whole
    // tree — three Docs rows deliberately borrow the shape of the thing they
    // document, and they sit in different groups from it.
    const groups = [...NAV_GROUPS, buildResearchNavGroup()]
    for (const group of groups) {
      const lists = [group.items, ...(group.subGroups ?? []).map((s) => s.items)]
      for (const list of lists) {
        walk(list, (siblings) => {
          const icons = siblings.map((s) => s.icon).filter(Boolean)
          expect(new Set(icons).size, `${group.label}: ${siblings.map((s) => s.label).join(' · ')}`).toBe(
            icons.length,
          )
        })
      }
    }
  })
})

describe('the equipment rail', () => {
  it('has a shape for each of its surfaces, and no two alike', () => {
    // The rail is always folded, so the glyph is not decoration on a row — it
    // *is* the row. Two surfaces sharing a shape is the one failure that
    // cannot be read around.
    const names = Object.values(DESIGN_EQUIP_ROUTE_GLYPH)
    expect(names.length).toBeGreaterThan(0)
    expect(new Set(names).size).toBe(names.length)
    for (const n of names) expect(DESIGN_GLYPHS[n], n).toBeTruthy()
  })

  it('carries the head of every group the rail draws', () => {
    // `market` joined in Package 2026-09-23.3: Live and Alerts left the left
    // sidebar for a fourth rail group.
    expect(Object.keys(DESIGN_EQUIP_GROUP_GLYPH).sort()).toEqual([
      'autopilot',
      'book',
      'copilot',
      'market',
    ])
    expect(DESIGN_EQUIP_GROUP_GLYPH.autopilot).toBe('rotor')
  })

  it('is where the shapes the tree has none for live', () => {
    // The nine surfaces left the tree in §5a.8, so `DESIGN_ROUTE_GLYPH` has
    // nothing for them — which is correct, not a gap. Asserted so that a
    // future reader looking at the empty half does not "fix" it by inventing
    // a nav glyph for a page the tree does not carry.
    // Not the Decision Inbox: it seats in Review as a menu row *and* rides
    // the rail, so it is the one surface that carries both — and both are
    // `valve`, which is the point of keying the two maps off one glyph table.
    expect(DESIGN_ROUTE_GLYPH['/research/loop/decisions']).toBe('valve')
    expect(DESIGN_EQUIP_ROUTE_GLYPH['/research/loop/decisions']).toBe('valve')
    for (const path of [
      '/research/loop/harness',
      '/research/book',
      '/research/journal',
      '/research/copilot',
    ]) {
      expect(DESIGN_ROUTE_GLYPH[path], path).toBeUndefined()
      expect(DESIGN_EQUIP_ROUTE_GLYPH[path], path).toBeTruthy()
    }
    // Watchlist left the rail in Rev .56: it has neither a tree row nor a rail cell.
    expect(DESIGN_ROUTE_GLYPH['/research/watchlist']).toBeUndefined()
    expect(DESIGN_EQUIP_ROUTE_GLYPH['/research/watchlist']).toBeUndefined()
  })

  it('draws the design shape on every rail row it declares one for', () => {
    for (const g of EQUIP_GROUPS) {
      for (const p of [g.hub, ...g.pages]) {
        const name = DESIGN_EQUIP_ROUTE_GLYPH[p.to]
        if (!name) continue
        expect((p.icon as { displayName?: string }).displayName, p.label).toBe(`Glyph(${name})`)
      }
    }
  })
})
