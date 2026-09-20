/**
 * One tree, both homes.
 *
 * The seats split the menu from 2026-09-08 until the Owner retired them
 * (2026-09-19, ruling Vision §15 Q2): with the object layer out in the Book,
 * the engine and the stations are short enough to stand together, and a
 * switcher that hides one of them answers nothing.
 */
import { describe, expect, it } from 'vitest'
import { isSystemRoute } from './routeRegistry'
import {
  allResearchRoutes,
  BOOK_PAGES,
  buildResearchNavGroup,
  COPILOT_DESK,
  researchItems,
  staticResearchSubGroups,
} from './researchNavCatalog'
import type { ShellNavItem } from '@bifrost/ui'

const ctx = {
  objectives: [
    { id: 'obj-a', title: 'Daily Loop Stock Explorer' },
    { id: 'obj-b', title: 'Morning IV Hot Watch' },
  ],
}

const OVERVIEW = '/research/overview'
const AUTOPILOT_HOME = '/research/loop/harness'
const PIPELINE_HOME = '/research/workbench'

function flatten(items: ShellNavItem[]): ShellNavItem[] {
  return items.flatMap((i) => [i, ...flatten(i.children ?? [])])
}

/**
 * Every page the tree reaches. A fold owns no page — its row borrows its
 * first child's route — so counting it would count that page twice.
 */
function routesOf(items: ShellNavItem[]): string[] {
  return flatten(items)
    .filter((i) => !i.id.startsWith('fold:'))
    .map((i) => i.to ?? i.id)
}

describe('one tree, both homes', () => {
  it('stands five rows in the design order: Overview, engine, stations, Book, Copilot', () => {
    // Market left for Home (§5a.1): Home is organised by time of day, and
    // Live · Alerts · Events are the market's own clock.
    expect(researchItems(ctx).map((i) => i.to)).toEqual([
      OVERVIEW,
      AUTOPILOT_HOME,
      PIPELINE_HOME,
      BOOK_PAGES.hypotheses.to,
      COPILOT_DESK,
    ])
  })

  it('shows Autopilot and Pipeline at once — the split the Owner retired', () => {
    const routes = routesOf(researchItems(ctx))
    expect(routes).toContain(AUTOPILOT_HOME)
    expect(routes).toContain(PIPELINE_HOME)
  })

  it('keeps the Autopilot home to the engine: Inbox and the objectives', () => {
    const home = researchItems(ctx).find((i) => i.to === AUTOPILOT_HOME)
    expect(home?.defaultOpen).toBe(true)
    expect(home?.children?.map((c) => c.label)).toEqual(['Decision Inbox', 'Objectives'])
  })

  it('names the stations Pipeline — the Vision destination for the Workbench folds', () => {
    // Vision §12.2: "Workbench seat (四折) → Pipeline — 改名, 去 seat 化". The
    // route keeps its path; only the name and the standing changed.
    const home = researchItems(ctx).find((i) => i.to === PIPELINE_HOME)
    expect(home?.label).toBe('Pipeline')
    // Three folds, not four: package 2026-09-20.1 dissolved Data by the rule
    // that a page taking no symbol is plumbing and belongs to System.
    expect(home?.children?.map((i) => [i.label, i.id.startsWith('fold:')])).toEqual([
      ['Discover', true],
      ['Analyze', true],
      ['Validate', true],
    ])
  })

  it('carries the design labels and order inside Discover', () => {
    const rows = (label: string) =>
      (flatten(researchItems(ctx)).find((i) => i.label === label)?.children ?? []).map(
        (i) => [i.label, i.to],
      )
    // Ratings and Screener homes are unbuilt; their existing children stand
    // flat in the design's order until W3/W5 build the homes. Stock Screener
    // joined from the dissolved Data fold: the design's `/research/screener`
    // and `/research/explorer` are both labelled "Stock screen", so which of
    // the app's two pages that names is the Owner's to settle — until then
    // both keep the names they have.
    expect(rows('Discover')).toEqual([
      ['Vol ratings', '/research/scan'],
      ['Stock Explorer', '/research/explorer'],
      ['Option screen', '/research/contract-screener'],
      ['Stock Screener', '/research/stock-screener'],
    ])
    // Data is gone. Signal Health and Lens Coverage are System rows now, and
    // Contract Greeks holds no row at all — it is a tab of Symbol.
    expect(rows('Data')).toEqual([])
  })

  it('carries The Book — the object layer belongs to every operator', () => {
    const fold = flatten(researchItems(ctx)).find((i) => i.id === 'fold:book')
    expect(fold?.label).toBe('The Book')
    expect(fold?.children?.map((c) => [c.label, c.to])).toEqual([
      ['Hypothesis Board', '/research/loop/hypotheses'],
      ['Candidate Pool', '/research/loop/candidates'],
      ['Watchlist', '/research/watchlist'],
    ])
  })

  it('makes Copilot a page with pages under it, not a container', () => {
    // §5a: the fold's `to` was its own first child, so clicking Copilot
    // selected Desk and two rows lit for one page. The Desk is the fold now,
    // and the id is the path — the sidebar matches the active row by id
    // alone, so a `fold:*` id would never light while you stood on it.
    const fold = flatten(researchItems(ctx)).find((i) => i.label === 'Copilot')
    expect([fold?.id, fold?.to]).toEqual([COPILOT_DESK, COPILOT_DESK])
    expect(fold?.children?.map((c) => [c.label, c.to])).toEqual([
      ['Daily Brief', '/research/daily-brief'],
      ['Personas', '/research/agent-personas'],
    ])
  })

  it('reaches every route the catalog knows, each exactly once', () => {
    const routes = routesOf(researchItems(ctx)).filter(
      (r) => !r.startsWith('/research/loop/objectives/'),
    )
    expect(new Set(routes).size).toBe(routes.length)
    expect([...routes].sort()).toEqual([...allResearchRoutes()].sort())
  })

  it('carries no section headings — a heading you cannot click is a wasted row', () => {
    expect(buildResearchNavGroup(ctx).subGroups).toBeUndefined()
  })
})

