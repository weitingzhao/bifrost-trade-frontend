/**
 * A caption names the rows after it, and folding it takes them away.
 *
 * Shell Spec §5a.7 (Owner 2026-09-21). The helper lives in `@bifrost/ui`
 * because the sidebar renders it, and it is tested here because this is where
 * a test runner exists — `bifrost-ui` has none, and adding one is a decision
 * about that repo rather than a side effect of this change.
 */
import { describe, expect, it } from 'vitest'
import { visibleUnderCaptions, captionsOf, type ShellNavItem } from '@bifrost/ui'
import { researchItems } from './researchNavCatalog'

const row = (id: string): ShellNavItem => ({ id, label: id, to: `/${id}` })
const cap = (id: string): ShellNavItem => ({ id: `cap:${id}`, label: id, kind: 'caption' })

const LIST: ShellNavItem[] = [
  cap('discover'),
  row('a'),
  row('b'),
  cap('analyze'),
  row('c'),
  cap('validate'),
  row('d'),
]

const ids = (items: readonly ShellNavItem[]) => items.map((i) => i.id)

describe('visibleUnderCaptions', () => {
  it('shows everything when nothing is folded', () => {
    expect(ids(visibleUnderCaptions(LIST, new Set()))).toEqual(ids(LIST))
  })

  it('hides the run after a folded caption, up to the next one', () => {
    expect(ids(visibleUnderCaptions(LIST, new Set(['cap:discover'])))).toEqual([
      'cap:discover',
      'cap:analyze',
      'c',
      'cap:validate',
      'd',
    ])
  })

  it('keeps the folded caption itself — it is the way back', () => {
    const out = visibleUnderCaptions(LIST, new Set(['cap:analyze']))
    expect(ids(out)).toContain('cap:analyze')
    expect(ids(out)).not.toContain('c')
  })

  it('folds the last run without running off the end', () => {
    expect(ids(visibleUnderCaptions(LIST, new Set(['cap:validate'])))).toEqual([
      'cap:discover',
      'a',
      'b',
      'cap:analyze',
      'c',
      'cap:validate',
    ])
  })

  it('never hides a row that comes before any caption', () => {
    // Those belong to no heading, so no heading can take them away.
    const list = [row('loose'), cap('x'), row('y')]
    expect(ids(visibleUnderCaptions(list, new Set(['cap:x'])))).toEqual(['loose', 'cap:x'])
  })

  it('leaves a list with no captions alone whatever is folded', () => {
    const list = [row('a'), row('b')]
    expect(ids(visibleUnderCaptions(list, new Set(['cap:anything'])))).toEqual(['a', 'b'])
  })
})

describe('the Research tree uses captions where §5a.7 says to', () => {
  const pipeline = researchItems({ objectives: [] }).find((i) => i.label === 'Pipeline')

  it('names its three stations with captions, not rows', () => {
    expect(captionsOf(pipeline?.children ?? []).map((c) => c.label)).toEqual([
      'Discover',
      'Analyze',
      'Validate',
    ])
  })

  it('folding one takes its pages and leaves the others', () => {
    const all = pipeline?.children ?? []
    const shown = visibleUnderCaptions(all, new Set(['cap:discover']))
    expect(shown.map((i) => i.label)).not.toContain('Stock ratings')
    expect(shown.map((i) => i.label)).toContain('Symbol')
    expect(shown.map((i) => i.label)).toContain('Discover')
  })
})
