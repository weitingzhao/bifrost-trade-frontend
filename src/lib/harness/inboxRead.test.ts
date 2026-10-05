import { describe, expect, it } from 'vitest'
import { parseReadIds, pruneReadIds, unreadCount } from './inboxRead'

describe('inbox read state', () => {
  it('reads the stored set and survives anything else in the slot', () => {
    expect([...parseReadIds('["drf_1","drf_2"]')]).toEqual(['drf_1', 'drf_2'])
    expect([...parseReadIds('["drf_1", 7, null]')]).toEqual(['drf_1'])
    expect(parseReadIds('not json').size).toBe(0)
    expect(parseReadIds('{"drf_1": true}').size).toBe(0)
    expect(parseReadIds(null).size).toBe(0)
  })

  it('keeps only drafts still pending', () => {
    const read = new Set(['drf_1', 'drf_gone', 'drf_3'])
    expect([...pruneReadIds(read, ['drf_1', 'drf_2', 'drf_3'])]).toEqual(['drf_1', 'drf_3'])
  })

  it('counts what has not been read', () => {
    expect(unreadCount(['drf_1', 'drf_2', 'drf_3'], new Set(['drf_2']))).toBe(2)
    expect(unreadCount([], new Set(['drf_2']))).toBe(0)
  })
})
