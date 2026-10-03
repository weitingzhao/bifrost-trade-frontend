interface SymbolGroup {
  key: string
  label: string
  rows: unknown[]
}

export function createCollapsedGroupsState(
  groups: SymbolGroup[],
  detailViewMode: 'accordion' | 'multi',
  prev: Record<string, boolean>,
  action: 'toggle' | 'expandAll' | 'collapseAll',
  key?: string,
): Record<string, boolean> {
  if (action === 'collapseAll') {
    const next: Record<string, boolean> = {}
    for (const g of groups) next[g.key] = true
    return next
  }
  if (action === 'expandAll') {
    if (detailViewMode === 'accordion' && groups.length > 0) {
      const next: Record<string, boolean> = {}
      for (const g of groups) next[g.key] = true
      delete next[groups[0].key]
      return next
    }
    return {}
  }
  if (key == null) return prev
  if (detailViewMode === 'accordion') {
    const wasCollapsed = Boolean(prev[key])
    if (wasCollapsed) {
      const next: Record<string, boolean> = {}
      for (const g of groups) next[g.key] = true
      delete next[key]
      return next
    }
    return { ...prev, [key]: true }
  }
  return { ...prev, [key]: !prev[key] }
}
