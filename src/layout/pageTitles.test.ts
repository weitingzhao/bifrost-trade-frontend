/**
 * A page's h1 is the name its menu row promised.
 *
 * Shell Spec §5a.5 (Owner 2026-09-21): *the page's h1 = that route's `label`
 * in ROUTES = the last crumb*. A menu row is a promise and the page header is
 * where it is kept; clicking **Personas** and landing on a page headed
 * **Copilot** is the page contradicting a shell that already had it right.
 *
 * This reads the two sources the app already keeps — `routeTable`'s labels and
 * `router`'s page files — and compares them to the literal title each page
 * gives `PageHeader`. A title built at render time is skipped rather than
 * guessed at: this gate catches drift, and a string it cannot see is not
 * drift it can prove.
 *
 * The design's own sweep of its 95 routes missed two of its prototypes, which
 * is the argument for having this run with the gates instead of by eye.
 */
import { readFileSync, existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ROUTES } from './routeTable'

/**
 * Routes whose h1 is deliberately not the label, each with the reason.
 *
 * All three are the design's own escapes from the sweep it says it ran over
 * its 95 routes: its ROUTES table and its prototype disagree about the name,
 * so there is no single answer to align to. The app follows the prototypes
 * the Owner read these pages against, and the exemption carries the
 * disagreement until the design side settles it.
 */
const TITLE_MAY_DIFFER: Record<string, string> = {
  '/research/screener': 'design ROUTES says Stock screen, its own prototype heads it Screener · Stocks',
  '/research/lab/screener':
    'design ROUTES says Stock screen · method, its own prototype heads it Symbol Screener · authoring',
  '/trade/desk': 'design ROUTES says Trade (a layer head, no crumbs), its own prototype heads it Trade Desk',
  // Surfaced 2026-09-26 when the gate learned to read `PageHead`: this page
  // had moved to the new head and so had silently left the check.
  '/docs/research-blueprint': 'design ROUTES says Blueprint, its own prototype heads it Research Blueprint',
  // §5a.9: the alias names a *face*, and the page it lands on is the Research
  // layer page — whose h1 is the layer's name, as §5a.5 requires of the row
  // above it. One page, two routes, one title.
  '/research/workbench': 'a menu-less alias onto the layer page’s census face',
  // §5a.8: Rule proposals merged into the Decision Inbox as its fourth view.
  // Same shape as the census alias — the route names the queue, the h1 names
  // the page that holds it.
  // The Owner asked for both names on that view (2026-09-23), so the h1 is
  // `Decision Inbox · Rule proposals` — it carries the row's name and the
  // page's, which is why this is still an exemption rather than agreement.
  '/review/proposals': 'a deep-link alias onto the Decision Inbox’s Proposals view',
}

/** The page file each route renders, read out of the router source. */
function routePageFiles(): Map<string, string> {
  const src = readFileSync('src/lib/router.tsx', 'utf8')
  const out = new Map<string, string>()
  const re = /path:\s*'([^']+)',\s*lazy:\s*lazyPage\(\(\)\s*=>\s*import\('([^']+)'\)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) != null) {
    out.set(`/${m[1].replace(/^\//, '')}`, m[2])
  }
  return out
}

function resolve(importPath: string): string | null {
  const base = importPath.replace('@/', 'src/')
  for (const ext of ['.tsx', '.ts']) {
    if (existsSync(base + ext)) return base + ext
  }
  return null
}

/**
 * The literal title the file's first page head is given, or null — the
 * unified `<PageHead` (§16.10) or the older `<PageHeader` it is replacing.
 * Reading only the old one dropped every page moved to the new head out of
 * this gate, which is how the count fell under its floor (2026-09-26, J1).
 *
 * Bounded to that one element: an earlier version searched a fixed window and
 * ran past a JSX title into a later literal two panels down, which reported
 * drift on a page that had none.
 */
function literalPageTitle(src: string): string[] | null {
  const head = /<PageHead(?:er)?(?=[\s>])/.exec(src)
  if (head == null) return null
  let depth = 0
  for (let i = head.index + head[0].length; i < src.length; i += 1) {
    const ch = src[i]
    if (ch === '{') {
      depth += 1
      continue
    }
    if (ch === '}') {
      depth -= 1
      continue
    }
    if (ch === '>' && depth === 0) return null
    if (depth !== 0) continue
    // A prop of this element: at brace depth zero inside its own tag. The
    // first version matched any `title=` in the element and so picked up the
    // `title` attribute of a nested icon two lines down, reporting drift on
    // pages whose own title is built at render time.
    if (!src.startsWith('title=', i)) continue
    const m = /^title=(?:"([^"]*)"|\{'([^']*)'\})/.exec(src.slice(i))
    if (m) return [(m[1] ?? m[2] ?? '').trim()]
    // A page with more than one view heads itself differently on each, so its
    // title is an expression rather than a literal. Returning null there drops
    // the page out of this gate entirely — silently, and the exemption for it
    // then looks like an exemption for a page nobody renders. Read every
    // literal the expression can yield instead, and let the caller ask whether
    // any of them is the name its row promised (2026-09-23).
    // Only a one-line conditional between two string literals. A looser read
    // walked into a `title={...}` holding a comment and reported its prose as
    // the page's name, which is worse than reading nothing.
    const expr = /^title=\{[^\n}]*\?\s*'([^']*)'\s*:\s*'([^']*)'\s*\}/.exec(src.slice(i))
    return expr ? [expr[1].trim(), expr[2].trim()] : null
  }
  return null
}

interface Checked {
  path: string
  label: string
  /** Every name this page can head itself with; one entry for a single-view page. */
  titles: string[]
}

function checkedTitles(): Checked[] {
  const files = routePageFiles()
  const out: Checked[] = []
  for (const row of ROUTES) {
    const imported = files.get(row.path)
    if (!imported) continue
    const file = resolve(imported)
    if (!file) continue
    const titles = literalPageTitle(readFileSync(file, 'utf8'))
    if (titles == null) continue
    out.push({ path: row.path, label: row.label, titles })
  }
  return out
}

describe('a page is headed by the name its menu row promised (§5a.5)', () => {
  const rows = checkedTitles()

  it('reads enough routes to be worth trusting', () => {
    // A resolver that quietly stopped finding pages would pass this gate by
    // checking nothing.
    expect(rows.length).toBeGreaterThanOrEqual(50)
  })

  it('finds no page headed by a name other than its label', () => {
    const drift = rows
      .filter((r) => !r.titles.includes(r.label) && TITLE_MAY_DIFFER[r.path] == null)
      .map((r) => `${r.path}: menu says "${r.label}", page says "${r.titles.join('" / "')}"`)
    expect(drift).toEqual([])
  })

  it('keeps every exemption pointing at a route that still exists', () => {
    // An exemption for a page nobody renders is an exemption nobody reviews.
    const known = new Set(rows.map((r) => r.path))
    expect(Object.keys(TITLE_MAY_DIFFER).filter((p) => !known.has(p))).toEqual([])
  })

  it('holds no exemption for a page that already agrees with its label', () => {
    // When the design settles those two names, this fails and the exemption
    // has to go — which is how a temporary allowance stays temporary.
    const agreeing = rows.filter((r) => TITLE_MAY_DIFFER[r.path] != null && r.titles.includes(r.label))
    expect(agreeing.map((r) => r.path)).toEqual([])
  })
})
