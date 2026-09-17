import { describe, expect, it } from 'vitest'
import { PAGE_ROUTES } from '@/layout/routeRegistry'
import { adoptionCounts, adoptionRows, DESIGN_REV } from './adoption'
import { DESIGN_ROUTES } from './designRoutes.generated'
import { revIsNewer } from './rev'

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

  it('only calls a redirect an alias when both paths are the same prototype', () => {
    // `/research/screener` is the design's screener home
    // (`Research Screener.dc.html`); the app's Option Screener is its Contracts
    // page (`Research Contract Screener.dc.html`) and moved onto its own path
    // on 2026-09-15. Counting the forward as adoption would have retired the
    // home from "to build" without anyone building it.
    const home = rows.find((r) => r.path === '/research/screener')
    expect(home?.state).toBe('unbuilt')
    expect(home?.inApp).toBe(false)
    const contracts = rows.find((r) => r.path === '/research/contract-screener')
    expect(contracts?.state).toBe('pending')
    expect(contracts?.aliasOf).toBeUndefined()
    // The Analyze hubs are the case the rule has to keep: all of them resolve
    // to the prototype the Symbol page was built from.
    expect(rows.find((r) => r.path === '/research/symbol')?.aliasOf).toEqual([
      '/research/vol-regime',
      '/research/dealer-levels',
      '/research/scenario',
      '/research/flow',
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
    expect(counts.stubs).toBe(DESIGN_ROUTES.length - counts.designed)
    expect(counts.byState.backlog).toBeLessThanOrEqual(counts.stubs)
  })

  it('reads the walk as it stands', () => {
    // Replace these as pages are walked — they are the numbers the Owner reads.
    // Owner list 2026-09-15: all five at Rev 2026-09-15.5. Owner 2026-09-16:
    // Accounts and Transfer & Pay signed off at their page rev 2026-09-16.9.
    // Rev .11 moved Accounts to .11 (the role word and the Data from string,
    // both already built that way); the Owner re-signed it at .11 the same day.
    expect(counts.aligned + counts.byState.stale).toBe(7)
    expect(counts.aligned).toBe(7)
    // Backing & Model was walked and built in C6 (2026-09-15) but never tagged;
    // it waits for the Owner's look (pending 19→18). Plans joined it in R9-6,
    // built on the strategy_plan table. Transfer & Pay joined in R12, built in
    // R11 against Rev 2026-09-16.9 (pending 22→21). Accounts joined in R12,
    // built against Rev 2026-09-16.9 (pending 21→20). Both left for aligned
    // on the Owner's look (reviewing 4→2).
    expect(counts.byState.reviewing).toBe(2)
    expect(
      rows
        .filter((r) => r.state === 'aligned')
        .map((r) => r.path)
        .sort(),
    ).toEqual([
      '/portfolio/accounts',
      '/portfolio/transfer',
      '/research/agent-personas',
      '/research/copilot',
      '/research/copilot/trading',
      '/research/loop/decisions',
      '/research/symbol',
    ])
    expect(rows.filter((r) => r.state === 'reviewing').map((r) => r.path).sort()).toEqual([
      '/portfolio/backing',
      '/trade/plans',
    ])
    // Seven Strategy pages, Momentum Radar and SEPA Daily Core, which the design
    // dissolves elsewhere, plus Backtest, handed to Lab. Symbol and Plans left:
    // the design keeps both pages.
    expect(counts.byState.moving).toBe(10)
    // Rev 2026-09-15.13 collapsed nine `/system/*` routes into `/system/status`
    // and `/settings` (the Owner's OLTP/OLAP/Ops ruling). The app still has the
    // nine pages, so each one asks where it goes — that is nine new rows in "to
    // ask", beside `/research/stock-screener`, which is still waiting on Design.
    expect(counts.byState.staging).toBe(10)
    expect(rows.filter((r) => r.state === 'staging').map((r) => r.path).sort()).toEqual([
      '/research/stock-screener',
      '/system/api',
      '/system/coverage',
      '/system/daemon',
      '/system/data-readiness',
      '/system/feed',
      '/system/ib',
      '/system/platform',
      '/system/socket',
      '/system/topology',
    ])
    // Rev 2026-09-15.13: the design filled almost all of its own backlog — the
    // Risk layer, the Portfolio accounts cluster, the market and workbench data
    // pages, Copilot/Autopilot, Assignment. 82 routes, 78 with a prototype, and
    // only four stubs left (all `/docs/*` reference pages, deliberately last).
    // The denominator nearly doubled, so "to build" grew with it: those pages
    // now have a design to build against, which they did not before.
    expect(counts.designed).toBe(78)
    expect(counts.byState.unbuilt).toBe(43)
    // 21 until R12 tagged Accounts: `pending` is the built-but-unwalked
    // pool, so a page leaving it for `reviewing` takes one off this count.
    expect(counts.byState.pending).toBe(20)
    expect(counts.byState.backlog).toBe(4)
  })

  it('does not call a walked page stale because some other page moved', () => {
    // The package's global Rev moves on every registry change; a page's own rev
    // moves only when that page's design does. Comparing against the global one
    // marked all five walked pages stale the moment `/docs/omnibar` retired, and
    // again when Rev went .5 → .13 for work on entirely different pages.
    //
    // R11 re-froze at Rev 2026-09-16.9 and the whole diff was that one line: the
    // design's `shell-registry.js` had left the six redone Portfolio pages
    // stamped 2026-09-15.10, so the redo read as "nothing moved". R12 re-froze at
    // .10, where Design filled those stamps in — nine Portfolio routes advanced
    // (six to .9, outcome and corporate-actions to .8, pnl-explain to .7). Route
    // and designed counts held at 82 / 78, and none of the walked pages went
    // stale: no walked page was a Portfolio page yet. Accounts and Transfer &
    // Pay are now, both at .9 — a Portfolio redo will surface here as stale.
    // Rev .11 did exactly that for Accounts: it moved to .11 and read stale
    // until the Owner re-signed it there. Performance, Positions and Backing
    // moved too (table floors only), but none of them is aligned, so none of
    // them can go stale.
    expect(DESIGN_REV).toBe('2026-09-16.11')
    expect(counts.byState.stale).toBe(0)
    for (const row of rows) {
      if (row.state !== 'aligned') continue
      // Every walked page carries the rev it was walked against, and the design
      // still stamps that page no later than it.
      expect(row.rev, row.path).toBeTruthy()
      expect(revIsNewer(row.design?.rev, row.rev), row.path).toBe(false)
    }
  })
})
