/** Drop null / undefined / empty-string fields from an Ask Copilot snapshot. */
export function compactSnapshot(
  obj: Record<string, unknown | null | undefined>,
): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }
  return Object.keys(out).length > 0 ? out : undefined
}
