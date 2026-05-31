/** API may send vwap as string; Number.isFinite rejects strings. */
export function finiteVwap(raw: unknown): number | null {
  if (raw == null) return null
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : null
}
