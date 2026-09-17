import type { Execution } from '@/types/positions'
import type { ViewLinksPayload } from './LedgerOptContractCell'

/** Resolve a Linked-stock control to the option fill the Links face should load. */
export function fillFromViewLinks(
  ctx: ViewLinksPayload,
  executions: Execution[],
): Execution | undefined {
  const oid =
    ctx.oid ??
    ctx.links
      ?.map(l => l.option_account_executions_id ?? l.option_execution_id)
      .find((id): id is number => id != null)
  if (oid == null) return undefined
  return executions.find(e => e.account_executions_id === oid)
}
