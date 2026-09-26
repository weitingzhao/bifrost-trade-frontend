/**
 * Alerts cleared in the notification centre (design Rev .72 §10) — for this
 * tab's session (`bifrost.alerts.cleared`). A cleared item leaves the centre
 * and the count; the source's own page still has it, which is where work
 * lives. Applied where the stream is read, so the menu-bar count, the centre
 * and the banners all agree.
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'
import type { AlertGroup } from '@/hooks/useAlerts'

const KEY = 'bifrost.alerts.cleared'

function readCleared(): ReadonlySet<string> {
  try {
    return new Set(Object.keys(JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Record<string, 1>))
  } catch {
    return new Set()
  }
}

const store = createExternalStore<{ cleared: ReadonlySet<string> }>({ cleared: readCleared() })

/** The key an item is cleared by: its source and its own id. */
export function alertKey(groupId: AlertGroup['id'], itemId: string): string {
  return `${groupId}:${itemId}`
}

export function clearAlerts(keys: readonly string[]): void {
  if (keys.length === 0) return
  const next = new Set(store.getState().cleared)
  keys.forEach((k) => next.add(k))
  try {
    sessionStorage.setItem(KEY, JSON.stringify(Object.fromEntries([...next].map((k) => [k, 1]))))
  } catch {
    // Storage refused: cleared until the next load.
  }
  store.setState({ cleared: next })
}

export function useClearedAlerts(): ReadonlySet<string> {
  return store.useStore().cleared
}

/** The groups without what this session has cleared. */
export function withoutCleared(groups: readonly AlertGroup[], cleared: ReadonlySet<string>): AlertGroup[] {
  if (cleared.size === 0) return [...groups]
  return groups.map((g) => {
    const items = g.items.filter((i) => !cleared.has(alertKey(g.id, i.id)))
    return items.length === g.items.length ? g : { ...g, items }
  })
}
