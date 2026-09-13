import { describe, expect, it } from 'vitest'
import { parseQuery } from './omnibar'
import { PAGE_ROUTES, ROUTES } from '@/layout/routeRegistry'

describe('omnibar query prefixes', () => {
  it('reads a bare query as everything at once', () => {
    expect(parseQuery('nvda')).toEqual({ mode: 'all', term: 'nvda' })
    expect(parseQuery('  vol ')).toEqual({ mode: 'all', term: 'vol' })
    expect(parseQuery('')).toEqual({ mode: 'all', term: '' })
  })

  it('narrows to pages on / and to commands on > or the guillemet', () => {
    expect(parseQuery('/vol')).toEqual({ mode: 'pages', term: 'vol' })
    expect(parseQuery('/')).toEqual({ mode: 'pages', term: '' })
    expect(parseQuery('>side')).toEqual({ mode: 'commands', term: 'side' })
    expect(parseQuery('›pin')).toEqual({ mode: 'commands', term: 'pin' })
  })
})

describe('the page list the omnibar offers', () => {
  it('leaves out redirect-only paths — you cannot choose to go to one', () => {
    expect(PAGE_ROUTES.some((r) => r.redirect)).toBe(false)
    expect(PAGE_ROUTES.some((r) => r.path === '/research/iv-radar')).toBe(false)
    // `/research/vol-regime` is a redirect now — the Symbol merge made it a
    // tab — so the page the Omnibar should offer is the one you can land on.
    expect(PAGE_ROUTES.some((r) => r.path === '/research/vol-regime')).toBe(false)
    expect(PAGE_ROUTES.some((r) => r.path === '/research/symbol')).toBe(true)
  })

  it('is the registry minus the redirects and nothing else', () => {
    expect(PAGE_ROUTES.length + ROUTES.filter((r) => r.redirect).length).toBe(ROUTES.length)
  })
})
