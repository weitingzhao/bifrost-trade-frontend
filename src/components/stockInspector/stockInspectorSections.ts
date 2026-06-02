import { BarChart3, FileSpreadsheet, Scale, TrendingUp } from 'lucide-react'
import type { InspectorNavItem } from '@/components/layout/InspectorSectionNav'
import {
  defaultExpandedSections as defaultExpanded,
  focusOnlySection as focusOnly,
  soleExpandedSection as soleExpanded,
} from '@/components/layout/inspectorSectionState'
import { indexInspectorNav } from '@/components/layout/inspectorNavUtils'

export const INSPECTOR_SECTION_IDS = ['sepa', 'barData', 'putCall', 'statements'] as const

export type InspectorSectionId = (typeof INSPECTOR_SECTION_IDS)[number]

export const INSPECTOR_SECTION_NAV: InspectorNavItem<InspectorSectionId>[] = [
  { id: 'sepa', label: 'SEPA', sectionLabel: 'SEPA Conditions', icon: TrendingUp, tone: 'emerald' },
  { id: 'barData', label: 'Bar Data', icon: BarChart3, tone: 'violet' },
  { id: 'putCall', label: 'Put/Call', sectionLabel: 'Put/Call Ratio', icon: Scale, tone: 'orange' },
  { id: 'statements', label: 'Statements', icon: FileSpreadsheet, tone: 'indigo' },
]

export const INSPECTOR_SECTION_NAV_BY_ID = indexInspectorNav(INSPECTOR_SECTION_NAV)

export function defaultExpandedSections(): Record<InspectorSectionId, boolean> {
  return defaultExpanded(INSPECTOR_SECTION_IDS)
}

export function focusOnlySection(id: InspectorSectionId): Record<InspectorSectionId, boolean> {
  return focusOnly(id, INSPECTOR_SECTION_IDS)
}

export function soleExpandedSection(
  expanded: Record<InspectorSectionId, boolean>,
): InspectorSectionId | null {
  return soleExpanded(expanded, INSPECTOR_SECTION_IDS)
}