describe('no page lights two rows', () => {
  it('never lets a heading leave the business tree', () => {
    // A fold's row borrows its first child's route. `Data` once led with a
    // `/system/*` page, and clicking the heading swapped the whole sidebar
    // for the System tree. The row may cross (it is the one that earns it);
    // the heading may not.
    for (const f of flatten(researchItems(ctx)).filter((i) => i.children?.length)) {
      expect(isSystemRoute(f.to ?? ''), `heading "${f.label}" -> ${f.to}`).toBe(false)
    }
  })

  it('sends Objectives to an objective, not to the console above it', () => {
    const [objectives] = flatten(researchItems(ctx)).filter((i) => i.label === 'Objectives')
    expect(objectives.to).toBe('/research/loop/objectives/obj-a')
    expect(objectives.to).not.toBe(AUTOPILOT_HOME)
  })

  it('drops the Objectives row when there is nothing to list', () => {
    expect(flatten(researchItems({ objectives: [] })).filter((i) => i.label === 'Objectives')).toEqual([])
  })

  it('folded categories land where the design points them', () => {
    // Copilot left this list when it became a dual row (§5a) and Market left
    // the group entirely (§5a.1) — a `fold:` id now means a true container.
    const folds = flatten(researchItems(ctx)).filter((i) => i.id.startsWith('fold:'))
    expect(folds.map((f) => f.label)).toEqual([
      'Objectives',
      'Discover',
      'Analyze',
      'Validate',
      'The Book',
    ])
    for (const f of folds) {
      // Validate is the design's own exception: its heading lands on Backtest
      // (shell-registry `fold:validate`) while Signal Decay stays the first row.
      const target = f.label === 'Validate' ? '/research/backtest' : f.children?.[0].to
      expect(f.to, f.label).toBe(target)
    }
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
