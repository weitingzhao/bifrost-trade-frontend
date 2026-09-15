/**
 * Composer spend hint (§11.2 composer): provider of the active model plus
 * today's estimate. Missing usage is "spend n/a" — we do not invent a dollar.
 */
export function copilotSpendLine(opts: {
  providerLabel: string | null | undefined
  costUsd: number | null | undefined
}): string {
  const provider = opts.providerLabel?.trim()
  const named = provider ? provider.toUpperCase() : null
  if (opts.costUsd == null || Number.isNaN(opts.costUsd)) {
    return named ? `${named} · spend n/a` : 'Spend n/a'
  }
  const amount = `$${opts.costUsd.toFixed(2)} today`
  return named ? `${named} · ${amount}` : amount
}
