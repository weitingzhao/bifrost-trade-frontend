/**
 * A §16.13 freshness reading that keeps itself current — every second for a
 * stream, every fifteen otherwise — because "can I trust it now" moves with
 * the clock even when the data does not.
 */
import { useEffect, useState } from 'react'
import { freshReading, type FreshKind, type FreshReading } from '@/lib/freshness'
import { useTradingCalendar } from '@/hooks/useTradingCalendar'

function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(t)
  }, [everyMs])
  return now
}

export function useFreshReading(
  kind: FreshKind,
  atMs: number | null,
  opts: { src?: string; due?: string } = {},
): FreshReading {
  const calendar = useTradingCalendar()
  const now = useNow(kind === 'stream' ? 1_000 : 15_000)
  return freshReading(kind, atMs, now, { ...opts, calendar })
}
