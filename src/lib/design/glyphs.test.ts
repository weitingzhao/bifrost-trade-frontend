import { describe, expect, it } from 'vitest'
import { DESIGN_FOLD_GLYPH, DESIGN_GLYPHS, DESIGN_ROUTE_GLYPH } from './designRoutes.generated'
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

  it('carries the six that no icon library has', () => {
    // The design's handoff names these as the ones that must be drawn rather
    // than imported. Losing any of them would not fail a build — the row would
    // simply fall back to its lucide argument and look plausible, which is
    // exactly why it is asserted here instead.
    expect(DESIGN_ROUTE_GLYPH['/portfolio/positions']).toBe('payoff')
    expect(DESIGN_ROUTE_GLYPH['/portfolio/backing']).toBe('pillars')
    expect(DESIGN_ROUTE_GLYPH['/research/scan']).toBe('smile')
    expect(DESIGN_ROUTE_GLYPH['/research/contract-screener']).toBe('ladder')
    expect(DESIGN_ROUTE_GLYPH['/research/loop/decisions']).toBe('valve')
    expect(DESIGN_ROUTE_GLYPH['/research/loop/harness']).toBe('rotor')
  })

  it('keys folds by label, because a heading borrows a child’s route', () => {
    // `/research/backtest` is both the Validate heading and a page under it,
    // and the two carry different shapes. Keying folds by path would give the
    // heading its child's glyph.
    expect(DESIGN_FOLD_GLYPH['Validate']).toBe('shieldcheck')
    expect(DESIGN_ROUTE_GLYPH['/research/backtest']).toBe('replay')
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
    const groups = [...NAV_GROUPS, buildResearchNavGroup({ objectives: [] })]
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
