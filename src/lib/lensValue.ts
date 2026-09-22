/**
 * A lens's reading as the design prints it: the number, not the word for it.
 *
 * `Research Symbol.dc.html` (Rev 2026-09-18.2) leads every dossier row with
 * the figure — `IV rank (1y) 71`, `IV − RV +6.9 pp`, `Term slope 30d −0.017`,
 * `GEX regime long γ` — and this side printed only the band's label («Lean
 * cold»), which is the lens's conclusion without the reading it drew it from.
 *
 * Each lens states its own unit and this maps the ones the exhibits return,
 * measured on DEV 2026-09-21. A unit nobody here knows prints the raw number
 * rather than guessing a scale: a wrong scale is worse than an unfamiliar
 * one.
 */
export function lensValueText(value: unknown, unit: string | null | undefined): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  switch (unit) {
    // Percentile-of-history units read as a whole number, 0–100.
    case 'pct_of_1y_range':
    case 'pctile_252d':
    case 'pctile_of_abs_slope_252d':
      return String(Math.round(value))
    // Vol points, signed: the sign is the reading.
    case 'vol_points':
    case 'pp':
      return `${value > 0 ? '+' : ''}${value.toFixed(1)} pp`
    // A raw vol difference, small and signed.
    case 'near_minus_far_vol':
      return `${value > 0 ? '+' : ''}${value.toFixed(3)}`
    // A share of spot reads as a percentage of it.
    case 'fraction_of_spot':
      return `${(value * 100).toFixed(1)}%`
    default:
      return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2)
  }
}

/** `60% · 67% n9` — the two rates the design prints, each with its sample. */
export function recordColumns(
  tr: { by_side?: Record<string, { evaluated_5d?: number; evaluated_20d?: number; hit_rate_5d?: number | null; hit_rate_20d?: number | null }> } | null | undefined,
  band: string | null,
): { rates: string; n: string } | null {
  if (!tr?.by_side) return null
  const side = band === 'cold' || band === 'lean_cold' ? 'cold' : 'hot'
  const s = tr.by_side[side]
  if (!s || (s.evaluated_20d ?? 0) === 0) return null
  const pct = (v: number | null | undefined) =>
    v == null || !Number.isFinite(v) ? '—' : `${Math.round(v * 100)}%`
  return { rates: `${pct(s.hit_rate_5d)} · ${pct(s.hit_rate_20d)}`, n: `n${s.evaluated_20d}` }
}
