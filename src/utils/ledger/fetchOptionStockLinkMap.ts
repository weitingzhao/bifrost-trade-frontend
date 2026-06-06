import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import { postOptionStockLinksQuery } from '@/api/trading'

/**
 * Bulk-load option-stock link summaries for all OPT executions.
 * Groups by account_id and calls the backend in one batch per account.
 * Returns a map keyed by option execution id.
 */
export async function fetchOptionStockLinkMapForExecutions(
  execs: Execution[],
): Promise<Record<number, OptionStockLinkSummary>> {
  const optExecs = execs.filter((e) => (e.sec_type ?? '').toUpperCase() === 'OPT')

  const byAccount = new Map<string, number[]>()
  for (const e of optExecs) {
    const id = e.account_executions_id
    const acc = (e.account_id ?? '').trim()
    if (id == null || !acc) continue
    const ids = byAccount.get(acc) ?? []
    ids.push(id)
    byAccount.set(acc, ids)
  }

  const batches = Array.from(byAccount.entries()).map(
    ([account_id, option_account_executions_ids]) => ({
      account_id,
      option_account_executions_ids,
    }),
  )

  if (batches.length === 0) return {}

  try {
    const res = await postOptionStockLinksQuery(batches)
    const raw = res.by_option_id

    if (raw) {
      const result: Record<number, OptionStockLinkSummary> = {}
      for (const [k, v] of Object.entries(raw)) {
        const num = Number(k)
        if (!Number.isFinite(num)) continue
        result[num] = {
          links: (v.links ?? []) as OptionStockLinkSummary['links'],
          slippage_total: v.slippage_total ?? null,
        }
      }
      return result
    }

    // Fallback: new API format — group links by option_execution_id
    const result: Record<number, OptionStockLinkSummary> = {}
    for (const link of res.links ?? []) {
      const oid = link.option_execution_id ?? link.option_account_executions_id
      if (oid == null || !Number.isFinite(Number(oid))) continue
      if (!result[oid]) {
        result[oid] = { links: [], slippage_total: null }
      }
      result[oid].links.push(link)
      const slip = link.slippage_vs_close ?? link.slippage ?? 0
      result[oid].slippage_total = (result[oid].slippage_total ?? 0) + slip
    }
    return result
  } catch {
    return {}
  }
}
