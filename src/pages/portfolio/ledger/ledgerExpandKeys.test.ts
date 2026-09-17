import { describe, expect, it } from 'vitest'
import { pruneExpandedKeys } from './ledgerExpandKeys'

describe('pruneExpandedKeys', () => {
  it('clears outer expand when grouping by opportunity', () => {
    expect(pruneExpandedKeys(new Set(['a', 'b']), ['a', 'b'], true).size).toBe(0)
  })

  it('keeps keys that still exist and drops missing ones', () => {
    const next = pruneExpandedKeys(new Set(['keep', 'gone']), ['keep', 'new'], false)
    expect([...next]).toEqual(['keep'])
  })

  it('does not auto-open new keys', () => {
    const next = pruneExpandedKeys(new Set(), ['a', 'b'], false)
    expect(next.size).toBe(0)
  })
})
