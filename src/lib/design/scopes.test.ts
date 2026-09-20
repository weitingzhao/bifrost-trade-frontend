import { describe, expect, it } from 'vitest'
import { DESIGN_OBJ_TARGET, DESIGN_OBJ_WIRED } from './designRoutes.generated'
import { routeFor } from '@/layout/routeRegistry'
import { objectiveScopeState, objectiveWiredPages, scopeRouteLabel, symbolPlannedHere } from './scopes'

describe('objectiveScopeState', () => {
  it('keeps wired apart from ruled-but-not-wired', () => {
    // Wired: the page filters by which machine produced the row, today.
    expect(objectiveScopeState('/research/loop/hypotheses')).toBe('read-here')
    // Ruled to, and not wired. This is the state the Lens exists to tell:
    // saying "read here" on a page that then ignores the scope is the shell
    // claiming a filter that is not running.
    expect(objectiveScopeState('/trade/plans')).toBe('planned')
    // Nothing with an origin to filter — held for the next objective-aware page.
    expect(objectiveScopeState('/risk/margin')).toBe('held')
  })

  it('reads a page, not a view of one', () => {
    expect(objectiveScopeState('/research/loop/candidates?objective=obj-1')).toBe('read-here')
    expect(objectiveScopeState('/research/loop/candidates#top')).toBe('read-here')
  })

  it('never lights a market page', () => {
    // An objective says nothing about what SPY is doing, so market pages are
    // absent from both lists on purpose.
    expect(objectiveScopeState('/market/live')).toBe('held')
    expect(DESIGN_OBJ_TARGET.some((p) => p.startsWith('/market/'))).toBe(false)
  })

  it('is generated: every wired route is also a ruled one', () => {
    // The wired set is the part of the ruled reach that has been built. A
    // route wired but not ruled would mean the app filters by something the
    // design never asked it to.
    for (const path of DESIGN_OBJ_WIRED) expect(DESIGN_OBJ_TARGET).toContain(path)
    expect(DESIGN_OBJ_WIRED.length).toBeLessThan(DESIGN_OBJ_TARGET.length)
    expect(objectiveWiredPages()).toEqual(DESIGN_OBJ_WIRED)
  })

  it('names the four pages a scope change bites on today', () => {
    // Quoted in the Lens's own footer, so the claim the control makes is the
    // list this test pins rather than a sentence someone typed.
    expect([...DESIGN_OBJ_WIRED].sort()).toEqual([
      '/research/loop/candidates',
      '/research/loop/harness',
      '/research/loop/hypotheses',
      '/review/objectives',
    ])
  })
})

describe('symbolPlannedHere', () => {
  it('is the ruled reach, not what the app scopes today', () => {
    // The Bloomberg test (Owner, 2026-09-20): load a name, see that name's
    // share of everything, everywhere. Positions is ruled into that reach.
    expect(symbolPlannedHere('/portfolio/outcome')).toBe(true)
    expect(symbolPlannedHere('/risk/margin')).toBe(false)
  })
})

describe('scopeRouteLabel', () => {
  it('names a page the app has built by the app’s own label', () => {
    expect(scopeRouteLabel('/research/loop/hypotheses')).toBe(routeFor('/research/loop/hypotheses').label)
  })

  it('falls back to the design for a page this side has not built', () => {
    // `routeFor()` alone answers with the application's title for an unknown
    // path, so the Lens's footer used to read "… Hypothesis Board · Bifrost
    // Trade" — a sentence that names the product where it meant a page.
    expect(scopeRouteLabel('/review/objectives')).toBe('Objectives')
    expect(scopeRouteLabel('/review/objectives')).not.toBe(routeFor('/review/objectives').label)
  })

  it('answers with the path when neither side knows it', () => {
    expect(scopeRouteLabel('/nowhere/at/all')).toBe('/nowhere/at/all')
  })
})
