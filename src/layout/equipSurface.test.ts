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
  migrateInstanceSurface,
  openSurface,
  openSurfaceKeys,
  placeOf,
  runSurface,
  saveGeometry,
  setFloatSize,
  stripFor,
  surfaceForRoute,
  surfaceLabel,
  symbolSurface,
  toggleSurface,
  type Surface,
  tradeSurface,
  tradePath,
  setSurfaceTrade,
  surfaceState,
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
      label: 'Pilot Console',
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

describe('the Symbol page as a surface (Rev .58)', () => {
  it('has one following tab, and a locked tab per name', () => {
    expect(symbolSurface('NVDA').key).toBe('symbol')
    expect(symbolSurface('nvda', { lock: true }).key).toBe('symbol:NVDA')
    // Locking nothing is following.
    expect(symbolSurface('', { lock: true }).key).toBe('symbol')
    openSurface(symbolSurface())
    openSurface(symbolSurface('AMD', { lock: true }), 'panel')
    openSurface(symbolSurface('AMD', { lock: true }), 'panel')
    expect(openSurfaceKeys()).toEqual(['symbol', 'symbol:AMD'])
  })

  it('opens in the panel, and names what it shows', () => {
    openSurface(symbolSurface())
    expect(placeOf('symbol')).toBe('panel')
    expect(surfaceLabel(symbolSurface(), 'PLTR')).toBe('Symbol · PLTR')
    expect(surfaceLabel(symbolSurface('AMD', { lock: true }), 'PLTR')).toBe('Symbol · AMD (locked)')
  })

  it('shares one place memory across locked tabs', () => {
    openSurface(symbolSurface('AMD', { lock: true }), 'float')
    closeSurface('symbol:AMD')
    openSurface(symbolSurface('TSLA', { lock: true }))
    expect(placeOf('symbol:TSLA')).toBe('float')
  })
})

describe('a trade as a surface (Rev .103 · .111)', () => {
  it('has one following tab and a fresh tab per number', () => {
    expect(tradeSurface(159).key).toBe('trade')
    expect(tradeSurface(159, { fresh: true }).key).toBe('trade:159')
    openSurface(tradeSurface(159))
    openSurface(tradeSurface(160))
    openSurface(tradeSurface(12, { fresh: true }), 'panel')
    openSurface(tradeSurface(12, { fresh: true }), 'panel')
    expect(openSurfaceKeys()).toEqual(['trade', 'trade:12'])
    expect(surfaceState().panel?.tabs.find((t) => t.key === 'trade')?.trade).toBe(160)
  })

  it('keeps the list it came from only when the number is in it', () => {
    expect(tradeSurface(5, { list: [4, 5, 5, 6] }).tradeList).toEqual([4, 5, 6])
    expect(tradeSurface(9, { list: [4, 5] }).tradeList).toEqual([9])
  })

  it('steps in place, keeping its key and its tab', () => {
    openSurface(tradeSurface(4, { list: [4, 5, 6], from: 'Ledger' }))
    setSurfaceTrade('trade', 6)
    const tab = surfaceState().panel?.tabs.find((t) => t.key === 'trade')
    expect([tab?.trade, tab?.to, tab?.tradeFrom]).toEqual([6, '/trade/6', 'Ledger'])
    expect(surfaceLabel(tab!, '')).toBe('Trade · #6')
  })

  it('shares one place memory between the following tab and fresh ones', () => {
    openSurface(tradeSurface(1), 'float')
    closeSurface('trade')
    openSurface(tradeSurface(2, { fresh: true }))
    expect(placeOf('trade:2')).toBe('float')
  })

  it('keeps a place remembered under the old key', () => {
    localStorage.setItem('bifrost.where', JSON.stringify({ instance: 'float' }))
    openSurface(tradeSurface(3, { fresh: true }))
    expect(placeOf('trade:3')).toBe('float')
  })

  it('reads a tab saved under the Instance names (before Rev .111) as a trade', () => {
    const old = { key: 'instance:7', to: '/instance/7', label: '#7', instance: 7, instanceList: [6, 7], instanceFrom: 'Ledger' }
    expect(migrateInstanceSurface(old as unknown as Surface)).toMatchObject({
      key: 'trade:7',
      to: '/trade/7',
      trade: 7,
      tradeList: [6, 7],
      tradeFrom: 'Ledger',
    })
    const sym = { key: 'symbol', to: '/research/symbol', label: 'Symbol' } as Surface
    expect(migrateInstanceSurface(sym)).toBe(sym)
  })

  it('addresses its page with the rows it came from', () => {
    expect(tradePath(5, [4, 5, 6], 'Ledger · trades')).toBe('/trade/5?list=4%2C5%2C6&from=Ledger+%C2%B7+trades')
    expect(tradePath(5)).toBe('/trade/5')
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

  it('shows every tab while there are nine or fewer (icon tabs, Rev .97)', () => {
    const strip = stripFor({
      tabs: [CONSOLE, WATCHLIST, INBOX, JOURNAL].map((to, i) => ({ ...surf(to), t: i })),
      active: INBOX,
    })
    expect(strip.compact).toBe(false)
    expect(strip.over).toEqual([])
    expect(strip.shown).toHaveLength(4)
  })

  it('past nine, keeps the active tab and the two most recent, and menus the rest', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ ...surf(CONSOLE), key: `x${i}`, to: `/x${i}`, t: 50 + i }))
    const tabs = [
      { ...surf(CONSOLE), t: 10 },
      { ...surf(WATCHLIST), t: 40 },
      { ...surf(INBOX), t: 30 },
      { ...surf(JOURNAL), t: 20 },
      ...many,
    ]
    const strip = stripFor({ tabs, active: CONSOLE })
    expect(strip.compact).toBe(true)
    expect(strip.shown.map((x) => x.key)).toEqual([CONSOLE, 'x4', 'x5'])
    // Nothing is evicted: the rest are a click away, not gone.
    expect(strip.over).toHaveLength(7)
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
      // Four icon tabs all fit now (the fold starts past nine, Rev .97), but
      // recency still picks who stays out of it: stuff the strip past nine
      // with old tabs, and the two most recent looks — Journal and the Inbox
      // — hold their place beside the active Console while the Watchlist,
      // the oldest look, folds.
      const stuffed = {
        ...panel,
        tabs: [
          ...panel.tabs,
          ...Array.from({ length: 6 }, (_, i) => ({ ...panel.tabs[0], key: `x${i}`, to: `/x${i}`, t: 1 + i })),
        ],
      }
      const strip = stripFor(stuffed)
      expect(strip.shown.map((x) => x.key)).toEqual([CONSOLE, INBOX, JOURNAL])
      expect(strip.over.map((x) => x.key)).toContain(WATCHLIST)
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
