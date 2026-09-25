/**
 * One tree, both homes.
 *
 * The seats split the menu from 2026-09-08 until the Owner retired them
 * (2026-09-19, ruling Vision §15 Q2): with the object layer out in the Book,
 * the engine and the stations are short enough to stand together, and a
 * switcher that hides one of them answers nothing.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isSystemRoute } from './routeRegistry'
import {
  allResearchRoutes,
  BOOK_PAGE,
  BOOK_PAGES,
  buildResearchNavGroup,
  COPILOT_DESK,
  researchItems,
  staticResearchSubGroups,
} from './researchNavCatalog'
import type { ShellNavItem } from '@bifrost/ui'
import { getAllNavItems } from '@bifrost/ui'
import { EQUIP_GROUPS, equipRoutes } from './equip'
import { NAV_GROUPS, SYSTEM_NAV_GROUPS } from './navConfig'

/** Home's rows — where Daily Brief went (§5a.8). */
function homeItems(): ShellNavItem[] {
  return NAV_GROUPS.find((g) => g.label === 'Home')?.items ?? []
}

/** Every route the System tree reaches — where the two agent pages went. */
function systemRoutes(): string[] {
  return SYSTEM_NAV_GROUPS.flatMap((g) =>
    getAllNavItems(g).flatMap((i) => [i.to ?? i.id, ...(i.children ?? []).map((c) => c.to ?? c.id)]),
  )
}


const OVERVIEW = '/research/overview'
const AUTOPILOT_HOME = '/research/loop/harness'
const PIPELINE_HOME = '/research/workbench'

function flatten(items: ShellNavItem[]): ShellNavItem[] {
  return items.flatMap((i) => [i, ...flatten(i.children ?? [])])
}

/**
 * Every page the tree reaches. A fold owns no page — its row borrows its
 * first child's route — so counting it would count that page twice. A caption
 * (§5a.7) owns none either: it is a heading, not a row.
 */
function routesOf(items: ShellNavItem[]): string[] {
  return flatten(items)
    .filter((i) => !i.id.startsWith('fold:') && i.kind !== 'caption')
    .map((i) => i.to ?? i.id)
}

