import { describe, expect, it } from 'vitest'
import { PAGE_ROUTES } from '@/layout/routeRegistry'
import { LAYER_OF_GROUP, layerForPath } from './layers'

describe('layerForPath', () => {
  it('gives each design group its own layer', () => {
    expect(layerForPath('/research/symbol')).toBe('analysis')
    expect(layerForPath('/portfolio/positions')).toBe('result')
    expect(layerForPath('/trade/desk')).toBe('execution')
    expect(layerForPath('/risk/sizing')).toBe('risk')
    expect(layerForPath('/review/fit')).toBe('review')
    expect(layerForPath('/home')).toBe('home')
  })

  it('puts the three pages Home took from Market on the home layer', () => {
    // §5a.1 (Rev 2026-09-20.23) overturned §0's reading: those three are the
    // market's own clock, and Home is the layer organised by time. The routes
    // did not move with the fold, so a prefix cannot find them.
    expect(layerForPath('/market/live')).toBe('home')
    expect(layerForPath('/research/event-radar')).toBe('home')
    expect(layerForPath('/research/events')).toBe('home')
    // Everything else under those prefixes keeps its own layer.
    expect(layerForPath('/market/depth')).toBe('analysis')
    expect(layerForPath('/research/symbol')).toBe('analysis')
  })

  it('gives a layer page its own layer, not the base ramp', () => {
    // The page that IS the layer is where the ramp should be most itself.
    expect(layerForPath('/risk')).toBe('risk')
    expect(layerForPath('/portfolio')).toBe('result')
    expect(layerForPath('/riskier')).toBe('base')
    expect(layerForPath('/portfolios')).toBe('base')
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
    // (2026-09-17) put the first one on the risk layer, Today put one on the
    // home layer the same day, and the five Review pages closed the last gap:
    // every layer the design names now has at least one page here.
    const seen = new Set(PAGE_ROUTES.map((r) => layerForPath(r.path)))
    expect([...seen].sort()).toEqual(['analysis', 'base', 'execution', 'home', 'result', 'review', 'risk'])
  })
})

describe('a page whose path and layer disagree', () => {
  it('reads Contract Greeks under Risk, where the design re-homed it', () => {
    // The path stays `/research/` because addresses are cheap to keep and
    // expensive to break; the layer follows the subject. Found live once the
    // layer became a mark: the top bar's edge and the lit numeral both said
    // Research on a page filed under Risk.
    expect(layerForPath('/research/greeks')).toBe('risk')
    expect(layerForPath('/research/symbol')).toBe('analysis')
  })

  it('maps each sidebar group to its layer', () => {
    expect(LAYER_OF_GROUP.Risk).toBe('risk')
    expect(LAYER_OF_GROUP.Research).toBe('analysis')
    expect(Object.keys(LAYER_OF_GROUP).sort()).toEqual([
      'Home',
      'Portfolio',
      'Research',
      'Review',
      'Risk',
      'Trade',
    ])
  })
})
