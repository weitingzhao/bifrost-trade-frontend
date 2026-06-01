import type { IbAccountSnapshot } from '@/types/monitor'

/** TotalCashValue / BuyingPower from account summary (Legacy Positions). */
export function accountTotalCashBuyingPower(acc: IbAccountSnapshot | undefined): {
  cash: number | null
  bp: number | null
} {
  const s = acc?.summary
  if (!s || typeof s !== 'object') return { cash: null, bp: null }
  const rec = s as Record<string, unknown>
  const num = (k: string): number | null => {
    const v = rec[k]
    if (v == null || v === '') return null
    const n = Number(String(v).replace(/,/g, '').replace(/\s/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return { cash: num('TotalCashValue'), bp: num('BuyingPower') }
}
