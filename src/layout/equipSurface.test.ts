/**
 * One surface, three places — and the rulings that are easy to break by
 * accident.
 *
 * The design spent eighteen rounds arriving here, and three of its conclusions
 * are the kind that a refactor undoes without noticing: **open IS persistent**
 * (a pin button was invented in the ninth round and retired in the tenth), **a
 * surface is in exactly one place**, and **nothing is ever evicted from the
 * tab strip**. Those are the behaviours under test.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryStorage } from '@/test/memoryStorage'
import {
  activeTabOf,
  closeSurface,
  focusTab,
  isVisible,
  loadGeometry,
  openSurface,
  openSurfaceKeys,
  placeOf,
  runSurface,
  saveGeometry,
  setFloatSize,
  stripFor,
  surfaceForRoute,
  toggleSurface,
  type Surface,
} from './equipSurface'

const CONSOLE = '/research/loop/harness'
const WATCHLIST = '/research/watchlist'
const INBOX = '/research/loop/decisions'
const JOURNAL = '/research/journal'
const BOOK = '/research/book'

/** Non-null by construction — these are all rail routes. */
function surf(to: string): Surface {
  const s = surfaceForRoute(to)
  if (!s) throw new Error(`${to} is not equipment`)
  return s
}

/** The store outlives a test; the desk should not. */
function reset() {
  for (const key of openSurfaceKeys()) closeSurface(key)
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  reset()
})

describe('surfaceForRoute', () => {
  it('reads the surface off the table, not off the caller', () => {
    expect(surfaceForRoute(CONSOLE)).toEqual({
      key: CONSOLE,
      to: CONSOLE,
      label: 'Autopilot Console',
      group: 'autopilot',
      canPage: true,
      def: 'float',
    })
  })

  it('knows nothing about a page that is not equipment', () => {
    expect(surfaceForRoute('/research/symbol')).toBeNull()
    expect(surfaceForRoute('/portfolio/positions')).toBeNull()
  })
})

describe('a run is a surface, not a page', () => {
  it('has no full-page form, so ⤢ has nothing to offer', () => {
    const run = runSurface('r-0918-2')
    expect(run.canPage).toBe(false)
    // The design's own default: a reading opens beside the page, not over it.
    expect(run.def).toBe('panel')
    expect(run.run).toBe('r-0918-2')
  })

  it('shares one place memory across runs — where you put one is where the next goes', () => {
    openSurface(runSurface('r-1'), 'float')
    closeSurface('run:r-1')
    openSurface(runSurface('r-2'))
    expect(placeOf('run:r-2')).toBe('float')
  })
})

describe('dock semantics', () => {
  it('opens on the first click and closes on the second — the retired pin, in one gesture', () => {
    toggleSurface(surf(CONSOLE))
    expect(isVisible(CONSOLE)).toBe(true)
    toggleSurface(surf(CONSOLE))
    expect(isVisible(CONSOLE)).toBe(false)
  })

  it('persists what is open, so it rides across navigation', () => {
    openSurface(surf(CONSOLE), 'float')
    // The design's own keys, so the two sides stay legible to each other.
    expect(JSON.parse(localStorage.getItem('bifrost.float') ?? 'null')).toMatchObject({
      key: CONSOLE,
    })
    closeSurface(CONSOLE)
    expect(localStorage.getItem('bifrost.float')).toBeNull()
  })

  it('brings a covered tab forward rather than closing it', () => {
    openSurface(surf(WATCHLIST), 'panel')
    openSurface(surf(INBOX), 'panel')
    expect(isVisible(WATCHLIST)).toBe(false)
    // Open, but behind — the third of the click's three outcomes.
    toggleSurface(surf(WATCHLIST))
    expect(isVisible(WATCHLIST)).toBe(true)
    expect(placeOf(INBOX)).toBe('panel')
  })
})

describe('one surface, one place', () => {
  it('leaves the float when it is opened in the panel', () => {
    openSurface(surf(CONSOLE), 'float')
    openSurface(surf(CONSOLE), 'panel')
    expect(placeOf(CONSOLE)).toBe('panel')
    expect(localStorage.getItem('bifrost.float')).toBeNull()
  })

  it('keeps one float, because two near-full windows occlude each other', () => {
    openSurface(surf(CONSOLE), 'float')
    openSurface(surf(WATCHLIST), 'float')
    expect(placeOf(WATCHLIST)).toBe('float')
    expect(placeOf(CONSOLE)).toBeNull()
  })

  it('keeps as many panel tabs as you open, because the panel is not the float', () => {
    for (const to of [CONSOLE, WATCHLIST, INBOX]) openSurface(surf(to), 'panel')
    expect([CONSOLE, WATCHLIST, INBOX].map(placeOf)).toEqual(['panel', 'panel', 'panel'])
  })

  it('remembers where you last put it', () => {
    openSurface(surf(WATCHLIST), 'panel')
    closeSurface(WATCHLIST)
    openSurface(surf(WATCHLIST))
    expect(placeOf(WATCHLIST)).toBe('panel')
  })

  it('records the page as a place too, so the next open is where you left it', () => {
    openSurface(surf(BOOK), 'float')
    openSurface(surf(BOOK), 'page')
    expect(placeOf(BOOK)).toBeNull()
    expect(JSON.parse(localStorage.getItem('bifrost.where') ?? '{}')[BOOK]).toBe('page')
  })
})