describe('one tree, both homes', () => {
  it('holds no equipment page — one signpost to the Book, and nothing else', () => {
    // §5a.8 (design Rev 2026-09-22.2): Research → Risk → Trade → Portfolio →
    // Review is the script; Autopilot runs it, The Book remembers it, the
    // Copilot is held while playing it. None of the three is a stage, and a
    // tree cannot say "not a place" — every pixel of it says place. They
    // enter through the companion rail now (`equip.ts`).
    //
    // Narrowed 2026-09-22 on the Owner's call, and only by one row: the rail
    // answered "what is the Book" but nothing answered "where is it", and the
    // Owner went looking for the Watchlist in this tree and found nothing.
    // `/research/book` is a page about the equipment, so naming it once is a
    // place and not a lie — but its four pages, Autopilot's home and the
    // Copilot Desk stay out, which is the part of §5a.8 that was about the
    // tree filling up again.
    expect(buildResearchNavGroup().to).toBe(OVERVIEW)
    const routes = routesOf(researchItems())
    expect(routes).not.toContain(AUTOPILOT_HOME)
    expect(routes).not.toContain(COPILOT_DESK)
    expect(routes.filter((r) => r === BOOK_PAGE)).toHaveLength(1)
    for (const page of Object.values(BOOK_PAGES)) {
      expect(routes, `${page.label} is equipment and belongs on the rail`).not.toContain(page.to)
    }
    // And no Pipeline row either (§5a.9): its page and the layer's page are
    // one page, so two rows over it was the shape §5a.1 already swept.
    expect(routes).not.toContain(PIPELINE_HOME)
  })

  it('puts no objective in the menu at all', () => {
    const everything = flatten(researchItems())
    expect(everything.filter((i) => (i.to ?? '').startsWith('/research/loop/objectives/'))).toEqual(
      [],
    )
    expect(everything.filter((i) => i.label === 'Objectives')).toEqual([])
  })

  it('stands the stations directly under the layer, one depth', () => {
    // §5a.9: the Pipeline fold merged into the Research layer, so the three
    // captions and their pages are the layer's own rows. Three captions and
    // the ten pages they name — the design's thirteen, since History and
    // Compare joined Analyze on 2026-09-23 and Narrative at Rev .43.
    expect(researchItems().map((i) => [i.label, i.kind ?? 'row'])).toEqual([
      ['Discover', 'caption'],
      ['Stock ratings', 'row'],
      ['Vol ratings', 'row'],
      ['Stock screen', 'row'],
      ['Option screen', 'row'],
      ['Analyze', 'caption'],
      ['Symbol', 'row'],
      ['Compare', 'row'],
      ['History', 'row'],
      ['Narrative', 'row'],
      ['Validate', 'caption'],
      ['Signal Decay', 'row'],
      ['Backtest', 'row'],
      // The signpost, last: not a bench, and not one of the ten pages.
      ['The Book', 'row'],
    ])
  })

  it('gives a caption no address, so nothing can navigate to a heading', () => {
    for (const cap of researchItems().filter((i) => i.kind === 'caption')) {
      expect([cap.to, cap.href, cap.children], cap.label).toEqual([undefined, undefined, undefined])
    }
  })

  it('carries the design labels and order inside Discover', () => {
    // Discover is a caption now, so its pages are the siblings that follow it
    // rather than its children — the run ends at the next caption.
    const rows = (label: string) => {
      const siblings = flatten(researchItems())
      const at = siblings.findIndex((i) => i.kind === 'caption' && i.label === label)
      if (at < 0) return []
      const out: [string, string | undefined][] = []
      for (const i of siblings.slice(at + 1)) {
        if (i.kind === 'caption') break
        out.push([i.label, i.to])
      }
      return out
    }
    // All four of the design's now. Stock ratings landed 2026-09-21 and leads
    // the fold: it is the model's own opinion, and the screens below it are
    // ways of asking about that opinion. It was built before it was routed
    // into the menu, which is how it spent a day reachable only by URL.
    //
    // The Owner settled the Stock screen on 2026-09-20 by what the prototype
    // holds rather than what it is labelled: universe, criteria stages and
    // lineage, none of which Stock Explorer has. Explorer left the fold with
    // that ruling — it is a tab shell over three subjects the design
    // redistributed — and keeps its route.
    expect(rows('Discover')).toEqual([
      ['Stock ratings', '/research/ratings/stocks'],
      ['Vol ratings', '/research/scan'],
      ['Stock screen', '/research/screener'],
      ['Option screen', '/research/contract-screener'],
    ])
    // Data is gone. Signal Health and Lens Coverage are System rows now, and
    // Contract Greeks holds no row at all — it is a tab of Symbol.
    expect(rows('Data')).toEqual([])
  })

  it('carries The Book on the rail, with the object layer under it', () => {
    // §5a.4 gave the fold a page of its own; §5a.8 took the fold out of the
    // tree. The five pages did not move — only the surface that reaches them.
    const book = EQUIP_GROUPS.find((g) => g.id === 'book')
    expect(book?.hub.to).toBe(BOOK_PAGE)
    expect(book?.pages.map((p) => [p.label, p.to])).toEqual([
      ['Hypothesis Board', '/research/loop/hypotheses'],
      ['Candidate Pool', '/research/loop/candidates'],
      ['Watchlist', '/research/watchlist'],
      ['Journal', '/research/journal'],
    ])
  })

  it('makes the Copilot Desk the group head, not a row under one', () => {
    // §5a made the Desk the fold rather than a child of it; §5a.8 moved the
    // whole group to the rail, where a head icon is exactly that shape.
    const copilot = EQUIP_GROUPS.find((g) => g.id === 'copilot')
    expect(copilot?.hub.to).toBe(COPILOT_DESK)
    // The Desk's three old children scattered on 2026-09-22 (§5a.8), each to
    // where its reader is: Daily Brief is the 9am read and went to Home, and
    // Personas and Orchestration answer the operator's and the engineer's
    // questions rather than the trader's, so they went to System › Agents.
    // What is left on the rail is the one page that is Copilot's own work.
    expect(copilot?.pages.map((p) => [p.label, p.to])).toEqual([
      ['Book starters', '/research/copilot/trading'],
    ])
    expect(homeItems().map((i) => i.to)).toContain('/research/daily-brief')
    expect(systemRoutes()).toEqual(
      expect.arrayContaining(['/research/agent-personas', '/research/orchestration']),
    )
  })

  it('reaches every route the catalog knows — tree, rail, Home or System', () => {
    // The invariant this pass is really about. Taking three folds out of the
    // tree is only safe if nothing lost its entrance, and the first version of
    // §5a.8 failed on exactly that: the Copilot's pages became unreachable.
    // So the gate is reach, not shape — and it counts every surface.
    const group = buildResearchNavGroup()
    const reached = [
      group.to as string,
      ...routesOf(researchItems()),
      ...equipRoutes(),
      ...homeItems().map((i) => i.to ?? i.id),
      ...systemRoutes(),
    ].filter((r) => !r.startsWith('/research/loop/objectives/'))
    const owed = allResearchRoutes().filter(
      (r) =>
        !r.startsWith('/research/loop/objectives/') &&
        // §5a.9's menu-less alias: `/research/workbench` is the census face of
        // the layer page, so the page it names IS reached — by the row above
        // it and by the face switch on it. A row of its own would be the two
        // rows over one page the merge removed.
        r !== '/research/workbench',
    )
    for (const route of owed) expect(reached, route).toContain(route)
  })

  it('reaches a page from the tree or from the rail, not both', () => {
    // Two lit entrances for one page is the double-selection §5a has swept
    // three times. One exception, declared rather than discovered: the
    // Decision Inbox is a Review row *and* an Autopilot icon, because it is
    // the only page that accumulates work without my hand — the design puts
    // it in both surfaces for that reason and marks the menu row `in Review`.
    const ON_BOTH = ['/research/loop/decisions']
    const tree = NAV_GROUPS.flatMap((g) => [
      g.to,
      ...getAllNavItems(g).flatMap((i) => [i.to, ...(i.children ?? []).map((c) => c.to)]),
    ]).filter((r): r is string => r != null)
    const doubled = equipRoutes().filter((r) => tree.includes(r) && !ON_BOTH.includes(r))
    expect(doubled).toEqual([])
    // And the exception is real rather than aspirational.
    expect(tree).toContain(ON_BOTH[0])
    expect(equipRoutes()).toContain(ON_BOTH[0])
  })

  it('carries no section headings — a heading you cannot click is a wasted row', () => {
    expect(buildResearchNavGroup().subGroups).toBeUndefined()
  })
})

