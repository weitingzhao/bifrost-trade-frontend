import { describe, expect, it } from 'vitest'
import { adoptionCounts, adoptionRows, DESIGN_ONLY_WHY } from './adoption'
import { DESIGN_ROUTES } from './designRoutes.generated'

const rows = adoptionRows()
const counts = adoptionCounts(rows)

describe('design adoption', () => {
  it('makes every app page say where it stands', () => {
    // The ratchet. A page the design does not have is `staging` by derivation,
    // so a new page added without a thought lands in "to ask" — which is the
    // right default, but only if someone reads it. This fails instead: say
    // where it goes (`moving`) or that nobody knows yet (`staging`), in the
    // entry, with a note. A page waiting for the Owner's look says what was
    // walked and when.
    const unexplained = rows
      .filter((r) => (r.state === 'staging' || r.state === 'reviewing') && !r.note)
      .map((r) => r.path)
    expect(unexplained, 'staging or reviewing without a note').toEqual([])
  })

  it('counts against the design, not against itself', () => {
    // Dozens of design prototypes have no page here. A denominator taken from
    // the app would read near complete while most of the design is unbuilt.
    // Less the design documents the Owner kept in the design (2026-09-25):
    // they were never this app's to build.
    // And less the tracker itself, which has a prototype since Rev .53.
    expect(counts.designed).toBe(
      DESIGN_ROUTES.filter((d) => d.designed && !d.designOnly && d.path !== '/docs/design-adoption').length,
    )
    expect(counts.byState.designOnly).toBe(DESIGN_ROUTES.filter((d) => d.designOnly).length)
    // Rev .48: the registry decides which; the app only says why, for each and no other.
    expect(Object.keys(DESIGN_ONLY_WHY).sort()).toEqual(DESIGN_ROUTES.filter((d) => d.designOnly).map((d) => d.path).sort())
    // The app's own page count is no guide to it: its extra pages retire
    // (System › Runtime, 2026-09-25) and some design routes are answered by a
    // forward rather than a page of their own, so the only denominator this
    // tracker trusts is the design's, asserted above.
  })

  it('accounts for every design route exactly once', () => {
    // Each design route is either a row of its own, or reached through a page
    // that answers to its old name. Nothing counted twice, nothing dropped.
    const owned = new Set<string>()
    for (const r of rows) {
      if (r.design) owned.add(r.design.path)
      for (const a of r.aliasOf ?? []) owned.add(a)
    }
    // The one exception is the tracker itself, which the design lists since
    // Rev .52 and this list leaves out on purpose (see the test below).
    const missing = DESIGN_ROUTES.filter((d) => !owned.has(d.path) && d.path !== '/docs/design-adoption').map(
      (d) => d.path,
    )
    expect(missing).toEqual([])
  })

  it('does not call an adopted page unbuilt because the design uses its old name', () => {
    // The design keeps the six retired hubs as deep links onto the Symbol
    // page's tabs — its own decision. Counting them as work left inflated the
    // backlog by five.
    const symbol = rows.find((r) => r.path === '/research/symbol')
    expect(symbol?.aliasOf).toContain('/research/vol-regime')
    expect(symbol?.aliasOf).toContain('/research/discovery')
    expect(rows.filter((r) => r.state === 'unbuilt').map((r) => r.path)).not.toContain(
      '/research/vol-regime',
    )
  })

  it('only calls a redirect an alias when both paths are the same prototype', () => {
    // `/research/screener` is the design's Stock screen
    // (`Research Screener.dc.html`); the app's Option Screener is its Contracts
    // page (`Research Contract Screener.dc.html`) and moved onto its own path
    // on 2026-09-15. While the first forwarded to the second, counting the
    // forward as adoption would have retired the Stock screen from "to build"
    // without anyone building it — which is the rule this test pins. The Owner
    // ruled on 2026-09-20 that this side's SEPA-conditions page *is* that
    // screen, so it holds the path itself now and answers for itself.
    const home = rows.find((r) => r.path === '/research/screener')
    expect(home?.inApp).toBe(true)
    // Explorer's redirect lands here and is the same prototype (an alias row
    // in the registry), so it is the one forward this page may answer for.
    expect(home?.aliasOf).toEqual(['/research/explorer'])
    const contracts = rows.find((r) => r.path === '/research/contract-screener')
    // Walked 2026-09-22 on its own path, signed 2026-09-23; what this line
    // pins is the `aliasOf`, not the state — the rule is that the forward
    // never counted as adoption.
    expect(contracts?.state).toBe('aligned')
    expect(contracts?.aliasOf).toBeUndefined()
    // The Analyze hubs are the case the rule has to keep: all of them resolve
    // to the prototype the Symbol page was built from.
    expect(rows.find((r) => r.path === '/research/symbol')?.aliasOf).toEqual([
      '/research/vol-regime',
      '/research/dealer-levels',
      '/research/scenario',
      '/research/flow',
      // Payoff joined 2026-09-24: its redirect lands on its own tab, and the
      // design's file for it is the Symbol prototype, like its siblings'.
      '/research/payoff',
      '/research/discovery',
    ])
  })

  it('keeps the tracker out of its own list', () => {
    expect(rows.map((r) => r.path)).not.toContain('/docs/design-adoption')
  })

  it('keeps stubs out of the walk and the build', () => {
    // A stub has no prototype: nothing to compare a page against, nothing to
    // build from. Counted under "to walk" and "to build", those lists read 40
    // and 41 against a denominator they could never reach.
    for (const r of rows) {
      if (r.aliasOf) continue
      if (r.state === 'pending' || r.state === 'unbuilt') {
        expect(r.design?.designed, r.path).toBe(true)
      }
      if (r.state === 'backlog') expect(r.design?.designed, r.path).toBe(false)
    }
    // The tracker is designed but in neither the denominator nor the stubs.
    expect(counts.stubs).toBe(DESIGN_ROUTES.length - counts.designed - counts.byState.designOnly - 1)
    expect(counts.byState.backlog).toBeLessThanOrEqual(counts.stubs)
  })

})
