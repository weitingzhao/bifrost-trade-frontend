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
  buildResearchNavGroup,
  COPILOT_DESK,
  researchItems,
  staticResearchSubGroups,
} from './researchNavCatalog'
import type { ShellNavItem } from '@bifrost/ui'


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
  it('stands four rows in the design order: engine, stations, Book, Copilot', () => {
    // Market left for Home (§5a.1): Home is organised by time of day, and
    // Live · Alerts · Events are the market's own clock. Overview left the
    // list in the same round — it is the layer's heading now, not a row in it.
    expect(buildResearchNavGroup().to).toBe(OVERVIEW)
    expect(researchItems().map((i) => i.to)).toEqual([
      AUTOPILOT_HOME,
      PIPELINE_HOME,
      BOOK_PAGE,
      COPILOT_DESK,
    ])
  })

  it('shows Autopilot and Pipeline at once — the split the Owner retired', () => {
    const routes = routesOf(researchItems())
    expect(routes).toContain(AUTOPILOT_HOME)
    expect(routes).toContain(PIPELINE_HOME)
  })

  it('keeps the Autopilot home to two rows: the Console and its Inbox', () => {
    // Objectives left on 2026-09-21 (design Rev 2026-09-20.1). It was the one
    // row that made **data rows** into **menu rows**, which is the same line
    // that keeps every hypothesis, candidate and symbol out of the tree — and
    // an objective is live data a static menu cannot honestly hold.
    const home = researchItems().find((i) => i.to === AUTOPILOT_HOME)
    expect(home?.defaultOpen).toBe(true)
    expect(home?.children?.map((c) => c.label)).toEqual(['Decision Inbox'])
  })

  it('puts no objective in the menu at all', () => {
    const everything = flatten(researchItems())
    expect(everything.filter((i) => (i.to ?? '').startsWith('/research/loop/objectives/'))).toEqual(
      [],
    )
    expect(everything.filter((i) => i.label === 'Objectives')).toEqual([])
  })

  it('names the stations Pipeline — the Vision destination for the Workbench folds', () => {
    // Vision §12.2: "Workbench seat (四折) → Pipeline — 改名, 去 seat 化". The
    // route keeps its path; only the name and the standing changed.
    const home = researchItems().find((i) => i.to === PIPELINE_HOME)
    expect(home?.label).toBe('Pipeline')
    // §5a.7: the three are captions now, and their nine pages are siblings —
    // twelve entries at one depth, not three rows over three lists.
    // Ten entries: three captions and the seven pages they name. The design
    // draws twelve because its Analyze carries three rows where this side
    // carries one — a difference that predates §5a.7 and is not its business.
    expect(home?.children?.map((i) => [i.label, i.kind ?? 'row'])).toEqual([
      ['Discover', 'caption'],
      ['Stock ratings', 'row'],
      ['Vol ratings', 'row'],
      ['Stock screen', 'row'],
      ['Option screen', 'row'],
      ['Analyze', 'caption'],
      ['Symbol', 'row'],
      ['Validate', 'caption'],
      ['Signal Decay', 'row'],
      ['Backtest', 'row'],
    ])
  })

  it('gives a caption no address, so nothing can navigate to a heading', () => {
    const home = researchItems().find((i) => i.to === PIPELINE_HOME)
    for (const cap of (home?.children ?? []).filter((i) => i.kind === 'caption')) {
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

  it('carries The Book — a page of its own, with the object layer under it', () => {
    // §5a.4: four parallel children and none of them is The Book, so the fold
    // stopped aliasing its first child and got a page. Keyed by path, like
    // every dual row, so it lights while you stand on it.
    const fold = flatten(researchItems()).find((i) => i.label === 'The Book')
    expect([fold?.id, fold?.to]).toEqual([BOOK_PAGE, BOOK_PAGE])
    // Four since 2026-09-21: the design's `fold:book` has carried a Journal
    // row since the package was written, and the row waited on the page.
    expect(fold?.children?.map((c) => [c.label, c.to])).toEqual([
      ['Hypothesis Board', '/research/loop/hypotheses'],
      ['Candidate Pool', '/research/loop/candidates'],
      ['Watchlist', '/research/watchlist'],
      ['Journal', '/research/journal'],
    ])
  })

  it('makes Copilot a page with pages under it, not a container', () => {
    // §5a: the fold's `to` was its own first child, so clicking Copilot
    // selected Desk and two rows lit for one page. The Desk is the fold now,
    // and the id is the path — the sidebar matches the active row by id
    // alone, so a `fold:*` id would never light while you stood on it.
    const fold = flatten(researchItems()).find((i) => i.label === 'Copilot')
    expect([fold?.id, fold?.to]).toEqual([COPILOT_DESK, COPILOT_DESK])
    // Three rows since Rev 2026-09-21.6: Orchestration is a menu row, not a
    // fourth tab on the Desk — a tab is another face of one route, and the
    // wiring diagram is its own page with its own reader.
    expect(fold?.children?.map((c) => [c.label, c.to])).toEqual([
      ['Daily Brief', '/research/daily-brief'],
      ['Personas', '/research/agent-personas'],
      ['Orchestration', '/research/orchestration'],
    ])
  })

  it('reaches every route the catalog knows, each exactly once', () => {
    const group = buildResearchNavGroup()
    // The group's own heading is a route too (§5a.1) — the Overview — so the
    // reach is the rows plus it, not the rows alone.
    const routes = [group.to as string, ...routesOf(researchItems())].filter(
      (r) => !r.startsWith('/research/loop/objectives/'),
    )
    expect(new Set(routes).size).toBe(routes.length)
    expect([...routes].sort()).toEqual([...allResearchRoutes()].sort())
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
    expect(staticResearchSubGroups().map((s) => s.label)).toEqual([
      '',
      'The Book',
      'Autopilot · unattended',
      'Copilot · on request',
      'Pipeline · Discover',
      'Pipeline · Analyze',
      'Pipeline · Validate',
    ])
  })
})
