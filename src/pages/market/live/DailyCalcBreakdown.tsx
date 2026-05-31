import type { DailyBenchmark } from '@/types/market'
import { resolveMarketStreamDailyBasePrice } from '@/utils/marketStreamsDailyTotals'
import styles from './live.module.css'

interface Props {
  symbol: string
  bench: DailyBenchmark | undefined
  positionDailyPrevClose: number | null
  last: number | null
  qty: number | null
}

export function DailyCalcBreakdown({ symbol, bench, positionDailyPrevClose, last, qty }: Props) {
  const base = resolveMarketStreamDailyBasePrice(bench, positionDailyPrevClose ?? undefined)
  const q = qty != null && Number.isFinite(qty) ? qty : 0

  return (
    <div className={styles.dailyCalcPopup} role="tooltip">
      <div className="font-semibold mb-1">{symbol}</div>
      <div>Base (daily ref): {base != null ? base.toFixed(4) : '—'}</div>
      <div>Last: {last != null ? last.toFixed(4) : '—'}</div>
      <div>Qty: {q !== 0 ? q : '—'}</div>
      {base != null && last != null && q !== 0 && (
        <>
          <div className="mt-1 opacity-80">
            Daily %: {(((last - base) / base) * 100).toFixed(2)}%
          </div>
          <div className="opacity-80">
            Daily $: {((last - base) * q).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </div>
        </>
      )}
    </div>
  )
}
