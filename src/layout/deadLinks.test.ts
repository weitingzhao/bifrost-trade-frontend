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
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import type { RouteObject } from 'react-router-dom'
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

  it('finds no link pointing at a path the router cannot match', () => {
    const dead = [...linkTargets()]
      .filter(([p]) => !reaches(p))
      .map(([p, files]) => `${p}  ←  ${files.join(', ')}`)
      .sort()
    expect(dead).toEqual([])
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
    expect(reaches('/research/compare')).toBe(false)
    // …while the dynamic segments it must not flag still resolve.
    expect(reaches('/research/loop/objectives/obj-1')).toBe(true)
    expect(reaches('/risk/margin')).toBe(true)
  })
})
