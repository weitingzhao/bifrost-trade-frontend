import { describe, expect, it } from 'vitest'
import { sectionTarget } from './useSectionAnchor'

describe('sectionTarget', () => {
  it('prefers the hash labHref builds, then the view a redirect carried', () => {
    expect(sectionTarget('#vrp', null)).toBe('vrp')
    expect(sectionTarget('', 'iv-rank')).toBe('iv-rank')
    expect(sectionTarget('#gex', 'opex')).toBe('gex')
    expect(sectionTarget('', null)).toBeNull()
    expect(sectionTarget('#', ' ')).toBeNull()
  })
})
