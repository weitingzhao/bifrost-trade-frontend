/** PUT /executions returns { ok, error } and does not throw on a failed body. */

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
