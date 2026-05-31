import { useSyncExternalStore } from 'react'
import { INSTANCE_DETAIL_NARROW_MAX_PX } from '@/constants/instanceDetailSidebar'

function subscribe(onStoreChange: () => void, maxWidthPx: number): () => void {
  const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`)
  mq.addEventListener('change', onStoreChange)
  return () => mq.removeEventListener('change', onStoreChange)
}

function getSnapshot(maxWidthPx: number): boolean {
  return window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches
}

function getServerSnapshot(): boolean {
  return false
}

/** True when viewport width is at or below the instance detail narrow breakpoint (960px). */
export function useIsNarrowViewport(maxWidthPx = INSTANCE_DETAIL_NARROW_MAX_PX): boolean {
  return useSyncExternalStore(
    (onStoreChange) => subscribe(onStoreChange, maxWidthPx),
    () => getSnapshot(maxWidthPx),
    getServerSnapshot,
  )
}

function subscribeWindow(onStoreChange: () => void): () => void {
  window.addEventListener('resize', onStoreChange)
  return () => window.removeEventListener('resize', onStoreChange)
}

export function useWindowWidth(): number {
  return useSyncExternalStore(
    subscribeWindow,
    () => window.innerWidth,
    () => 1280,
  )
}
