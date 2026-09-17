import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { ledgerContractDisplay } from './ledgerContractMark'

/** What the Details table is showing: one contract by name, several by count, with the fills under them. */
export function ledgerDetailsSubject(groups: OptExecutionGroup[]): string {
  if (groups.length === 0) return ''
  const fills = groups.reduce((n, g) => n + (g.trades?.length ?? 0), 0)
  const fillsLabel = `${fills} ${fills === 1 ? 'fill' : 'fills'}`
  const head = groups.length === 1 ? ledgerContractDisplay(groups[0]).mark : `${groups.length} contracts`
  return `${head} · ${fillsLabel}`
}
