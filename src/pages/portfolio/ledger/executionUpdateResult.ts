import type { ExecutionsResponse } from '@/types/positions'

/**
 * `patchExecutionAttribution` (PATCH /executions/{id}/attribution, api 0.3.0)
 * returns { ok, error } and does not throw on a refusal.
 */

export function errorFromUpdateResult(res: { ok: boolean; error?: string }): string | null {
  if (res.ok) return null
  const msg = res.error?.trim()
  return msg || 'Update failed'
}

export async function syncOppositeLegAttribution(
  update: (id: number, body: { strategy_opportunity_id: number; strategy_instance_id: number }) => Promise<{
    ok: boolean
    error?: string
  }>,
  id: number,
  source: { opportunity_id: number; instance_id: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
  let res: { ok: boolean; error?: string }
  try {
    res = await update(id, {
      strategy_opportunity_id: source.opportunity_id,
      strategy_instance_id: source.instance_id,
    })
  } catch (e) {
    // A request that never reached the API throws instead of returning ok: false.
    // The row must say so, not go quiet.
    return { ok: false, error: e instanceof Error && e.message ? e.message : 'Network error — nothing was written' }
  }
  const error = errorFromUpdateResult(res)
  if (error) return { ok: false, error }
  return { ok: true }
}


/**
 * The two columns a successful opposite-leg sync changed, written into a
 * cached executions response in place. The PUT is durable when it answers ok;
 * this makes the row say so immediately, while the refetch that follows is
 * the audit, not the reveal (a limit=0 refetch takes seconds on PROD and
 * reads as "the DB lags").
 */
export function seedSyncedAttribution(
  old: ExecutionsResponse | undefined,
  id: number,
  source: { opportunity_id: number; instance_id: number },
): ExecutionsResponse | undefined {
  if (!old) return old
  return {
    ...old,
    items: (old.items ?? []).map(it =>
      it.account_executions_id === id
        ? {
            ...it,
            strategy_opportunity_id: source.opportunity_id,
            strategy_instance_id: source.instance_id,
          }
        : it,
    ),
  }
}
