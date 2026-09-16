import { NO_PRIOR_BASE, type PctChange } from '@/utils/transferPay'
import { transferPayUi } from './transferPayUi'

export function TransferPayChangeVsPrev({ pct }: { pct: PctChange | undefined }) {
  if (pct === NO_PRIOR_BASE) {
    return (
      <span className={transferPayUi.changeHint} title="The previous period was zero, so there is no rate to report">
        no prior base
      </span>
    )
  }
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
