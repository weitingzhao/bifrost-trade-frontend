/**
 * How far up the Pressure gauge the margin step of Room to add may go.
 *
 * A setting, not a rule — but a percentage typed into a box is not how the
 * decision is made. The choice is how much of the account's cushion the trader
 * is willing to spend, so it is offered as three named levels tied to the
 * gauge's own bands: cautious stays inside normal, balanced stops where the
 * gauge turns heavy, bold runs into heavy but stops short of critical. The
 * number behind each is still shown, and still what the arithmetic uses.
 *
 * One external store so every reader of the value sees the same level,
 * persisted per browser.
 */
import { useCallback, useSyncExternalStore } from 'react'
import { STORAGE_KEYS } from '@/constants/storage'
import { PRESSURE_BANDS } from '@/utils/bookVsBase'

const KEY = STORAGE_KEYS.backingPressureCeiling

export type RiskLevelId = 'cautious' | 'balanced' | 'bold'

export interface RiskLevel {
  id: RiskLevelId
  label: string
  pct: number
  /** What choosing this level means for the account, in one line. */
  meaning: string
}

/**
 * Balanced sits exactly on the gauge's heavy line, so the default stops where
 * the cockpit's own colour changes; the other two are a band either side of it.
 */
export const RISK_LEVELS: readonly RiskLevel[] = [
  {
    id: 'cautious',
    label: 'Cautious',
    pct: 0.35,
    meaning: 'Leaves roughly two thirds of the cushion untouched — room for a bad week without a margin call.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    pct: PRESSURE_BANDS.heavy,
    meaning: 'Spends up to half the cushion: the point where the Pressure gauge turns heavy.',
  },
  {
    id: 'bold',
    label: 'Bold',
    pct: 0.65,
    meaning: 'Runs into the heavy band, short of the 75% the gauge calls critical. A sharp drawdown could force closures.',
  },
]

export const PRESSURE_CEILING_DEFAULT: number = PRESSURE_BANDS.heavy
export const PRESSURE_CEILING_MIN = RISK_LEVELS[0].pct
export const PRESSURE_CEILING_MAX = RISK_LEVELS[RISK_LEVELS.length - 1].pct

/** The level a stored percentage belongs to: the nearest one, since levels are the only way to set it. */
export function riskLevelFor(pct: number): RiskLevel {
  return RISK_LEVELS.reduce((best, l) => (Math.abs(l.pct - pct) < Math.abs(best.pct - pct) ? l : best), RISK_LEVELS[0])
}

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
  const setLevel = useCallback((id: RiskLevelId) => {
    const level = RISK_LEVELS.find((l) => l.id === id)
    if (level) setPressureCeiling(level.pct)
  }, [])
  return { ceiling, setCeiling, setLevel, level: riskLevelFor(ceiling), isDefault: ceiling === PRESSURE_CEILING_DEFAULT }
}
