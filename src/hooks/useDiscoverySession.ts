import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { STORAGE_KEYS } from '@/constants/storage'
import {
  DEFAULT_CHAIN_COLUMN_VISIBILITY,
  type StdDevOption,
  type StrikeCountOption,
} from '@/utils/optionDiscovery/strikePresets'

type ChainColumnId = keyof typeof DEFAULT_CHAIN_COLUMN_VISIBILITY
type StrikeSideMode = 'all' | 'call' | 'put'
type GreeksSource = 'snapshot' | 'bs'

interface DiscoveryPrefs {
  chainColumnVisibility?: Record<string, boolean>
  greeksSource?: GreeksSource
  strikeCountOption?: StrikeCountOption
  stdDevOption?: StdDevOption
  customStdDev?: string
  strikeSideMode?: StrikeSideMode
}

function loadPrefs(): DiscoveryPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.optionDiscoveryPrefs)
    if (!raw) return {}
    return JSON.parse(raw) as DiscoveryPrefs
  } catch {
    return {}
  }
}

function savePrefs(prefs: DiscoveryPrefs) {
  try {
    localStorage.setItem(STORAGE_KEYS.optionDiscoveryPrefs, JSON.stringify(prefs))
  } catch {
    /* ignore quota errors */
  }
}

export function useDiscoverySession() {
  const [searchParams] = useSearchParams()
  const saved = loadPrefs()

  const [selectedSymbol, setSelectedSymbol] = useState(
    () => searchParams.get('symbol')?.trim().toUpperCase() ?? '',
  )
  const [selectedExpiration, setSelectedExpiration] = useState(
    () => searchParams.get('expiration')?.trim() ?? '',
  )
  const [underlyingInput, setUnderlyingInput] = useState(
    () => searchParams.get('symbol')?.trim().toUpperCase() ?? '',
  )
  const [strikeCountOption, setStrikeCountOption] = useState<StrikeCountOption>(
    () => saved.strikeCountOption ?? 30,
  )
  const [stdDevOption, setStdDevOption] = useState<StdDevOption>(
    () => saved.stdDevOption ?? 2,
  )
  const [customStdDev, setCustomStdDev] = useState(saved.customStdDev ?? '2')
  const [strikeSideMode, setStrikeSideMode] = useState<StrikeSideMode>(
    () => saved.strikeSideMode ?? 'all',
  )
  const [chainColumnVisibility, setChainColumnVisibility] = useState<Record<ChainColumnId, boolean>>(
    () => ({ ...DEFAULT_CHAIN_COLUMN_VISIBILITY, ...saved.chainColumnVisibility }),
  )
  const [greeksSource, setGreeksSource] = useState<GreeksSource>(
    () => saved.greeksSource ?? 'snapshot',
  )

  const setSelectedSymbolWithInput = useCallback((sym: string) => {
    const next = sym.trim().toUpperCase()
    setSelectedSymbol(next)
    setUnderlyingInput(next)
  }, [])

  useEffect(() => {
    savePrefs({
      chainColumnVisibility,
      greeksSource,
      strikeCountOption,
      stdDevOption,
      customStdDev,
      strikeSideMode,
    })
  }, [chainColumnVisibility, greeksSource, strikeCountOption, stdDevOption, customStdDev, strikeSideMode])

  const applyUnderlyingFromInput = useCallback(() => {
    setSelectedSymbolWithInput(underlyingInput)
  }, [underlyingInput, setSelectedSymbolWithInput])

  const toggleChainColumn = useCallback((id: ChainColumnId) => {
    setChainColumnVisibility(prev => {
      const on = prev[id] !== false
      return { ...prev, [id]: !on }
    })
  }, [])

  return {
    selectedSymbol,
    setSelectedSymbol: setSelectedSymbolWithInput,
    selectedExpiration,
    setSelectedExpiration,
    underlyingInput,
    setUnderlyingInput,
    applyUnderlyingFromInput,
    strikeCountOption,
    setStrikeCountOption,
    stdDevOption,
    setStdDevOption,
    customStdDev,
    setCustomStdDev,
    strikeSideMode,
    setStrikeSideMode,
    chainColumnVisibility,
    setChainColumnVisibility,
    toggleChainColumn,
    greeksSource,
    setGreeksSource,
  }
}
