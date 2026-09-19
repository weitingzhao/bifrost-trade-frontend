/**
 * The sidebar's group order — the design's two orderings of the same six
 * groups (`shell-registry.js` ORDERS, Shell Spec §13).
 *
 * `loop` is the resting state: Home, then the lifecycle — research → size →
 * trade → book → review — because the spine IS the dependency chain. `reach`
 * optimises for the daily operator: what is touched most sits closest. A nav
 * that reorders under you fights muscle memory, so switching is an explicit
 * ⌘K command and never happens on its own.
 */
import { useSyncExternalStore } from 'react'
import { STORAGE_KEYS } from '@/constants/storage'

export type NavOrder = 'loop' | 'reach'

export const NAV_ORDERS: Record<NavOrder, readonly string[]> = {
  loop: ['Research', 'Risk', 'Trade', 'Portfolio', 'Review'],
  reach: ['Trade', 'Portfolio', 'Research', 'Risk', 'Review'],
}

/**
 * A group's position in the lifecycle — fixed, whatever the order on screen.
 * In `reach` the numerals read out of sequence on purpose: that is how a row
 * still says where it sits in the loop.
 */
export const LIFECYCLE: Record<string, number> = {
  Research: 1,
  Risk: 2,
  Trade: 3,
  Portfolio: 4,
  Review: 5,
}

export const ORDER_LABEL: Record<NavOrder, string> = { loop: 'Loop', reach: 'Reach' }

export const ORDER_WHY: Record<NavOrder, string> = {
  loop: 'Ordered by the lifecycle: research → size → trade → book → review. The spine is the dependency.',
  reach:
    'Ordered by how often you come here. The numbers are out of sequence on purpose — that is the lifecycle position.',
}

function read(): NavOrder {
  try {
    return localStorage.getItem(STORAGE_KEYS.navOrder) === 'reach' ? 'reach' : 'loop'
  } catch {
    return 'loop'
  }
}

const listeners = new Set<() => void>()
let current: NavOrder = read()

export function navOrder(): NavOrder {
  return current
}

export function setNavOrder(next: NavOrder): void {
  current = next
  try {
    localStorage.setItem(STORAGE_KEYS.navOrder, next)
  } catch {
    // Private windows still get the in-memory order.
  }
  for (const l of listeners) l()
}

export function useNavOrder(): NavOrder {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
    () => current,
  )
}

/** The six business groups in the chosen order; anything unnamed keeps its place at the end. */
export function orderGroups<T extends { label: string }>(groups: readonly T[], order: NavOrder): T[] {
  const byLabel = new Map(groups.map((g) => [g.label, g]))
  const chain = NAV_ORDERS[order]
  const home = groups.filter((g) => g.label === 'Home')
  const rest = groups.filter((g) => g.label !== 'Home' && !chain.includes(g.label))
  return [...home, ...chain.map((l) => byLabel.get(l)).filter((g): g is T => g != null), ...rest]
}
