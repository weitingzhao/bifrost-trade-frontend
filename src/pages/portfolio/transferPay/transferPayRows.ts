import { fmtMonthToken } from '@/lib/format'
import { getPeriodKey } from '@/utils/transferPay'
import type { AccountTransaction } from '@/types/trading'

/**
 * The detail table's display rows. Month separators are rows rather than nested
 * tables so the seven columns keep one alignment down the page.
 */
export type TransferPayRow =
  | { row: 'month'; key: string; label: string; events: number; net: number }
  | { row: 'tx'; key: string; tx: AccountTransaction }

export function txAmount(tx: AccountTransaction): number {
  const n = Number(tx.amount)
  return Number.isFinite(n) ? n : 0
}

export function netOf(rows: AccountTransaction[]): number {
  return rows.reduce((sum, tx) => sum + txAmount(tx), 0)
}

/**
 * A month separator carries the count and net of that whole month in the current
 * selection, not of the part that happens to land on this page — the reader is
 * asking what the month did, and a per-page subtotal would answer a question
 * about pagination instead.
 */
export function buildTransferPayRows({
  page,
  filtered,
  groupByMonth,
}: {
  page: AccountTransaction[]
  filtered: AccountTransaction[]
  groupByMonth: boolean
}): TransferPayRow[] {
  const rows: TransferPayRow[] = []
  let openMonth: string | null = null
  page.forEach((tx, i) => {
    const key = `${tx.account_id}-${tx.ts}-${tx.amount}-${tx.type}-${i}`
    if (groupByMonth) {
      const month = getPeriodKey(tx.ts, 'month')
      if (month && month !== openMonth) {
        openMonth = month
        const inMonth = filtered.filter(x => getPeriodKey(x.ts, 'month') === month)
        rows.push({
          row: 'month',
          key: `month-${month}`,
          label: fmtMonthToken(tx.ts),
          events: inMonth.length,
          net: netOf(inMonth),
        })
      }
    }
    rows.push({ row: 'tx', key, tx })
  })
  return rows
}
