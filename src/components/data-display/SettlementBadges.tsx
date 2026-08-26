/**
 * Settlement outcome badges for forecast sessions.
 * Shows path hit / close miss with optional fine-grain slots (R3/R4).
 */
import { DenseTag } from '@/components/data-display'

interface SettlementBadgesProps {
  pathHit: boolean
  pathHitCount: number
  pathTotal: number
  closeMissPct: number
  directionHit?: boolean | null
  pathShape?: string | null
  closeZone?: string | null
  leanMiss?: boolean | null
  className?: string
}

export function SettlementBadges({
  pathHit,
  pathHitCount,
  pathTotal,
  closeMissPct,
  directionHit,
  pathShape,
  closeZone,
  leanMiss,
  className,
}: SettlementBadgesProps) {
  const hitRate = pathTotal > 0 ? `${pathHitCount}/${pathTotal}` : '—'
  const missPct = (Math.abs(closeMissPct) * 100).toFixed(2)

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className ?? ''}`}>
      <DenseTag variant={pathHit ? 'success' : 'danger'}>
        {pathHit ? 'Path Hit' : 'Path Miss'} {hitRate}
      </DenseTag>
      <DenseTag variant={Math.abs(closeMissPct) <= 0.01 ? 'success' : 'warning'}>
        Close {missPct}%
      </DenseTag>
      {directionHit != null ? (
        <DenseTag variant={directionHit ? 'success' : 'danger'}>
          Dir {directionHit ? 'hit' : 'miss'}
        </DenseTag>
      ) : null}
      {pathShape ? (
        <DenseTag variant="neutral" title="Path shape">{pathShape}</DenseTag>
      ) : null}
      {closeZone ? (
        <DenseTag variant="neutral" title="Close zone">{closeZone}</DenseTag>
      ) : null}
      {leanMiss != null ? (
        <DenseTag variant={leanMiss ? 'warning' : 'success'}>
          Lean {leanMiss ? 'miss' : 'ok'}
        </DenseTag>
      ) : null}
    </span>
  )
}

export default SettlementBadges