describe('no page lights two rows', () => {
  it('never lets a heading leave the business tree', () => {
    // A fold's row borrows its first child's route. `Data` once led with a
    // `/system/*` page, and clicking the heading swapped the whole sidebar
    // for the System tree. The row may cross (it is the one that earns it);
    // the heading may not.
    for (const f of flatten(researchItems()).filter((i) => i.children?.length)) {
      expect(isSystemRoute(f.to ?? ''), `heading "${f.label}" -> ${f.to}`).toBe(false)
    }
  })

  it('reaches an objective from the Console instead, which is its roster', () => {
    // The page is not orphaned by the fold's removal: `ObjectiveBriefRow`
    // renders a link per objective on the Autopilot console, which is where
    // the design says the roster lives.
    const src = readFileSync('src/pages/research/loop/ObjectiveBriefRow.tsx', 'utf8')
    expect(src).toContain('objectivePath(row.id)')
  })

  it('has no container row left in the business tree', () => {
    // §5a.7 turned Discover · Analyze · Validate into captions and the
    // Objectives cancellation took the last fold with it: every row is a
    // place, and the rest are headings.
    expect(flatten(researchItems()).filter((i) => i.id.startsWith('fold:'))).toEqual([])
  })
})

describe('the seat-less layout', () => {
  it('lists the levels top down for the top nav and the home page', () => {
    // The seat-less layout the top nav reads mirrors the tree: the layer's
    // own page, then its three stations. The equipment groups left it with
    // the folds (§5a.8).
    expect(staticResearchSubGroups().map((s) => s.label)).toEqual([
      '',
      'Discover',
      'Analyze',
      'Validate',
    ])
  })
})
