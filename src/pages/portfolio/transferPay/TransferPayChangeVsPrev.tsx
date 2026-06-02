import { transferPayUi } from './transferPayUi'

export function TransferPayChangeVsPrev({ pct }: { pct: number | null | undefined }) {
  if (pct == null || !Number.isFinite(pct)) {
    return <span className={transferPayUi.changeHint}>—</span>
  }
  const sign = pct >= 0 ? '+' : ''
  return (
    <span className={transferPayUi.changeHint}>
      {sign}
      {pct.toFixed(1)}% vs prev
    </span>
  )
}
