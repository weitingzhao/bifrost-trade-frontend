import { DollarSign, LayoutList, LineChart, ListOrdered, Shield } from 'lucide-react'
import type { InspectorNavItem } from '@/components/layout/InspectorSectionNav'
import {
  defaultExpandedSections as defaultExpanded,
  focusOnlySection as focusOnly,
  soleExpandedSection as soleExpanded,
} from '@/components/layout/inspectorSectionState'
import { indexInspectorNav } from '@/components/layout/inspectorNavUtils'

export const INSTANCE_INSPECTOR_SECTION_IDS = [
  'overview',
  'pnl',
  'chart',
  'risk',
  'executions',
] as const

export type InstanceInspectorSectionId = (typeof INSTANCE_INSPECTOR_SECTION_IDS)[number]

export const INSTANCE_INSPECTOR_SECTION_DOM_ID: Record<InstanceInspectorSectionId, string> = {
  overview: 'instance-inspector-overview',
  pnl: 'instance-inspector-pnl',
  chart: 'instance-inspector-chart',
  risk: 'instance-inspector-risk',
  executions: 'instance-inspector-executions',
}

export const INSTANCE_INSPECTOR_NAV: InspectorNavItem<InstanceInspectorSectionId>[] = [
  { id: 'overview', label: 'Overview', icon: LayoutList, tone: 'sky' },
  { id: 'pnl', label: 'PnL', sectionLabel: 'PnL & Commission', icon: DollarSign, tone: 'emerald' },
  { id: 'chart', label: 'Chart', sectionLabel: 'K-line Chart', icon: LineChart, tone: 'violet' },
  { id: 'risk', label: 'Risk', sectionLabel: 'Risk Profile (at expiration)', icon: Shield, tone: 'amber' },
  { id: 'executions', label: 'Executions', icon: ListOrdered, tone: 'cyan' },
]

export const INSTANCE_INSPECTOR_NAV_BY_ID = indexInspectorNav(INSTANCE_INSPECTOR_NAV)

export function defaultInstanceExpandedSections(): Record<InstanceInspectorSectionId, boolean> {
  return defaultExpanded(INSTANCE_INSPECTOR_SECTION_IDS)
}

export function focusInstanceSection(
  id: InstanceInspectorSectionId,
): Record<InstanceInspectorSectionId, boolean> {
  return focusOnly(id, INSTANCE_INSPECTOR_SECTION_IDS)
}

export function soleInstanceExpandedSection(
  expanded: Record<InstanceInspectorSectionId, boolean>,
): InstanceInspectorSectionId | null {
  return soleExpanded(expanded, INSTANCE_INSPECTOR_SECTION_IDS)
}
