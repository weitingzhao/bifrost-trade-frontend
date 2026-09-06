import { useEffect, useState } from 'react'
/* eslint-disable react-hooks/set-state-in-effect -- fetches on drawer open */
import type { OptionSnapshotRow, LiquiditySummaryResponse, RelativeValueResponse } from '@/types/optionDiscovery'
import { fetchLiquiditySummary, fetchRelativeValue } from '@/api/research/optionDiscovery'

/**
 * Liquidity and relative value for the selected contract, from the Plugin's
 * PostgreSQL snapshot. Last-trade and quote-tape lookups used to run here
 * too; those vendor endpoints need an Options Developer plan, so the panel
 * reads what the subscription actually carries: spread, OI, snapshot age.
 */
export function useOptionContractLiquidity(
  symbol: string,
  expiration: string,
  selectedRow: OptionSnapshotRow | null,
) {
  const [liquidityLoading, setLiquidityLoading] = useState(false)
  const [serverLiquidity, setServerLiquidity] = useState<LiquiditySummaryResponse | null>(null)
  const [serverRelativeValue, setServerRelativeValue] = useState<RelativeValueResponse | null>(null)

  useEffect(() => {
    if (selectedRow == null) {
      setServerLiquidity(null)
      setServerRelativeValue(null)
      return
    }
    const sym = symbol.trim()
    const exp = expiration.trim()
    if (!sym || !exp) return
    let cancelled = false
    setLiquidityLoading(true)
    fetchLiquiditySummary(sym, exp, selectedRow.strike, selectedRow.right, 'massive')
      .then(r => {
        if (cancelled) return
        setServerLiquidity(r.ok ? r : null)
      })
      .catch(() => {
        if (!cancelled) setServerLiquidity(null)
      })
      .finally(() => {
        if (!cancelled) setLiquidityLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedRow, symbol, expiration])

  useEffect(() => {
    if (selectedRow == null) {
      setServerRelativeValue(null)
      return
    }
    const sym = symbol.trim()
    const exp = expiration.trim()
    if (!sym || !exp) return
    let cancelled = false
    fetchRelativeValue(sym, exp, selectedRow.strike, selectedRow.right, 'massive')
      .then(r => {
        if (!cancelled) setServerRelativeValue(r)
      })
      .catch(() => {
        if (!cancelled) setServerRelativeValue(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedRow, symbol, expiration])

  return {
    liquidityLoading,
    serverLiquidity,
    serverRelativeValue,
  }
}
