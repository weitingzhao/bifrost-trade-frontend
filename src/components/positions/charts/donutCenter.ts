import { fmtMvAbbrev } from '@/utils/positionsCharts'
import type { DonutCenterVariant } from './DonutChart'

export function donutCenterFromDenom(
  denom: number,
  mode: 'pct' | 'usd',
  pStock: number,
  pCash: number,
  netLiq: number | null,
  simpleCenterPct: boolean,
): { main: string; sub: string; variant: DonutCenterVariant } {
  if (denom <= 0) {
    if (netLiq != null) {
      return { main: fmtMvAbbrev(netLiq), sub: 'Net liq.', variant: 'netliq' }
    }
    return { main: '—', sub: '', variant: 'basis' }
  }
  if (mode === 'usd') {
    return {
      main: fmtMvAbbrev(denom),
      sub: netLiq != null ? `Net liq. ${fmtMvAbbrev(netLiq)}` : 'Chart basis',
      variant: 'basis',
    }
  }
  if (simpleCenterPct) {
    return {
      main: `${(pStock * 100).toFixed(1)} · ${(pCash * 100).toFixed(1)}`,
      sub: '% of sum',
      variant: 'triplet',
    }
  }
  return {
    main: '100.0%',
    sub:
      netLiq != null
        ? `Basis ${fmtMvAbbrev(denom)} · Net liq. ${fmtMvAbbrev(netLiq)}`
        : `Chart basis ${fmtMvAbbrev(denom)}`,
    variant: 'basis',
  }
}
