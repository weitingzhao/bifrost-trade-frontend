import { pnlColorClass } from '@/utils/dailyChange'

export function ledgerStkPnlClass(v: number): string {
  if (!Number.isFinite(v) || Math.abs(v) < 0.005) return 'text-muted-foreground'
  return pnlColorClass(v)
}
