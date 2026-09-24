/**
 * How the adoption rows roll up — groups, and the lists read off them.
 *
 * Split out of `adoption.test.ts` on 2026-09-23 when that file crossed the
 * 800-line ratchet. The seam is the subject, not the line count: the other
 * file asserts what state each route is in, and this one asserts how those
 * rows add up into a layer's standing and into the build list.
 */
import { describe, expect, it } from 'vitest'
import { adoptionByGroup, adoptionCounts, adoptionGroupOf, adoptionRows } from './adoption'

const rows = adoptionRows()
const counts = adoptionCounts(rows)

describe('adoptionByGroup', () => {
  it('counts a group against every row it owns, not only the ones walked so far', () => {
    const groups = adoptionByGroup(rows)
    const portfolio = groups.find((g) => g.group === 'Portfolio')
    // The question the summary exists to answer. Portfolio was the first group
    // to finish — nine pages, all walked and all signed off — and then Package
    // 2026-09-18.1 moved Positions, which is what a group being "done" is
    // always one design round away from. The summary counts against every row
    // the group owns, so the group reads 8 of 9 rather than staying at nine
    // because nine pages happen to carry a tag. Positions was re-walked and
    // signed off on 2026-09-18, so the group is whole again — until the next
    // design round moves one of them.
    // And the next round did: `/portfolio` joined as the layer's own overview
    // page (§5a.1). It was built, re-walked section by section against the
    // prototype, and signed off 2026-09-20 — so the group is whole again at
    // ten of ten, with nothing left waiting on a look.
    // Positions went stale in Package 2026-09-22.3 — still walked, still
    // built, its Ask owed a destination — and left `stale` for `reviewing`
    // the same day the Thread became a surface and the Ask got one. The Owner
    // answered it 2026-09-22 and the group is whole again at ten of ten.
    // Stale again in Package 2026-09-23.2, for one line: the contract face
    // gains `every leg on <SYM> · Contract Greeks →`, the third of the three
    // doors the design gave that page when it moved it to Risk. Built the
    // same day, so it waits for a look in `reviewing` rather than in `stale`.
    // Signed 2026-09-23 — the group is whole again at ten of ten.
    // Package 2026-09-23.6 @ Rev .21 makes Positions the design's north-star
    // page (§16): the four gauges become a hero reading band, the notes move
    // into tooltips, capabilities unchanged. Nine of ten until it is re-walked.
    expect(portfolio).toMatchObject({ total: 10, aligned: 9, left: 1 })
    expect(portfolio?.byState.reviewing).toBe(0)
    expect(portfolio?.byState.stale).toBe(1)
    expect(portfolio?.byState.unbuilt).toBe(0)

    // The design's own backlog is nobody's work here, so it stays out of the
    // denominator: System's four `/docs/*` stubs do not make it read worse.
    const system = groups.find((g) => g.group === 'System')
    expect(system?.byState.backlog).toBe(4)
    expect(system?.total).toBe(rows.filter((r) => r.crumbs[0] === 'System' && r.state !== 'backlog').length)

    // Every row lands in exactly one group, and the totals reconcile.
    expect(groups.reduce((n, g) => n + g.total + g.byState.backlog, 0)).toBe(rows.length)
    expect(groups.reduce((n, g) => n + g.aligned, 0)).toBe(counts.aligned)
    // Closest to done first, so the group being walked sits at the top.
    expect(groups.map((g) => g.left)).toEqual([...groups.map((g) => g.left)].sort((a, b) => a - b))
  })
})

describe('adoptionGroupOf', () => {
  it('is the one derivation the tracker groups by, twice', () => {
    // The summary panel and each state's own list both group; two
    // derivations would eventually disagree and the reader would have no way
    // to tell which was lying.
    const byGroup = adoptionByGroup(rows)
    const counted = new Map<string, number>()
    for (const r of rows) {
      const g = adoptionGroupOf(r)
      counted.set(g, (counted.get(g) ?? 0) + 1)
    }
    for (const g of byGroup) {
      const all = g.total + g.byState.backlog
      expect(counted.get(g.group), `group ${g.group}`).toBe(all)
    }
    expect([...counted.keys()].sort()).toEqual(byGroup.map((g) => g.group).sort())
  })

  it('puts a layer page in its layer, not under Home', () => {
    // `/risk` carries no crumbs — the design flattened the layer trails — so
    // without the design-group fall-back every layer page lands under Home.
    const risk = rows.find((r) => r.path === '/risk')
    expect(risk?.crumbs).toEqual([])
    expect(adoptionGroupOf(risk!)).toBe('Risk')
  })
})

describe('the build list is not one kind of work', () => {
  it('carries a recommendation on each `/docs/*` prototype, and rules on none', () => {
    // Ten of them went in undifferentiated. Six document the design process
    // rather than this app; four are references about the app and belong
    // beside the ones the Reference fold already carries. The note was the
    // whole change — no state and no count moved, because absence from the
    // design is not deletion and this side reports rather than rules (Owner,
    // 2026-09-18). Nine since 2026-09-23: Options Kit, the first of the four
    // recommended builds, was built and left the list the way a build does.
    const docs = adoptionRows().filter(
      (r) => r.state === 'unbuilt' && r.path.startsWith('/docs/'),
    )
    expect(docs).toHaveLength(9)
    expect(docs.every((r) => (r.note ?? '').startsWith('Recommend:'))).toBe(true)
    // A built page leaves the recommendation list rather than keeping a stale
    // one — the judgement is about what is not built yet.
    expect(docs.map((r) => r.path)).not.toContain('/docs/options-kit')
    const build = docs.filter((r) => r.note!.startsWith('Recommend: build'))
    expect(build.map((r) => r.path).sort()).toEqual([
      '/docs/capability',
      '/docs/drilldown',
      '/docs/research-vision',
    ])
    // Every "not this app" says which instrument already answers it, so the
    // recommendation can be argued with rather than just read.
    for (const r of docs.filter((x) => x.note!.startsWith('Recommend: not'))) {
      expect(r.note, r.path).toMatch(/Owner to rule\.$/)
    }
  })
})
