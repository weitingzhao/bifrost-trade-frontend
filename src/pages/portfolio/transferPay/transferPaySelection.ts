import { getSummaryType, type RangePreset, type SummaryTypeKey } from '@/utils/transferPay'
import { KIND_NAMES, kindOf, type TransactionKind } from '@/utils/transactionKind'
import type { AccountTransaction } from '@/types/trading'

export const ALL_TYPES: SummaryTypeKey[] = ['deposit', 'withdrawal', 'dividend', 'other']

export type TransferPaySelection = {
  accountId: string
  types: Set<SummaryTypeKey>
  kinds: Set<TransactionKind>
}

/**
 * Counts sit on every chip, and each one counts what selecting it would show
 * against the rest of the selection — an account chip counts that account's whole
 * ledger, a type or kind chip counts within the chosen account. A count that
 * moved with its own chip would only ever read as the number already on screen.
 */
export function countByAccount(rows: AccountTransaction[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const tx of rows) {
    if (!tx.account_id) continue
    out[tx.account_id] = (out[tx.account_id] ?? 0) + 1
  }
  return out
}

export function countByType(rows: AccountTransaction[]): Record<SummaryTypeKey, number> {
  const out: Record<SummaryTypeKey, number> = {
    deposit: 0,
    withdrawal: 0,
    dividend: 0,
    other: 0,
  }
  for (const tx of rows) out[getSummaryType(tx.type)] += 1
  return out
}

export function countByKind(rows: AccountTransaction[]): Record<TransactionKind, number> {
  const out = Object.fromEntries(KIND_NAMES.map(k => [k, 0])) as Record<TransactionKind, number>
  for (const tx of rows) out[kindOf(tx)] += 1
  return out
}

/** No kind chip pressed means every kind, so the panel opens without narrowing anything. */
export function selectRows(
  rows: AccountTransaction[],
  { accountId, types, kinds }: TransferPaySelection,
): AccountTransaction[] {
  return rows.filter(tx => {
    if (accountId !== 'all' && tx.account_id !== accountId) return false
    if (!types.has(getSummaryType(tx.type))) return false
    if (kinds.size > 0 && !kinds.has(kindOf(tx))) return false
    return true
  })
}

/**
 * Why the table is empty, when it is. "No rows" is the same sentence for a
 * cleared filter and an account with no cash events, and those want different
 * next moves.
 */
export function emptySelectionReason(
  { types, kinds }: TransferPaySelection,
  rangeLabel: string,
): string {
  if (types.size === 0) {
    return 'No type is selected. The Type row above is multi-select — pick one, or use All.'
  }
  if (kinds.size > 0) {
    return 'The account, type and kind filters have no row in common. Clearing the kind chips is usually what you want.'
  }
  return `This account has no cash events in ${rangeLabel.toLowerCase()}.`
}

export function rangeLabelOf(
  preset: RangePreset,
  options: readonly { value: RangePreset; label: string }[],
): string {
  return options.find(o => o.value === preset)?.label ?? String(preset)
}
