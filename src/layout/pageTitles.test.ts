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
  '/research/ratings/stocks': 'design ROUTES says Stock ratings, its own prototype heads it Ratings · Stocks',
  '/research/screener': 'design ROUTES says Stock screen, its own prototype heads it Screener · Stocks',
  '/trade/desk': 'design ROUTES says Trade (a layer head, no crumbs), its own prototype heads it Trade Desk',
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
 * The literal title the file's first `<PageHeader` is given, or null.
 *
 * Bounded to that one element: an earlier version searched a fixed window and
 * ran past a JSX title into a later literal two panels down, which reported
 * drift on a page that had none.
 */
function literalPageTitle(src: string): string | null {
  const start = src.indexOf('<PageHeader')
  if (start < 0) return null
  let depth = 0
  for (let i = start + '<PageHeader'.length; i < src.length; i += 1) {
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
    return m ? (m[1] ?? m[2] ?? '').trim() : null
  }
  return null
}

interface Checked {
  path: string
  label: string
  title: string
}

function checkedTitles(): Checked[] {
  const files = routePageFiles()
  const out: Checked[] = []
  for (const row of ROUTES) {
    const imported = files.get(row.path)
    if (!imported) continue
    const file = resolve(imported)
    if (!file) continue
    const title = literalPageTitle(readFileSync(file, 'utf8'))
    if (title == null) continue
    out.push({ path: row.path, label: row.label, title })
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
      .filter((r) => r.title !== r.label && TITLE_MAY_DIFFER[r.path] == null)
      .map((r) => `${r.path}: menu says "${r.label}", page says "${r.title}"`)
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
    const agreeing = rows.filter((r) => TITLE_MAY_DIFFER[r.path] != null && r.title === r.label)
    expect(agreeing.map((r) => r.path)).toEqual([])
  })
})
