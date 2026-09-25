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
  // §5a.9: the three captions sit directly under the layer row now — the
  // Pipeline fold they used to live in merged into it.
  const items = researchItems()

  it('names its three stations with captions, not rows', () => {
    expect(captionsOf(items).map((c) => c.label)).toEqual(['Discover', 'Analyze', 'Validate'])
  })

  it('folding one takes its pages and leaves the others', () => {
    const shown = visibleUnderCaptions(items, new Set(['cap:discover']))
    expect(shown.map((i) => i.label)).not.toContain('Stock ratings')
    expect(shown.map((i) => i.label)).toContain('Symbol')
    expect(shown.map((i) => i.label)).toContain('Discover')
  })

  it('holds the design\'s ten pages plus the Book signpost, and nothing that only expands', () => {
    const rows = items.filter((i) => i.kind !== 'caption')
    // The design's ten, all built: History and then Compare joined Analyze on
    // 2026-09-23, and Narrative came back as its fourth row at Rev .43. The
    // design's own rule is that a menu row navigates, which is why each
    // waited for its page.
    //
    // Plus one row naming the Book's own page so a reader can find the rail
    // (since 2026-09-22). See BOOK_SIGNPOST.
    expect(rows).toHaveLength(11)
    // The half of §5a.8 that still holds without exception: no row nests. The
    // equipment's pages are on the rail, and the signpost carries none of
    // them — a row with children here is the tree filling up again.
    expect(rows.some((r) => (r.children?.length ?? 0) > 0)).toBe(false)
    expect(rows.every((r) => r.to != null)).toBe(true)
  })
})
