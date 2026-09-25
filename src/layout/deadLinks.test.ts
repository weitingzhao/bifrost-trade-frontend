/**
 * No link may point at a page that does not exist.
 *
 * Written 2026-09-21 after an interaction sweep found that every
 * active-hypothesis card on Pipeline opened `/research/hypothesis/{id}` — a
 * route that had never been mounted — and that an unmatched path rendered a
 * blank document rather than any boundary. The component's own comment had
 * claimed the failure degraded gracefully. Nobody had checked.
 *
 * A scan of the whole source then found two more, one of them written by the
 * same hand that wrote the rule: The Book's footnote linked to `Compare`,
 * which is unbuilt, and Today's earnings check opened `/research/events`,
 * likewise. Both were invisible in review and instant under a scan.
 *
 * So the scan is a gate. It reads every literal link target in `src/` and
 * resolves it against the **router itself** — not a list of routes kept
 * alongside it, which is the copy that goes stale.
 *
 * What it cannot see, and what therefore still needs a click: a target built
 * from a variable or a template with a hole in it. Those go through helpers
 * (`withSymbolParam`, `labHref`) whose own bases are literals and are checked
 * here; a new helper that assembles a path from scratch is the gap, and the
 * interaction sweep in `.claude/skills/design-walk` is what closes it.
 */
import { existsSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import type { RouteObject } from 'react-router-dom'
import type { ShellNavItem } from '@bifrost/ui'
import { getAllNavItems, NAV_GROUPS, SYSTEM_NAV_GROUPS } from '@/layout/navConfig'
import { allResearchRoutes } from '@/layout/researchNavCatalog'
import { REDIRECTS } from '@/layout/redirectRoutes'
import { router } from '@/lib/router'

/** Every path the router can match, with its dynamic segments intact. */
function routerPaths(routes: readonly RouteObject[], base = ''): string[] {
  const out: string[] = []
  for (const r of routes) {
    const here = r.path == null ? base : `${base}/${r.path}`.replace(/\/{2,}/g, '/')
    if (r.path != null) out.push(here === '' ? '/' : here)
    if (r.children) out.push(...routerPaths(r.children, here))
  }
  return out
}

const SOURCE_FILES = execSync("git ls-files 'src/**/*.tsx' 'src/**/*.ts'", { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => !f.includes('.test.'))
  // The index still lists a file deleted in the working tree until the delete
  // is committed — and in this shared checkout that can be another session's.
  .filter((f) => existsSync(f))

/**
 * Where a link target is written. Each of these is a place a path reaches the
 * router: a `<Link to>`, an imperative `navigate()`, an anchor's `href`, and
 * the `to:` field on a row descriptor that a page later hands to a `<Link>`.
 */
const TARGET_PATTERNS: readonly RegExp[] = [
  /\bto=\{?["'`](\/[^"'`{}\s]*)["'`]\}?/g,
  /\bnavigate\(\s*["'`](\/[^"'`{}\s]*)["'`]/g,
  /\bhref=["'`](\/[^"'`{}\s]*)["'`]/g,
  /\bto:\s*["'](\/[^"']*)["']/g,
]

function linkTargets(): Map<string, string[]> {
  const found = new Map<string, Set<string>>()
  for (const file of SOURCE_FILES) {
    const src = readFileSync(file, 'utf8')
    for (const re of TARGET_PATTERNS) {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(src)) != null) {
        // A query or a hash is the destination's business, not the router's.
        const path = m[1].split('?')[0].split('#')[0]
        if (path === '' || path === '/') continue
        const at = found.get(path) ?? new Set<string>()
        at.add(file)
        found.set(path, at)
      }
    }
  }
  return new Map([...found].map(([k, v]) => [k, [...v]]))
}

describe('every internal link reaches a route', () => {
  const paths = routerPaths(router.routes)
  const exact = new Set(paths)
  const dynamic = paths
    .filter((p) => p.includes(':'))
    .map((p) => new RegExp(`^${p.replace(/:[^/]+/g, '[^/]+')}$`))

  const reaches = (p: string) => exact.has(p) || dynamic.some((re) => re.test(p))

  /**
   * Paths that appear in the source as **data, not as somewhere to go**.
   *
   * The Pipeline census is keyed by route because the design's eleven rows
   * are eleven pages, and three of them this side has not built. The census
   * renders those rows without a link — `pageBuilt` is read off this same
   * router — so nothing here points anywhere. The scan cannot tell a key from
   * a target, which is the price of a scan that reads the source rather than
   * the running app, and is worth paying.
   *
   * Each entry earns its place twice: the path must be one the design has and
   * the app does not, and no file may actually link to it. The second test
   * below checks the first half; the census's own `pageBuilt` check is the
   * second.
   */
  // Empty since 2026-09-25: `/research/narrative`, the last entry, was built.
  const PATHS_USED_AS_DATA: Record<string, string> = {}

  it('finds no link pointing at a path the router cannot match', () => {
    const dead = [...linkTargets()]
      .filter(([p]) => !reaches(p) && PATHS_USED_AS_DATA[p] == null)
      .map(([p, files]) => `${p}  ←  ${files.join(', ')}`)
      .sort()
    expect(dead).toEqual([])
  })

  it('drops a data path from the list once the app builds the page', () => {
    // An allowance for a route that now exists is an allowance nobody reviews,
    // and it would hide a genuine dead link behind a stale excuse.
    for (const p of Object.keys(PATHS_USED_AS_DATA)) {
      expect(reaches(p), `${p} is routed now — take it off PATHS_USED_AS_DATA`).toBe(false)
    }
  })


  it('reads the router, and reads enough of the source to be worth trusting', () => {
    // Two ways this gate goes quiet without anyone noticing: the glob stops
    // matching, or the patterns stop finding anything. Both would leave it
    // passing over an empty set.
    expect(SOURCE_FILES.length).toBeGreaterThan(300)
    expect(linkTargets().size).toBeGreaterThan(40)
    expect(paths.length).toBeGreaterThan(90)
  })

  it('still catches a path nobody routed', () => {
    expect(reaches('/research/hypothesis/abc')).toBe(false)
    expect(reaches('/docs/progress')).toBe(false)
    // …while the dynamic segments it must not flag still resolve.
    expect(reaches('/research/loop/objectives/obj-1')).toBe(true)
    expect(reaches('/risk/margin')).toBe(true)
  })
})

/**
 * …and no page may be unreachable.
 *
 * The other direction of the same failure. A dead link points at nothing; an
 * orphan *is* nothing pointed at — routed, rendering, and with no way in but
 * the address bar. Stock ratings shipped that way and spent a day reachable
 * only by URL, which the Owner found by looking at the sidebar rather than by
 * anything the suite checked.
 *
 * "Reachable" is the nav tree or a link from some page. The nav set is
 * composed the way the sidebar composes it — the static groups plus the
 * Research catalog, which is built per-render from the objectives and so
 * cannot be read from a constant.
 */
const REACHABLE_BY_DESIGN: Record<string, string> = {
  // Owner ruling 2026-09-20: a tab shell over SEPA, Momentum and Event Radar,
  // all three of which the design redistributed. It answers to no design row,
  // so it holds no menu row — the route stays for the bookmarks that predate
  // the ruling.
  '/research/lab/today':
    'A method face holds no menu row by design — the ⧉ switch on its reading (Ratings · Stocks) is the way in, and the link is built from the faces table at render, which this scan cannot see.',
  '/research/lab/symbol':
    'A method face holds no menu row by design — the ⧉ switch on its reading (Symbol) is the way in, and the link is built from the faces table at render, which this scan cannot see.',
  '/research/lab/screener':
    'A method face holds no menu row by design — the ⧉ switch on its reading (Stock screen) is the way in, and the link is built from the faces table at render, which this scan cannot see.',
}

function navPaths(): Set<string> {
  const out = new Set<string>()
  const walk = (items: readonly ShellNavItem[]) => {
    for (const it of items) {
      const to = it.to ?? it.href
      if (to?.startsWith('/')) out.add(to.split('?')[0].split('#')[0])
      if (it.children) walk(it.children)
    }
  }
  for (const g of [...NAV_GROUPS, ...SYSTEM_NAV_GROUPS]) {
    if (g.to) out.add(g.to)
    walk(getAllNavItems(g))
  }
  // The Research group is rebuilt per render, so its rows are not in the
  // static constant the others live in.
  for (const p of allResearchRoutes()) out.add(p)
  return out
}

describe('every page can be reached', () => {
  const redirects = new Set(REDIRECTS.map((r) => r.path))
  const pages = routerPaths(router.routes).filter(
    (p) => p !== '/' && p !== '/*' && !p.includes(':') && !redirects.has(p),
  )

  it('finds no page with neither a menu row nor a link into it', () => {
    const nav = navPaths()
    const linked = new Set(linkTargets().keys())
    const orphans = pages
      .filter((p) => !nav.has(p) && !linked.has(p) && REACHABLE_BY_DESIGN[p] == null)
      .sort()
    expect(orphans).toEqual([])
  })

  it('keeps the allow-list honest — every entry is still a real route', () => {
    // An allow-list that outlives its route is a note about nothing, and the
    // next reader has to work out whether it ever mattered.
    for (const p of Object.keys(REACHABLE_BY_DESIGN)) expect(pages).toContain(p)
  })

  it('reads enough of the nav to be worth trusting', () => {
    expect(navPaths().size).toBeGreaterThan(50)
  })
})
