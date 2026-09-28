import { useMemo } from 'react'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { flattenPositions } from '@/utils/positionsGrouping'
import { selectLegs, type SymbolLeg } from '@/utils/selectLegs'

/** This name's rows in the monitor's book — the legs `My legs`, the price chart and the identity line read. */
export function useSymbolLegs(symbol: string): SymbolLeg[] {
  const { data } = useMonitorStatus()
  return useMemo(() => selectLegs(flattenPositions(data?.portfolio?.accounts ?? []), symbol), [data?.portfolio?.accounts, symbol])
}

/** Shares of this name held now, across accounts; 0 when none. */
export function sharesHeld(legs: readonly SymbolLeg[]): number {
  return legs.filter((l) => l.kind === 'STK' && l.qty > 0).reduce((a, l) => a + l.qty, 0)
}