describe('the tab strip', () => {
  function openAll(routes: string[]) {
    for (const to of routes) openSurface(surf(to), 'panel')
  }

  it('shows every tab in full while there are three or fewer', () => {
    const strip = stripFor({
      tabs: [CONSOLE, WATCHLIST, INBOX].map((to, i) => ({ ...surf(to), t: i })),
      active: INBOX,
    })
    expect(strip.compact).toBe(false)
    expect(strip.over).toEqual([])
    expect(strip.shown).toHaveLength(3)
  })

  it('keeps the active tab and the two most recent, and menus the rest', () => {
    const tabs = [
      { ...surf(CONSOLE), t: 10 },
      { ...surf(WATCHLIST), t: 40 },
      { ...surf(INBOX), t: 30 },
      { ...surf(JOURNAL), t: 20 },
    ]
    const strip = stripFor({ tabs, active: CONSOLE })
    expect(strip.compact).toBe(true)
    expect(strip.shown.map((x) => x.key)).toEqual([CONSOLE, WATCHLIST, INBOX])
    // Nothing is evicted: the fourth is a click away, not gone.
    expect(strip.over.map((x) => x.key)).toEqual([JOURNAL])
  })

  it('never drops a tab, however many are open', () => {
    openAll([CONSOLE, WATCHLIST, INBOX, JOURNAL, BOOK])
    const open = [CONSOLE, WATCHLIST, INBOX, JOURNAL, BOOK].filter((to) => placeOf(to) === 'panel')
    expect(open).toHaveLength(5)
  })

  it('closing the active tab falls back to another rather than closing the panel', () => {
    openAll([CONSOLE, WATCHLIST])
    closeSurface(WATCHLIST)
    expect(placeOf(CONSOLE)).toBe('panel')
    expect(isVisible(CONSOLE)).toBe(true)
  })

  it('closing the last tab closes the panel', () => {
    openSurface(surf(CONSOLE), 'panel')
    closeSurface(CONSOLE)
    expect(localStorage.getItem('bifrost.panel')).toBeNull()
  })

  it('focusing a tab makes it the most recent, which is what the overflow orders by', () => {
    // Fake time on purpose: four real opens land in the same millisecond, the
    // sort is stable, and the test would then be asserting insertion order
    // while claiming to assert recency.
    vi.useFakeTimers()
    try {
      for (const to of [CONSOLE, WATCHLIST, INBOX, JOURNAL]) {
        vi.advanceTimersByTime(10)
        openSurface(surf(to), 'panel')
      }
      vi.advanceTimersByTime(10)
      focusTab(CONSOLE)
      const panel = JSON.parse(localStorage.getItem('bifrost.panel') ?? 'null')
      expect(activeTabOf(panel)?.key).toBe(CONSOLE)
      // Journal and the Inbox were the last two looked at; the Watchlist, the
      // oldest look, is the one that moves into the menu.
      expect(stripFor(panel).over.map((x) => x.key)).toEqual([WATCHLIST])
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('float geometry', () => {
  it('remembers position and size per surface, at the size it was set', () => {
    saveGeometry(CONSOLE, { l: 100, t: 40, size: 'pad' })
    saveGeometry(CONSOLE, { w: 700, h: 500 })
    expect(loadGeometry(CONSOLE)).toEqual({ l: 100, t: 40, w: 700, h: 500, size: 'pad' })
    expect(loadGeometry(WATCHLIST)).toBeNull()
  })

  it('clears the drag when a size is chosen', () => {
    // Manual geometry beats the size, so a size button that left the drag in
    // place would appear to do nothing — the design says so, and this is the
    // line that keeps it true.
    openSurface(surf(CONSOLE), 'float')
    saveGeometry(CONSOLE, { l: 100, t: 40, w: 700, h: 500, size: 'phone' })
    setFloatSize('pad')
    expect(loadGeometry(CONSOLE)).toBeNull()
  })
})
