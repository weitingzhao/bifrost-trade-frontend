/** Shared expand/collapse state helpers for right inspector section nav. */

export function defaultExpandedSections<T extends string>(
  ids: readonly T[],
): Record<T, boolean> {
  return Object.fromEntries(ids.map((id) => [id, true])) as Record<T, boolean>
}

export function focusOnlySection<T extends string>(
  id: T,
  ids: readonly T[],
): Record<T, boolean> {
  return Object.fromEntries(ids.map((key) => [key, key === id])) as Record<T, boolean>
}

export function soleExpandedSection<T extends string>(
  expanded: Record<T, boolean>,
  ids: readonly T[],
): T | null {
  const open = ids.filter((id) => expanded[id])
  return open.length === 1 ? open[0] : null
}
