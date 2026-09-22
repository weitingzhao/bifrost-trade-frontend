/**
 * The gate on the one duplication the surfaces introduce.
 *
 * A surface renders the route's component directly, which means a second map
 * from route to module beside `router.tsx`. Two maps drift; this one reads the
 * router's source and fails if they ever disagree.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SURFACE_PAGES } from './surfacePages'
import { equipRoutes } from './equip'

/** `path: 'x', lazy: lazyPage(() => import('@/…'))` — the router's own shape. */
function routerModules(): Map<string, string> {
  const src = readFileSync('src/lib/router.tsx', 'utf8')
  const out = new Map<string, string>()
  const re = /path:\s*'([^']+)',\s*lazy:\s*lazyPage\(\(\)\s*=>\s*import\('([^']+)'\)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) != null) out.set(`/${m[1].replace(/^\//, '')}`, m[2])
  return out
}

/** The same shape, read out of this module's own source. */
function surfaceModules(): Map<string, string> {
  const src = readFileSync('src/layout/surfacePages.ts', 'utf8')
  const out = new Map<string, string>()
  const re = /'([^']+)':\s*lazy\(\(\)\s*=>\s*import\('([^']+)'\)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) != null) out.set(m[1], m[2])
  return out
}

describe('the surface page table', () => {
  it('covers every route the rail can open', () => {
    for (const to of equipRoutes()) {
      expect(SURFACE_PAGES[to], `${to} has no surface component`).toBeDefined()
    }
  })

  it('renders the same module the router renders for that route', () => {
    const router = routerModules()
    for (const [to, module] of surfaceModules()) {
      expect(router.get(to), `${to} is not a router route`).toBe(module)
    }
  })

  it('offers nothing the rail cannot open', () => {
    // A page in here that no icon reaches is a chunk nobody loads and a claim
    // nobody checks.
    expect(Object.keys(SURFACE_PAGES).sort()).toEqual([...equipRoutes()].sort())
  })
})
