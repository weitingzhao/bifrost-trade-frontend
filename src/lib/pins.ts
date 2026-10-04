/**
 * The pin shelf — your shortcuts, kept apart from the structure.
 *
 * The honest form of "I go straight to the same objective every day". The
 * design reached this after retiring the Autopilot › Objectives fold, and the
 * distinction between the two is the whole reason the shelf is allowed to
 * exist: **a fold claims the tree has that shape**, so archiving an objective
 * leaves a dead row behind. **A pin admits you put it there** — so it can be
 * unpinned, and a pin to something that is gone announces itself as stale
 * rather than pretending to be a place.
 *
 * Three rules follow from that, and they are not decoration:
 *   - the shelf sits **below** the five layers, never above. Frequency argues
 *     for the top; honesty argues for the bottom, because above them it reads
 *     as a sixth layer, which is exactly the claim a pin must not make.
 *   - it carries a **pin glyph, not a lifecycle numeral** — it is not a step.
 *   - it holds **six**. A shortcut list you have to scan is not a shortcut.
 */
import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEYS } from '@/constants/storage'
import { PAGE_ROUTES, REDIRECT_ROUTES, routeFor } from '@/layout/routeRegistry'

const STORAGE_KEY = 'bifrost.pins'
const EVENT = 'bifrost:pins'
/** The group label the sidebar renders the shelf under. */
export const SHELF_GROUP = 'Pinned'

/** The shelf holds six. Past that, pinning asks you to drop one first. */
export const PIN_MAX = 6

export interface Pin {
  to: string
  label: string
}

export interface PinResult {
  pinned: boolean
  /** True when the shelf was full and nothing was added. */
  full?: boolean
  /** What happened, in the words the control shows. */
  why: string
}

export function readPins(): Pin[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as unknown
    if (!Array.isArray(raw)) return []
    return raw
      .filter((p): p is Pin => typeof p === 'object' && p != null && typeof (p as Pin).to === 'string')
      .map((p) => forwardPin({ to: p.to, label: p.label || p.to }))
  } catch {
    return []
  }
}

/**
 * A pin saved before a page moved follows it. Renames and merges leave the old
 * address as a redirect (`/review/playbook-stats` → Playbook · Record,
 * `/portfolio/outcome` → Record · By source), and a pin to one read stale under
 * its old name while the click still worked. So the pin is rewritten to where
 * the redirect lands and, for a page, takes that page's name; a pin whose
 * redirect carries an id keeps its own label. A redirect whose target cannot
 * carry the id is left alone — the router forwards it
 * (`/strategy/instances/:instanceId`). An address with no redirect left (naming
 * R4 dropped `/instance/:id` and `/review/fit`) is not rewritten: the pin
 * stays where it was saved and reads as stale.
 */
export function forwardPin(pin: Pin): Pin {
  let cur = pin
  for (let hop = 0; hop < 3; hop += 1) {
    const cut = cur.to.search(/[?#]/)
    const path = cut < 0 ? cur.to : cur.to.slice(0, cut)
    const rest = cut < 0 ? '' : cur.to.slice(cut)
    const entry = REDIRECT_ROUTES.find((r) => routeMatches(r.path, path))
    if (!entry) return cur
    const names = entry.path.split('/')
    const segs = path.split('/')
    const params: Record<string, string> = {}
    names.forEach((n, i) => {
      if (n.startsWith(':')) params[n.slice(1)] = segs[i]
    })
    const carriesId = Object.keys(params).length > 0
    if (carriesId && !Object.keys(params).every((k) => entry.redirect.includes(`:${k}`))) return cur
    let to = entry.redirect
    for (const [k, v] of Object.entries(params)) to = to.replace(`:${k}`, v)
    if (rest && !/[?#]/.test(to)) to += rest
    const target = routeFor(to.split(/[?#]/)[0])
    cur = { to, label: carriesId ? cur.label : (target?.label ?? cur.label) }
  }
  return cur
}

/**
 * Open the shelf when the first pin arrives.
 *
 * The sidebar seeds its open-group set once and then persists it, so a group
 * that appears *later* — this one does — stays shut on every later load. The
 * shelf is useless closed: a shortcut you have to expand is not a shortcut.
 */
function openShelf() {
  try {
    const key = STORAGE_KEYS.sidebarOpenGroups
    const current = JSON.parse(localStorage.getItem(key) || '[]') as unknown
    if (!Array.isArray(current)) return
    if (!current.includes(SHELF_GROUP)) {
      localStorage.setItem(key, JSON.stringify([...current, SHELF_GROUP]))
    }
  } catch {
    // no store — the group renders open for this session anyway
  }
}

function save(list: readonly Pin[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, PIN_MAX)))
  } catch {
    // private mode / quota — the shelf still reflects this session
  }
  if (list.length > 0) openShelf()
  try {
    window.dispatchEvent(new CustomEvent(EVENT))
  } catch {
    // no window (tests)
  }
}

export function isPinned(to: string): boolean {
  return readPins().some((p) => p.to === to)
}

/**
 * Pin or unpin a route.
 *
 * A full shelf refuses rather than silently dropping the oldest: the reader
 * put every one of those there, and quietly evicting one is a shortcut list
 * that rearranges itself behind your back.
 */
export function togglePin(entry: Pin): PinResult {
  if (!entry.to) return { pinned: false, why: 'no route' }
  const list = readPins()
  if (list.some((p) => p.to === entry.to)) {
    save(list.filter((p) => p.to !== entry.to))
    return { pinned: false, why: 'Unpinned — it leaves the shelf. The page and its history are untouched.' }
  }
  if (list.length >= PIN_MAX) {
    return {
      pinned: false,
      full: true,
      why: `The shelf holds ${PIN_MAX}. Unpin one first — a shortcut list you have to scan is not a shortcut.`,
    }
  }
  save([...list, { to: entry.to, label: entry.label || entry.to }])
  return { pinned: true, why: 'Pinned to the sidebar shelf — below the five layers, under Pinned.' }
}

/**
 * A pin whose route the app no longer has.
 *
 * It keeps its row and says `stale` rather than disappearing: a shortcut that
 * evaporates leaves the reader wondering whether they imagined it.
 */
export function isStalePin(pin: Pin): boolean {
  return !PAGE_ROUTES.some((r) => routeMatches(r.path, pin.to))
}

/**
 * Does a route pattern cover this path?
 *
 * The shelf holds instances — one objective, not the objective page — and the
 * route table holds patterns (`/research/loop/objectives/:objectiveId`). A
 * literal comparison marks every pinned instance stale, which is the opposite
 * of what the mark is for.
 */
function routeMatches(pattern: string, path: string): boolean {
  const a = pattern.split('/')
  const b = path.split('/')
  if (a.length !== b.length) return false
  return a.every((seg, i) => seg.startsWith(':') || seg === b[i])
}

/** The shelf, kept in step across every component that reads it. */
export function usePins(): {
  pins: Pin[]
  toggle: (entry: Pin) => PinResult
  has: (to: string) => boolean
} {
  const [pins, setPins] = useState<Pin[]>(readPins)

  useEffect(() => {
    const sync = () => setPins(readPins())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggle = useCallback((entry: Pin) => {
    const result = togglePin(entry)
    setPins(readPins())
    return result
  }, [])

  return { pins, toggle, has: (to: string) => pins.some((p) => p.to === to) }
}
