import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PIN_MAX, SHELF_GROUP, isPinned, isStalePin, readPins, togglePin } from './pins'

/**
 * A real Storage, because the ambient one is not.
 *
 * Node 25 defines a `localStorage` global that is inert without
 * `--localstorage-file` — it is an object with no methods, and it shadows
 * jsdom's. Code under test reaches for the global and gets that, so anything
 * storage-backed silently does nothing in a test run. Stubbing it is the only
 * way these assertions are about the shelf rather than about the environment.
 */
function memoryStorage(): Storage {
  let map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => {
      map = new Map()
    },
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
})

const pin = (n: number) => ({ to: `/research/loop/objectives/obj-${n}`, label: `Objective ${n}` })

describe('togglePin', () => {
  it('pins and unpins the same route', () => {
    expect(togglePin(pin(1)).pinned).toBe(true)
    expect(isPinned(pin(1).to)).toBe(true)
    expect(togglePin(pin(1)).pinned).toBe(false)
    expect(readPins()).toEqual([])
  })

  it('refuses a seventh rather than dropping the oldest', () => {
    for (let i = 1; i <= PIN_MAX; i += 1) expect(togglePin(pin(i)).pinned).toBe(true)
    const seventh = togglePin(pin(PIN_MAX + 1))
    expect(seventh).toMatchObject({ pinned: false, full: true })
    // The reader put every one of those there. Quietly evicting one is a
    // shortcut list that rearranges itself behind your back.
    expect(readPins()).toHaveLength(PIN_MAX)
    expect(isPinned(pin(1).to)).toBe(true)
    expect(isPinned(pin(PIN_MAX + 1).to)).toBe(false)
  })

  it('keeps the order they were pinned in', () => {
    togglePin(pin(1))
    togglePin(pin(2))
    expect(readPins().map((p) => p.to)).toEqual([pin(1).to, pin(2).to])
  })

  it('survives a corrupt store rather than throwing', () => {
    localStorage.setItem('bifrost.pins', '{not json')
    expect(readPins()).toEqual([])
    localStorage.setItem('bifrost.pins', '[{"nope":1},{"to":"/home","label":"Today"}]')
    expect(readPins()).toEqual([{ to: '/home', label: 'Today' }])
  })
})

describe('isStalePin', () => {
  it('marks a pin the app has no page for', () => {
    // A pin to something gone announces itself rather than disappearing —
    // that is the difference from the retired Objectives fold, where a dead
    // row claimed the tree still had that shape.
    expect(isStalePin({ to: '/research/gone-away', label: 'Gone' })).toBe(true)
  })

  it('accepts a parameterised route by its stem', () => {
    // `/research/loop/objectives/:objectiveId` is a real page; the pin holds
    // one instance of it, which the route table cannot match literally.
    expect(isStalePin({ to: '/research/loop/objectives/obj-daily-stock', label: 'Daily' })).toBe(false)
    expect(isStalePin({ to: '/home', label: 'Today' })).toBe(false)
  })
})

describe('the shelf opens itself', () => {
  it('adds its group to the sidebar’s open set on the first pin', () => {
    // The sidebar seeds its open-group set once and persists it, so a group
    // that appears later stays shut for ever. A shortcut you have to expand
    // is not a shortcut.
    localStorage.setItem('bifrost-sidebar-open-groups', '["Research"]')
    togglePin(pin(1))
    expect(JSON.parse(localStorage.getItem('bifrost-sidebar-open-groups') as string)).toEqual([
      'Research',
      SHELF_GROUP,
    ])
  })

  it('does not add it twice, and leaves it alone when the shelf empties', () => {
    togglePin(pin(1))
    togglePin(pin(2))
    togglePin(pin(2))
    const open = JSON.parse(localStorage.getItem('bifrost-sidebar-open-groups') as string) as string[]
    expect(open.filter((g) => g === SHELF_GROUP)).toHaveLength(1)
  })
})
