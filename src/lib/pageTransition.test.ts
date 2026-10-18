import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { targetPath } from './pageTransition'

const APP_CSS = readFileSync(join(__dirname, '..', 'index.css'), 'utf8')

describe('page transitions — only a new path fades (design Rev .71 §1)', () => {
  const here = 'http://localhost/portfolio/positions?scope=all'

  it('reads the path a navigation points at', () => {
    expect(targetPath('/risk/limits', here)).toBe('/risk/limits')
    expect(targetPath({ pathname: '/trade/desk', search: '?x=1' }, here)).toBe('/trade/desk')
    expect(targetPath('limits', 'http://localhost/risk/')).toBe('/risk/limits')
  })

  it('names no new path for a query-only or hash-only move', () => {
    expect(targetPath('?scope=host', here)).toBeNull()
    expect(targetPath('#legs', here)).toBeNull()
    expect(targetPath({ search: '?tab=chain' }, here)).toBeNull()
  })

  // A view-transition-name makes its element a backdrop root: glass inside it
  // blurs nothing. Held on all the time (2026-09-25 → 10-18), the page lane's
  // name left the Rules inspector, sticky toolbars and sidebar fields showing
  // the page through them sharp. The names belong to the transition only.
  it('names the lane and the chrome only while a transition runs', () => {
    const named = [
      ...APP_CSS.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(
        /([^{}]+)\{[^{}]*view-transition-name\s*:\s*(?!none)[\w-]+/g
      ),
    ].map((m) => m[1].trim())
    expect(named.length).toBeGreaterThanOrEqual(7)
    for (const selector of named) {
      for (const part of selector.split(','))
        expect(part.trim(), selector).toMatch(/^html:active-view-transition\s/)
    }
  })
})
