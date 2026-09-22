/**
 * Dock semantics, and the two rulings that are easy to break by accident.
 *
 * The design spent three rounds arriving at "open IS persistent" — a pin
 * button was invented in the ninth round and retired in the tenth — so the
 * behaviour under test is not an implementation detail, it is the conclusion.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryStorage } from '@/test/memoryStorage'
import {
  closeSurface,
  isSurfaceOpen,
  loadGeometry,
  saveGeometry,
  setFloatMode,
  surfaceFor,
  toggleSurface,
} from './equipSurface'

const CONSOLE = '/research/loop/harness'
const WATCHLIST = '/research/watchlist'
const INBOX = '/research/loop/decisions'

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  closeSurface('float')
  closeSurface('drawer')
})

describe('surfaceFor', () => {
  it('reads the kind and the grade off the table, not off the caller', () => {
    expect(surfaceFor(CONSOLE)).toEqual({
      surface: { to: CONSOLE, label: 'Autopilot Console', group: 'autopilot', size: 'pad' },
      kind: 'float',
    })
    // The two list pages the design grades Phone.
    expect(surfaceFor(WATCHLIST)?.surface.size).toBe('phone')
    expect(surfaceFor(INBOX)?.surface.size).toBe('phone')
  })

  it('opens everything as a float today, because nothing is flagged a drawer', () => {
    // The design marks Loop Run as a drawer and this app has no such route; it
    // put Book starters back in a float for this package. The drawer surface
    // is built, and a `kind: 'drawer'` in the table is all it takes to use it
    // — this asserts the claim rather than leaving it in a comment.
    for (const to of [CONSOLE, WATCHLIST, INBOX]) {
      expect(surfaceFor(to)?.kind, to).toBe('float')
    }
  })

  it('knows nothing about a page that is not equipment', () => {
    expect(surfaceFor('/research/symbol')).toBeNull()
    expect(surfaceFor('/portfolio/positions')).toBeNull()
  })
})

describe('dock semantics', () => {
  it('opens on the first click and closes on the second — the retired pin, in one gesture', () => {
    toggleSurface(CONSOLE)
    expect(isSurfaceOpen(CONSOLE)).toBe(true)
    toggleSurface(CONSOLE)
    expect(isSurfaceOpen(CONSOLE)).toBe(false)
  })

  it('persists an open surface, so it rides across navigation', () => {
    toggleSurface(CONSOLE)
    // The design's own key, so the two sides stay legible to each other.
    expect(JSON.parse(localStorage.getItem('bifrost.float') ?? 'null')).toMatchObject({
      to: CONSOLE,
    })
    closeSurface('float')
    expect(localStorage.getItem('bifrost.float')).toBeNull()
  })

  it('keeps one float, because two near-full windows occlude each other', () => {
    toggleSurface(CONSOLE)
    toggleSurface(WATCHLIST)
    expect(isSurfaceOpen(WATCHLIST)).toBe(true)
    expect(isSurfaceOpen(CONSOLE)).toBe(false)
  })
})

describe('float geometry', () => {
  it('remembers position and size per route, not per session', () => {
    saveGeometry(CONSOLE, { l: 100, t: 40 })
    saveGeometry(CONSOLE, { w: 700, h: 500 })
    expect(loadGeometry(CONSOLE)).toEqual({ l: 100, t: 40, w: 700, h: 500 })
    // Another route's geometry is its own.
    expect(loadGeometry(WATCHLIST)).toBeNull()
  })

  it('clears the drag when a mode is chosen', () => {
    // Manual geometry beats the mode, so a mode button that left the drag in
    // place would appear to do nothing — the design says so, and this is the
    // line that keeps it true.
    toggleSurface(CONSOLE)
    saveGeometry(CONSOLE, { l: 100, t: 40, w: 700, h: 500 })
    setFloatMode('phone')
    expect(loadGeometry(CONSOLE)).toBeNull()
  })
})
