import { describe, it, expect } from 'vitest'
import { dataState } from './dataState'

describe('dataState', () => {
  it('gives "did not load" its own state instead of folding it into empty', () => {
    // The defect this exists for: 21 components branched on isEmpty alone, so a
    // failed request rendered copy like "No upcoming events" — a claim about
    // the market made from a request that never landed.
    expect(dataState({ isError: true, isEmpty: true })).toBe('failed')
    expect(dataState({ isError: true, isEmpty: true })).not.toBe('empty')
  })

  it('separates "not asked yet" from "asked, nothing there"', () => {
    expect(dataState({ isPending: true, isEmpty: true })).toBe('loading')
    expect(dataState({ isEmpty: true })).toBe('empty')
  })

  it('keeps showing content through an error — stale beats blank', () => {
    expect(dataState({ isError: true, isEmpty: false })).toBe('ready')
    expect(dataState({ isPending: true, isEmpty: false })).toBe('ready')
  })

  it('reports failure ahead of loading when a refetch is in flight', () => {
    expect(dataState({ isPending: true, isError: true, isEmpty: true })).toBe('failed')
  })

  it('treats the flags as optional', () => {
    expect(dataState({ isEmpty: false })).toBe('ready')
    expect(dataState({ isEmpty: true })).toBe('empty')
  })
})
