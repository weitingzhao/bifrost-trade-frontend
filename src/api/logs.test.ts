import { describe, it, expect } from 'vitest'
import { LIVE_LOG_SOURCES, LOG_SOURCES, LOG_SOURCE_GROUPS, LOG_SOURCE_TAGS } from './logs'

// Every log endpoint reads a Redis Stream under `bifrost:console:*`. Scanning
// all five cluster Redis instances on 2026-09-08 found exactly one such key,
// `bifrost:console:account_sync_daemon`. These tests keep the catalog honest
// about that: a source is either live or it says why it is not.

describe('LOG_SOURCES catalog', () => {
  it('gives every source a group that exists', () => {
    const groups = new Set(LOG_SOURCE_GROUPS.map(g => g.key))
    for (const s of LOG_SOURCES) {
      expect(groups.has(s.group)).toBe(true)
    }
  })

  it('has unique keys', () => {
    const keys = LOG_SOURCES.map(s => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('gives every offline source a non-empty reason', () => {
    for (const s of LOG_SOURCES.filter(s => s.offlineReason !== null)) {
      expect(s.offlineReason!.length).toBeGreaterThan(20)
    }
  })

  it('derives LIVE_LOG_SOURCES from offlineReason', () => {
    expect(LIVE_LOG_SOURCES).toEqual(LOG_SOURCES.filter(s => s.offlineReason === null))
  })

  it('lists account_sync as the one source with a producer', () => {
    expect(LIVE_LOG_SOURCES.map(s => s.key)).toEqual(['account_sync'])
  })

  it('gives every source a badge color', () => {
    for (const s of LOG_SOURCES) {
      expect(LOG_SOURCE_TAGS[s.key]).toBeTruthy()
    }
  })
})
