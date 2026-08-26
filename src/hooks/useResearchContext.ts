import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { todayIso } from '@/lib/researchFreshness'

const STORAGE_KEY = 'bifrost-research-context'

function readStoredContext(): { symbol?: string; date?: string } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as { symbol?: string; date?: string }
    return parsed ?? {}
  } catch {
    return {}
  }
}

function writeStoredContext(symbol: string, date: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ symbol, date }))
  } catch {
    // ignore quota / private mode
  }
}

export function useResearchContext() {
  const [searchParams, setSearchParams] = useSearchParams()
  const stored = readStoredContext()

  const urlSymbol = searchParams.get('symbol')?.trim().toUpperCase()
  const symbol = urlSymbol || stored.symbol || 'SPX'
  const dateInput = searchParams.get('date') ?? stored.date ?? ''
  const selectedDate = dateInput || todayIso()

  const setSymbol = useCallback(
    (value: string) => {
      const sym = value.trim().toUpperCase() || 'SPX'
      writeStoredContext(sym, dateInput)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('symbol', sym)
          return next
        },
        { replace: true },
      )
    },
    [dateInput, setSearchParams],
  )

  const setDate = useCallback(
    (value: string) => {
      writeStoredContext(symbol, value)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) {
            next.set('date', value)
          } else {
            next.delete('date')
          }
          return next
        },
        { replace: true },
      )
    },
    [symbol, setSearchParams],
  )

  return {
    symbol,
    dateInput,
    selectedDate,
    /** Pass to API trade_date — empty when user left date blank (server uses latest). */
    apiDate: dateInput || undefined,
    setSymbol,
    setDate,
  }
}
