import { describe, expect, it } from 'vitest'
import { PAGE_ROUTES } from '@/layout/routeRegistry'
import { layerForPath } from './layers'

describe('layerForPath', () => {
  it('gives each design group its own layer', () => {
    expect(layerForPath('/research/symbol')).toBe('analysis')
    expect(layerForPath('/portfolio/positions')).toBe('result')
    expect(layerForPath('/trade/desk')).toBe('execution')
    expect(layerForPath('/risk/sizing')).toBe('risk')
    expect(layerForPath('/review/fit')).toBe('review')
    expect(layerForPath('/home')).toBe('home')
  })

  it('keeps Market on the analysis layer', () => {
    // A fold inside Research in the design, not a layer: the market's facts are
    // what the analysis layer is about.
    expect(layerForPath('/market/live')).toBe('analysis')
  })

  it('matches on whole segments', () => {
    expect(layerForPath('/review')).toBe('review')
    expect(layerForPath('/reviewer')).toBe('base')
    expect(layerForPath('/homeward')).toBe('base')
  })

  it('leaves the machine room and Strategy on base', () => {
    expect(layerForPath('/system/daemon')).toBe('base')
    expect(layerForPath('/docs/tech-stack')).toBe('base')
    // Strategy has no design group; it inherits `execution` when it moves into
    // Trade › Rules, and reads as base until then.
    expect(layerForPath('/strategy/instances')).toBe('base')
  })

  it('answers for every route the app has', () => {
    for (const r of PAGE_ROUTES) {
      expect(layerForPath(r.path), r.path).toMatch(/^(base|home|execution|result|analysis|risk|review)$/)
    }
  })

  it('splits the app across the layers it has pages for today', () => {
    // /trade/plans (C1-c) put a real page on the execution layer; /risk/portfolio
    // (2026-09-17) put the first one on the risk layer, and Today put one on the
    // home layer the same day. Only review still has a design route and no page.
    const seen = new Set(PAGE_ROUTES.map((r) => layerForPath(r.path)))
    expect([...seen].sort()).toEqual(['analysis', 'base', 'execution', 'home', 'result', 'risk'])
  })
})
