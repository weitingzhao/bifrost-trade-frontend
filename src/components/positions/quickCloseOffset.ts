import type { Execution } from '@/types/positions'
import { isBuySide, isSellSide } from '@/utils/instanceDetail/executionSide'

/** Signed size of one fill. IB sides are BUY/SELL (or BOT/SLD), not 'Buy'. */
export function signedFillQty(exec: Execution): number {
  const mag = Math.abs(Number(exec.quantity ?? exec.qty) || 0)
  if (!Number.isFinite(mag) || mag === 0) return 0
  if (isSellSide(exec)) return -mag
  if (isBuySide(exec)) return mag
  return 0
}

/** Offset that flattens a net position: long → SELL, short → BUY. */
export function closingFillFromNet(
  netQty: number,
): { side: 'BUY' | 'SELL'; quantity: number } | null {
  if (!Number.isFinite(netQty) || Math.abs(netQty) < 1e-9) return null
  return {
    side: netQty > 0 ? 'SELL' : 'BUY',
    quantity: Math.abs(netQty),
  }
}
