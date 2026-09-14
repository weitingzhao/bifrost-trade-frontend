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
    // entry, with a note.
    const unexplained = rows
      .filter((r) => r.state === 'staging' && !r.note)
      .map((r) => r.path)
    expect(unexplained, 'staging without a note').toEqual([])
  })

  it('counts against the design, not against itself', () => {
    // 43 design routes have no page here. A denominator taken from the app
    // would read near complete while most of the design is unbuilt.
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

  it('starts with nothing walked', () => {
    // Replace this as pages are walked — it is the one number the Owner reads.
    expect(counts.aligned + counts.byState.stale).toBe(0)
    // 11: the ten the design dissolves elsewhere, plus Backtest, which Docs Index
    // marks LAB — handed to Lab, the Trade original deleted in the design.
    expect(counts.byState.moving).toBe(12)
    // Down from 3 on 2026-09-14: /research/daily-brief entered the design
    // registry (89 routes), so it derives `pending` instead of carrying a
    // staging tag. Up from 11 on 2026-09-14: /trade/plans landed as the
    // Plan-this receiver (C1-c).
    expect(counts.byState.staging).toBe(2)
  })
})
