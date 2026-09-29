import { describe, expect, it } from 'vitest'
import { shellNavFilterIndex, shellNavFilterMatch } from '@bifrost/ui'
import { NAV_GROUPS, SYSTEM_NAV_GROUPS } from './navConfig'
import { navFilterExtra } from './navFilterExtra'

describe('Filter pages (design 2026-09-28)', () => {
  const index = shellNavFilterIndex(NAV_GROUPS, navFilterExtra(SYSTEM_NAV_GROUPS, 'System'))

  it('finds a page and says where it lives, a label that starts with the query first', () => {
    const hits = shellNavFilterMatch(index, 'pos')
    expect(hits[0]).toMatchObject({ label: 'Positions', to: '/portfolio/positions' })
    expect(hits[0].place).toMatch(/^Portfolio/)
  })

  it('finds equipment the tree has no row for, placed on the toolbar', () => {
    const hit = shellNavFilterMatch(index, 'the book').find((h) => h.to === '/research/book')
    expect(hit?.place).toMatch(/^Toolbar · /)
  })

  it('finds the other tree, and never lists one page twice', () => {
    expect(shellNavFilterMatch(index, 'settings').some((h) => h.place === 'System' || h.place.startsWith('System ›'))).toBe(true)
    const targets = index.map((e) => e.to ?? e.href ?? e.id)
    expect(new Set(targets).size).toBe(targets.length)
  })

  it('an empty query shows nothing — the tree is back', () => {
    expect(shellNavFilterMatch(index, '   ')).toEqual([])
  })
})
