import { describe, expect, it } from 'vitest'
import { targetPath } from './pageTransition'

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
})
