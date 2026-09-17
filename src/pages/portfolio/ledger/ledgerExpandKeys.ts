export function pruneExpandedKeys(
  prev: Set<string>,
  keys: string[],
  groupByOpportunity: boolean,
): Set<string> {
  if (groupByOpportunity) return new Set()
  const allowed = new Set(keys)
  const next = new Set<string>()
  for (const k of prev) {
    if (allowed.has(k)) next.add(k)
  }
  return next
}
