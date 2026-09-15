import { describe, expect, it } from 'vitest'
import { PAGE_ROUTES } from '@/layout/routeRegistry'
import { adoptionCounts, adoptionRows } from './adoption'
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
    expect(counts.designed).toBe(DESIGN_ROUTES.filter((d) => d.designed).length)
    expect(counts.designed).toBeLessThan(PAGE_ROUTES.length + counts.byState.unbuilt)
  })

  it('accounts for every design route exactly once', () => {
    // Each design route is either a row of its own, or reached through a page
    // that answers to its old name. Nothing counted twice, nothing dropped.
    const owned = new Set<string>()
    for (const r of rows) {
      if (r.design) owned.add(r.design.path)
      for (const a of r.aliasOf ?? []) owned.add(a)
    }
    const missing = DESIGN_ROUTES.filter((d) => !owned.has(d.path)).map((d) => d.path)
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
    expect(counts.stubs).toBe(DESIGN_ROUTES.length - counts.designed)
    expect(counts.byState.backlog).toBeLessThanOrEqual(counts.stubs)
  })

  it('reads the walk as it stands', () => {
    // Replace these as pages are walked — they are the numbers the Owner reads.
    // Rev 2026-09-15.5 retired /docs/omnibar. Symbol and Decision Inbox are still
    // tagged aligned at .3, so they read stale until the Owner restamp (R8-2).
    expect(counts.aligned + counts.byState.stale).toBe(2)
    expect(counts.aligned).toBe(0)
    expect(
      rows
        .filter((r) => r.state === 'stale')
        .map((r) => r.path)
        .sort(),
    ).toEqual(['/research/loop/decisions', '/research/symbol'])
    expect(
      rows
        .filter((r) => r.state === 'reviewing')
        .map((r) => r.path)
        .sort(),
    ).toEqual([
      '/research/agent-personas',
      '/research/copilot',
      '/research/copilot/trading',
    ])
    // Seven Strategy pages, Momentum Radar and SEPA Daily Core, which the design
    // dissolves elsewhere, plus Backtest, handed to Lab. Symbol and Plans left:
    // the design keeps both pages.
    expect(counts.byState.moving).toBe(10)
    expect(counts.byState.staging).toBe(2)
    // Rev 2026-09-15.5: registry dropped /docs/omnibar (it was a designed
    // prototype with no app page → unbuilt 34→33). Denominator 64→63.
    // Stub backlog unchanged (25). Pending unchanged (19).
    expect(counts.designed).toBe(63)
    expect(counts.byState.unbuilt).toBe(33)
    expect(counts.byState.pending).toBe(19)
    expect(counts.byState.backlog).toBe(25)
  })
})
