/**
 * Settlement outcome badges for forecast sessions.
 * Shows path hit / close miss with appropriate DenseTag variants.
 */
import { DenseTag } from '@/components/data-display'

interface SettlementBadgesProps {
  pathHit: boolean
  pathHitCount: number
  pathTotal: number
  closeMissPct: number
  className?: string
}

export function SettlementBadges({
  pathHit,
  pathHitCount,
  pathTotal,
  closeMissPct,
  className,
}: SettlementBadgesProps) {
  const hitRate = pathTotal > 0 ? `${pathHitCount}/${pathTotal}` : '—'
  const missPct = (Math.abs(closeMissPct) * 100).toFixed(2)

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
      <DenseTag variant={pathHit ? 'success' : 'danger'}>
        {pathHit ? 'Path Hit' : 'Path Miss'} {hitRate}
      </DenseTag>
      <DenseTag variant={Math.abs(closeMissPct) <= 0.01 ? 'success' : 'warning'}>
        Close {missPct}%
      </DenseTag>
    </span>
  )
}

export default SettlementBadges
