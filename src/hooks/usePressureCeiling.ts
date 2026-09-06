/**
 * How far up the Pressure gauge the margin step of Room to add may go.
 *
 * A setting, not a rule: the Owner chose 50% — where the gauge turns heavy —
 * as the default and asked for it to be movable while looking at the table
 * it resizes. Same shape as the cushion threshold: one external store so
 * every reader of the value sees the same number, persisted per browser.
 */
import { useCallback, useSyncExternalStore } from 'react'
import { STORAGE_KEYS } from '@/constants/storage'
import { PRESSURE_BANDS } from '@/utils/bookVsBase'

const KEY = STORAGE_KEYS.backingPressureCeiling

export const PRESSURE_CEILING_DEFAULT: number = PRESSURE_BANDS.heavy
export const PRESSURE_CEILING_MIN = 0.1
export const PRESSURE_CEILING_MAX = 0.9

export function parsePressureCeiling(raw: string | null): number | null {
  if (raw == null) return null
  const text = raw.trim()
  if (text === '') return null
  const n = Number(text)
  if (!Number.isFinite(n)) return null
  if (n < PRESSURE_CEILING_MIN || n > PRESSURE_CEILING_MAX) return null
  return n
}

function readStored(): number {
  try {
    return parsePressureCeiling(localStorage.getItem(KEY)) ?? PRESSURE_CEILING_DEFAULT
  } catch {
    return PRESSURE_CEILING_DEFAULT
  }
}

let current = readStored()
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): number {
  return current
}

export function setPressureCeiling(next: number): void {
  if (!Number.isFinite(next)) return
  const clamped = Math.min(PRESSURE_CEILING_MAX, Math.max(PRESSURE_CEILING_MIN, next))
  if (clamped === current) return
  current = clamped
  try {
    localStorage.setItem(KEY, String(clamped))
  } catch {
    // Kept in memory for this session.
  }
  listeners.forEach((l) => l())
}

export function usePressureCeiling() {
  const ceiling = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const setCeiling = useCallback((next: number) => setPressureCeiling(next), [])
  return { ceiling, setCeiling, isDefault: ceiling === PRESSURE_CEILING_DEFAULT }
}
