/* eslint-disable react-hooks/set-state-in-effect -- IV term keys and auto-load when expirations change */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchIvTermStructure,
  fetchIvVolatilityCone,
  pollMassiveJobUntilDone,
  postMassiveSync,
  resolveMassiveSyncJobId,
} from '@/api/research/optionDiscovery'
import type { IvTermPoint, IvVolConePoint } from '@/components/optionDiscovery/OptionDiscoveryAnalytics'
import {
  IV_TERM_DEFAULT_EXPIRATIONS,
  IV_TERM_MAX_EXPIRATIONS,
} from '@/utils/optionDiscovery/strikePresets'

type Params = {
  selectedSymbol: string
  expirations: string[]
  visibleExpirations: string[]
  effectiveStrikes: number[]
  massiveConfigured: boolean
  expirationsLoading: boolean
  expirationsError: string | null
}

export function useDiscoveryIvTerm({
  selectedSymbol,
  expirations,
  visibleExpirations,
  effectiveStrikes,
  massiveConfigured,
  expirationsLoading,
  expirationsError,
}: Params) {
  const [ivTermExpKeys, setIvTermExpKeys] = useState<string[]>([])
  const [termPoints, setTermPoints] = useState<IvTermPoint[]>([])
  const [termLoading, setTermLoading] = useState(false)
  const [termError, setTermError] = useState<string | null>(null)
  const [conePoints, setConePoints] = useState<IvVolConePoint[]>([])
  const [coneError, setConeError] = useState<string | null>(null)
  const [ivTermSyncLoading, setIvTermSyncLoading] = useState(false)
  const [ivTermSyncStatus, setIvTermSyncStatus] = useState<string | null>(null)
  const ivTermAutoLoadKeyRef = useRef('')

  const loadIvTermStructure = useCallback(async () => {
    const sym = selectedSymbol.trim()
    const ordered = expirations.filter(e => ivTermExpKeys.includes(e))
    if (!sym || ordered.length < 2) return
    setTermLoading(true)
    setTermError(null)
    setConeError(null)
    setTermPoints([])
    setConePoints([])
    try {
      const expSlice = ordered.slice(0, IV_TERM_MAX_EXPIRATIONS)
      const [res, coneRes] = await Promise.all([
        fetchIvTermStructure(sym, expSlice, 'massive'),
        fetchIvVolatilityCone(sym, expSlice, 'massive', 90),
      ])
      if (!res.ok) {
        setTermError(res.error ?? 'Failed to load IV term structure')
      } else {
        const pts = res.points ?? []
        if (pts.length < 2) {
          setTermError(
            'Not enough ATM IV in PostgreSQL for the checked expirations (need ≥2 with IV). Use Backfill snapshots (Massive) or Load quotes per expiration.',
          )
        } else {
          setTermError(null)
        }
        setTermPoints(pts)
      }
      if (!coneRes.ok) {
        setConeError(coneRes.error ?? 'Failed to load IV volatility cone')
        setConePoints([])
      } else {
        setConeError(null)
        setConePoints(coneRes.points ?? [])
      }
    } catch (e) {
      setTermError(e instanceof Error ? e.message : 'Failed to load IV term structure')
      setConeError(e instanceof Error ? e.message : 'Failed to load IV volatility cone')
    } finally {
      setTermLoading(false)
    }
  }, [selectedSymbol, expirations, ivTermExpKeys])

  const syncIvTermMassiveSnapshots = useCallback(async () => {
    const sym = selectedSymbol.trim()
    const ordered = expirations.filter(e => ivTermExpKeys.includes(e)).slice(0, IV_TERM_MAX_EXPIRATIONS)
    if (!sym || ordered.length < 2) return
    setIvTermSyncLoading(true)
    setTermError(null)
    setIvTermSyncStatus(null)
    try {
      for (let i = 0; i < ordered.length; i++) {
        const exp = ordered[i]
        setIvTermSyncStatus(`Massive chain snapshot ${i + 1}/${ordered.length} (${exp})…`)
        const payload: Record<string, unknown> = {
          underlying: sym,
          mode: 'chain',
          expiration_date: exp,
          limit: 250,
        }
        if (effectiveStrikes.length > 0) {
          payload.strike_price_gte = Math.min(...effectiveStrikes)
          payload.strike_price_lte = Math.max(...effectiveStrikes)
        }
        const sync = await postMassiveSync('feed_option_snapshots', payload)
        const jobId = resolveMassiveSyncJobId(sync)
        if (!sync.ok || !jobId) {
          setTermError(sync.error ?? sync.message ?? `Massive sync failed for ${exp}`)
          return
        }
        const polled = await pollMassiveJobUntilDone(jobId, { maxAttempts: 120, intervalMs: 1000 })
        if (!polled.ok) {
          setTermError(polled.error ?? `Massive job failed for ${exp}`)
          return
        }
      }
      setIvTermSyncStatus('Loading IV term structure…')
      await loadIvTermStructure()
    } catch (e) {
      setTermError(e instanceof Error ? e.message : 'Backfill failed')
    } finally {
      setIvTermSyncLoading(false)
      setIvTermSyncStatus(null)
    }
  }, [selectedSymbol, expirations, ivTermExpKeys, effectiveStrikes, loadIvTermStructure])

  const toggleIvTermExpiration = useCallback(
    (exp: string, checked: boolean) => {
      setIvTermExpKeys(prev => {
        const set = new Set(prev)
        if (checked) {
          if (set.size >= IV_TERM_MAX_EXPIRATIONS) return prev
          set.add(exp)
        } else {
          if (set.size <= 2 && set.has(exp)) return prev
          set.delete(exp)
        }
        return visibleExpirations.filter(e => set.has(e))
      })
    },
    [visibleExpirations],
  )

  const resetIvTermExpirationsToDefault = useCallback(() => {
    setIvTermExpKeys(
      visibleExpirations.slice(0, IV_TERM_DEFAULT_EXPIRATIONS).slice(0, IV_TERM_MAX_EXPIRATIONS),
    )
  }, [visibleExpirations])

  const selectAllIvTermExpirations = useCallback(() => {
    setIvTermExpKeys(visibleExpirations.slice(0, IV_TERM_MAX_EXPIRATIONS))
  }, [visibleExpirations])

  const uncheckAllIvTermExpirations = useCallback(() => {
    if (visibleExpirations.length < 2) return
    setIvTermExpKeys(visibleExpirations.slice(0, 2))
  }, [visibleExpirations])

  useEffect(() => {
    setTermPoints([])
    setTermError(null)
    setConePoints([])
    setConeError(null)
    setIvTermExpKeys([])
    setIvTermSyncLoading(false)
    setIvTermSyncStatus(null)
    ivTermAutoLoadKeyRef.current = ''
  }, [selectedSymbol])

  useEffect(() => {
    if (visibleExpirations.length < 2) {
      setIvTermExpKeys([])
      return
    }
    setIvTermExpKeys(prev => {
      const def = visibleExpirations
        .slice(0, IV_TERM_DEFAULT_EXPIRATIONS)
        .slice(0, IV_TERM_MAX_EXPIRATIONS)
      if (prev.length === 0) return def
      const kept = visibleExpirations.filter(e => prev.includes(e))
      if (kept.length >= 2) return kept.slice(0, IV_TERM_MAX_EXPIRATIONS)
      return def
    })
  }, [visibleExpirations])

  useEffect(() => {
    if (!massiveConfigured) return
    const sym = selectedSymbol.trim()
    if (!sym || expirationsLoading || expirationsError) return
    if (ivTermExpKeys.length < 2) return
    if (ivTermSyncLoading) return
    const key = `${sym}|${ivTermExpKeys.join(',')}`
    if (ivTermAutoLoadKeyRef.current === key) return
    const tid = window.setTimeout(() => {
      ivTermAutoLoadKeyRef.current = key
      void loadIvTermStructure()
    }, 400)
    return () => window.clearTimeout(tid)
  }, [
    massiveConfigured,
    selectedSymbol,
    ivTermExpKeys,
    expirationsLoading,
    expirationsError,
    ivTermSyncLoading,
    loadIvTermStructure,
  ])

  return {
    ivTermExpKeys,
    termPoints,
    termLoading,
    termError,
    conePoints,
    coneError,
    ivTermSyncLoading,
    ivTermSyncStatus,
    loadIvTermStructure,
    syncIvTermMassiveSnapshots,
    toggleIvTermExpiration,
    resetIvTermExpirationsToDefault,
    selectAllIvTermExpirations,
    uncheckAllIvTermExpirations,
  }
}
