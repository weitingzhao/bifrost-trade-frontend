import { describe, expect, it } from 'vitest'
import type { RouteObject } from 'react-router-dom'
import { router } from '@/lib/router'
import {
  aliasesFor,
  FALLBACK_ROUTE,
  PAGE_ROUTES,
  REDIRECT_ROUTES,
  ROUTES,
  routeFor,
} from './routeRegistry'

/**
 * Every path the router can land on, resolved to absolute.
 *
 * An optional segment (`:instanceId?`) is two reachable paths, with and
 * without it, so both are emitted — the registry has to name both.
 */
function routerPaths(routes: readonly RouteObject[], parent = ''): string[] {
  return routes.flatMap((r) => {
    const own = r.path === undefined ? parent : `${parent}/${r.path}`.replace(/\/+/g, '/')
    const here =
      r.path === undefined || r.path === ''
        ? []
        : own.endsWith('?')
          ? [own.slice(0, -1), own.replace(/\/[^/]+\?$/, '')]
          : [own]
    return [...here, ...routerPaths(r.children ?? [], own)]
  })
}

const ROUTER_PATHS = routerPaths(router.routes).filter((p) => p !== '/')

describe('route registry', () => {
  it('covers every path the router registers — a new route without an entry fails here', () => {
    const registered = new Set(ROUTES.map((r) => r.path))
    const missing = ROUTER_PATHS.filter((p) => !registered.has(p))
    expect(missing).toEqual([])
  })

  it('carries no entry for a path the router does not have', () => {
    const reachable = new Set(ROUTER_PATHS)
    expect(ROUTES.map((r) => r.path).filter((p) => !reachable.has(p))).toEqual([])
  })

  it('names each path exactly once', () => {
    const paths = ROUTES.map((r) => r.path)
    expect(paths.length).toBe(new Set(paths).size)
  })

  it('never repeats the page name in its own trail', () => {
    expect(ROUTES.filter((r) => r.crumbs?.includes(r.label)).map((r) => r.path)).toEqual([])
  })

  it('resolves dynamic segments', () => {
    expect(routeFor('/research/loop/objectives/obj-1').label).toBe('Objective')
    expect(routeFor('/research/loop/runs/42').label).toBe('Loop Run')
    expect(routeFor('/research/signal-decay/AAPL').crumbs).toEqual(['Research', 'Validate'])
    expect(routeFor('/strategy/instances/7').label).toBe('Instances')
  })

  it('sends every retired path to a page that exists', () => {
    const pages = new Set(PAGE_ROUTES.map((r) => r.path))
    const broken = REDIRECT_ROUTES.filter((r) => !pages.has(r.redirect.split(/[?#]/)[0]))
    expect(broken.map((r) => `${r.path} -> ${r.redirect}`)).toEqual([])
  })

  it('never redirects to a redirect', () => {
    // `/research/stock-data` went to `/settings/data-readiness`, which is
    // itself retired: two navigations and two history entries to reach one
    // page. Deriving the router from this table makes the shape checkable.
    const retired = new Set(REDIRECT_ROUTES.map((r) => r.path))
    const hops = REDIRECT_ROUTES.filter((r) => retired.has(r.redirect.split(/[?#]/)[0]))
    expect(hops.map((r) => `${r.path} -> ${r.redirect}`)).toEqual([])
  })

  it('offers a page its old names', () => {
    const symbol = aliasesFor('/research/symbol').map((a) => a.path)
    expect(symbol).toContain('/research/vol-regime')
    expect(symbol).toContain('/research/dossier')
    expect(symbol).toContain('/research/iv-radar')
    // Query and hash do not split one destination into several.
    expect(aliasesFor('/system/coverage').map((a) => a.path)).toContain(
      '/settings/coverage/option',
    )
    expect(aliasesFor('/portfolio/backing').map((a) => a.path)).toContain(
      '/portfolio/model-analysis',
    )
    expect(aliasesFor('/research/watchlist')).toHaveLength(1)
    expect(aliasesFor('/portfolio/positions')).toEqual([])
  })

  it('falls back for an unknown path', () => {
    expect(routeFor('/nope')).toBe(FALLBACK_ROUTE)
  })
})
