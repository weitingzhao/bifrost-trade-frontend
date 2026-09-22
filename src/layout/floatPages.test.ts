/**
 * The gate on the one duplication this pass introduces.
 *
 * A float renders the route's component directly, which means a second map
 * from route to module beside `router.tsx`. Two maps drift; this one reads the
 * router's source and fails if they ever disagree.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FLOAT_PAGES } from './floatPages'
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
function floatModules(): Map<string, string> {
  const src = readFileSync('src/layout/floatPages.ts', 'utf8')
  const out = new Map<string, string>()
  const re = /'([^']+)':\s*lazy\(\(\)\s*=>\s*import\('([^']+)'\)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) != null) out.set(m[1], m[2])
  return out
}

describe('the float page table', () => {
  it('covers every route the rail can open', () => {
    for (const to of equipRoutes()) {
      expect(FLOAT_PAGES[to], `${to} has no float component`).toBeDefined()
    }
  })

  it('renders the same module the router renders for that route', () => {
    const router = routerModules()
    for (const [to, module] of floatModules()) {
      expect(router.get(to), `${to} is not a router route`).toBe(module)
    }
  })

  it('offers nothing the rail cannot open', () => {
    // A page in here that no icon reaches is a chunk nobody loads and a claim
    // nobody checks.
    expect(Object.keys(FLOAT_PAGES).sort()).toEqual([...equipRoutes()].sort())
  })
})
