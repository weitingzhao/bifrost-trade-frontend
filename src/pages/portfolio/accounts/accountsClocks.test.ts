import { describe, expect, it } from 'vitest'
import { flexClockReading, ibClockReading } from './accountsClocks'

const NOW = 1789608275

describe('the IB clock', () => {
  it('reads a live snapshot as a fetch time, not an as-of date', () => {
    const c = ibClockReading({
      daemonAlive: true,
      ibConnected: true,
      fetchedAt: NOW - 61,
      twsRecDays: 123.8,
      nowSec: NOW,
    })
    expect(c.name).toBe('IB Client')
    expect(c.pull).toMatch(/^FETCHED \d\d:\d\d:\d\d ET$/)
    expect(c.pullTone).toBe('ok')
    expect(c.title).toContain('a fetch time, not an as-of date')
  })

  it('calls a connected-but-frozen snapshot stale, in amber', () => {
    const c = ibClockReading({
      daemonAlive: true,
      ibConnected: true,
      fetchedAt: NOW - 5 * 3600,
      twsRecDays: 123.8,
      nowSec: NOW,
    })
    expect(c.pull).toBe('STALE 300m')
    expect(c.pullTone).toBe('warn')
  })

  // The judgment ruling F5 turns on: a five-second poll interval and a snapshot
  // hours old is nobody logged in, not a slow rhythm. Grey says "no reading";
  // red would claim something is broken.
  it('calls an unopened TWS session disconnected, in grey — never red', () => {
    const c = ibClockReading({
      daemonAlive: true,
      ibConnected: false,
      fetchedAt: NOW - 5 * 3600,
      twsRecDays: 123.8,
      nowSec: NOW,
    })
    expect(c.pull).toBe('DISCONNECTED')
    expect(c.pullTone).toBe('muted')
    expect(c.name).toBe('IB Client')
  })

  // K3 and F5 are two different conditions, and the data tells them apart:
  // `daemon_alive` is the daemon, `ib_connected` is the TWS session behind it.
  it('keeps red for the daemon itself being down, and renames the row', () => {
    const c = ibClockReading({
      daemonAlive: false,
      ibConnected: false,
      fetchedAt: NOW - 5 * 3600,
      twsRecDays: 123.8,
      nowSec: NOW,
    })
    expect(c.name).toBe('IB Client offline')
    expect(c.pullTone).toBe('fault')
  })

  it('warns on a TWS record past two weeks without calling it a fault', () => {
    const warm = ibClockReading({
      daemonAlive: true,
      ibConnected: true,
      fetchedAt: NOW,
      twsRecDays: 3,
      nowSec: NOW,
    })
    expect(warm.recTone).toBe('ok')

    const dry = ibClockReading({
      daemonAlive: true,
      ibConnected: true,
      fetchedAt: NOW,
      twsRecDays: 123.8,
      nowSec: NOW,
    })
    expect(dry.rec).toBe('Rec 124d')
    expect(dry.recTone).toBe('warn')
    expect(dry.title).toContain('Flex carries the trades')
  })
})

describe('the Flex clock', () => {
  it('warns once the daily ingest is more than 36 hours old', () => {
    const fresh = flexClockReading({ pullTs: NOW - 4 * 3600, recDays: 1.57, nowSec: NOW })
    expect(fresh.pullTone).toBe('ok')
    expect(fresh.rec).toBe('Rec 1.6d')

    const missed = flexClockReading({ pullTs: NOW - 40 * 3600, recDays: 20.5, nowSec: NOW })
    expect(missed.pullTone).toBe('warn')
    expect(missed.title).toContain('a daily run has been missed')
  })

  it('reads a Pull with no timestamp as no reading, not as zero', () => {
    const c = flexClockReading({ pullTs: null, recDays: null, nowSec: NOW })
    expect(c.pull).toBe('Pull —')
    expect(c.pullTone).toBe('muted')
    expect(c.rec).toBe('Rec —')
  })
})
