import type { InspectorNavItem } from './InspectorSectionNav'

/** Title shown on collapsible section headers (may differ from compact tab label). */
export function inspectorSectionTitle(item: InspectorNavItem): string {
  return item.sectionLabel ?? item.label
}

export function indexInspectorNav<T extends string>(
  items: readonly InspectorNavItem<T>[],
): Record<T, InspectorNavItem<T>> {
  return Object.fromEntries(items.map((item) => [item.id, item])) as Record<T, InspectorNavItem<T>>
}
