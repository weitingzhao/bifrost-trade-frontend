/**
 * Which standing rule, if any, covers a candidate (design Rev 2026-09-22.7).
 *
 * The prototype's `Rule that fits` column is a **front-end join** by the
 * design's own ruling — Research is not asked to put it in the payload, because
 * the answer is a fact about the Rules book rather than about the batch, and it
 * changes when the book does, not when the run does.
 *
 * Measured on DEV 2026-09-22: 25 opportunities, 7 of them active, covering 15
 * symbols; of the 9 distinct candidate symbols in the pending batches exactly
 * one (INTC) has an active rule. So `none active` is the common answer, and it
 * is the useful one — it says this name would be an exception, not a fill.
 */
export interface RuleFitOpportunity {
  strategy_opportunity_id: number
  name: string
  is_active?: boolean
  structure_name?: string | null
  symbols?: string[] | null
}

export interface RuleFit {
  /** What the cell prints. */
  label: string
  /** True when a rule actually covers this name today. */
  fits: boolean
  /** The hover: every rule naming the symbol, active or not. */
  title: string | null
}

export function ruleThatFits(
  symbol: string,
  opportunities: readonly RuleFitOpportunity[] | undefined,
): RuleFit {
  const key = symbol.trim().toUpperCase()
  if (!key) return { label: 'none active', fits: false, title: null }

  const naming = (opportunities ?? []).filter((o) =>
    (o.symbols ?? []).some((s) => s.trim().toUpperCase() === key),
  )
  const active = naming.filter((o) => o.is_active !== false)

  if (active.length > 0) {
    const first = active[0]
    return {
      label: active.length > 1 ? `${first.name} +${active.length - 1}` : first.name,
      fits: true,
      title: active.map((o) => `${o.name}${o.structure_name ? ` · ${o.structure_name}` : ''}`).join('\n'),
    }
  }

  // A rule exists but is switched off. Saying only "none active" would hide
  // that the book has an opinion about this name and someone retired it.
  if (naming.length > 0) {
    return {
      label: `none active (${naming.length} inactive)`,
      fits: false,
      title: naming.map((o) => `${o.name} — inactive`).join('\n'),
    }
  }

  return { label: 'none active', fits: false, title: 'No opportunity in the Rules book names this symbol.' }
}
