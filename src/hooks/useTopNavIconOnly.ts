import { useSyncExternalStore } from 'react'

/** Below this width TopNav group triggers show icons only (single-row layout). */
export const TOPNAV_ICON_ONLY_BREAKPOINT = 640

function iconOnlyQuery() {
  return window.matchMedia(`(max-width: ${TOPNAV_ICON_ONLY_BREAKPOINT - 1}px)`)
}

function subscribeIconOnly(onStoreChange: () => void) {
  const mq = iconOnlyQuery()
  mq.addEventListener('change', onStoreChange)
  return () => mq.removeEventListener('change', onStoreChange)
}

function getIconOnlySnapshot() {
  return iconOnlyQuery().matches
}

export function useTopNavIconOnly() {
  return useSyncExternalStore(subscribeIconOnly, getIconOnlySnapshot, () => false)
}
