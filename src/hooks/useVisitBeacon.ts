/**
 * The visits beacon (K6, Spec §20.4): one `journal.visit` row per page dwell,
 * so the nightly distill can see where attention actually goes. Fires after a
 * short dwell (a page passed through is not a visit), at most once per
 * route+symbol per session window, and never surfaces an error — a beacon
 * that breaks a page would be worse than no beacon.
 *
 * Raw rows roll 90 days on the server; rows cited as memory evidence stay.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { postVisit } from '@/api/research/journal'
import { useCarriedSymbol } from '@/lib/symbolContext'

const DWELL_MS = 5_000
const REPEAT_MS = 10 * 60_000

// Module-level: survives route changes, resets on reload — good enough for a
// "don't spam the same page" guard without touching storage.
const lastSent = new Map<string, number>()

export function useVisitBeacon(): void {
  const { pathname } = useLocation()
  const symbol = (useCarriedSymbol() ?? '').trim().toUpperCase()

  useEffect(() => {
    const key = `${pathname}|${symbol}`
    const at = lastSent.get(key)
    if (at != null && Date.now() - at < REPEAT_MS) return
    const timer = window.setTimeout(() => {
      lastSent.set(key, Date.now())
      postVisit(pathname, symbol).catch(() => {
        /* fire-and-forget */
      })
    }, DWELL_MS)
    return () => window.clearTimeout(timer)
  }, [pathname, symbol])
}

/** Null-render host so the shell mounts the beacon without re-rendering itself. */
export function VisitBeaconHost(): null {
  useVisitBeacon()
  return null
}
