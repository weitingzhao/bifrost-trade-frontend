import { useCallback, useEffect, useState } from 'react'
import { MOBILE_BREAKPOINT } from '@/hooks/use-mobile'
import { STORAGE_KEYS } from '@/constants/storage'

export type NavMode = 'sidebar' | 'topnav'

const KEY = STORAGE_KEYS.navMode

/** Below this width the sidebar is forced off regardless of preference (same as sidebar mobile). */
const FORCE_TOPNAV_WIDTH = MOBILE_BREAKPOINT

function readStored(): NavMode {
  return localStorage.getItem(KEY) === 'topnav' ? 'topnav' : 'sidebar'
}

export function useNavMode() {
  const [stored, setStored] = useState<NavMode>(readStored)
  const [isTooNarrow, setIsTooNarrow] = useState(
    () => window.innerWidth < FORCE_TOPNAV_WIDTH,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${FORCE_TOPNAV_WIDTH - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setIsTooNarrow(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const setMode = useCallback((m: NavMode) => {
    localStorage.setItem(KEY, m)
    setStored(m)
  }, [])

  const toggle = useCallback(() => {
    setMode(stored === 'sidebar' ? 'topnav' : 'sidebar')
  }, [stored, setMode])

  /** The mode actually in use: narrow screens are always topnav. */
  const effectiveMode: NavMode = isTooNarrow ? 'topnav' : stored

  return { stored, effectiveMode, isTooNarrow, setMode, toggle }
}
