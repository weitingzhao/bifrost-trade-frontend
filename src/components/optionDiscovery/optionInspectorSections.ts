import { BarChart3, Droplets, LayoutList, Scale, Shield, TrendingUp } from 'lucide-react'
import type { InspectorNavItem } from '@/components/layout/InspectorSectionNav'
import {
  defaultExpandedSections as defaultExpanded,
  focusOnlySection as focusOnly,
  soleExpandedSection as soleExpanded,
} from '@/components/layout/inspectorSectionState'
import { indexInspectorNav } from '@/components/layout/inspectorNavUtils'

export const OPTION_INSPECTOR_SECTION_IDS = [
  'overview',
  'bs',
  'chart',
  'liquidity',
  'risk',
  'relative',
] as const

export type OptionInspectorSectionId = (typeof OPTION_INSPECTOR_SECTION_IDS)[number]

export const OPTION_INSPECTOR_SECTION_DOM_ID: Record<OptionInspectorSectionId, string> = {
  overview: 'option-inspector-overview',
  bs: 'option-inspector-bs',
  chart: 'option-inspector-chart',
  liquidity: 'option-inspector-liquidity',
  risk: 'option-inspector-risk',
  relative: 'option-inspector-relative',
}

export const OPTION_INSPECTOR_NAV: InspectorNavItem<OptionInspectorSectionId>[] = [
  { id: 'overview', label: 'Overview', icon: LayoutList },
  { id: 'bs', label: 'BS vs Snap', sectionLabel: 'BS vs Snapshot', icon: Scale },
  { id: 'chart', label: 'Chart', sectionLabel: 'Chart (K-line)', icon: BarChart3 },
  { id: 'liquidity', label: 'Liquidity', icon: Droplets },
  { id: 'risk', label: 'Risk', icon: Shield },
  { id: 'relative', label: 'Relative', sectionLabel: 'Relative Value', icon: TrendingUp },
]

export const OPTION_INSPECTOR_NAV_BY_ID = indexInspectorNav(OPTION_INSPECTOR_NAV)

export function defaultOptionExpandedSections(): Record<OptionInspectorSectionId, boolean> {
  return defaultExpanded(OPTION_INSPECTOR_SECTION_IDS)
}

export function focusOptionSection(
  id: OptionInspectorSectionId,
): Record<OptionInspectorSectionId, boolean> {
  return focusOnly(id, OPTION_INSPECTOR_SECTION_IDS)
}

export function soleOptionExpandedSection(
  expanded: Record<OptionInspectorSectionId, boolean>,
): OptionInspectorSectionId | null {
  return soleExpanded(expanded, OPTION_INSPECTOR_SECTION_IDS)
}
