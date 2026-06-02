import { InspectorSectionNav } from '@/components/layout/InspectorSectionNav'
import type { InspectorSectionId } from './stockInspectorSections'
import { INSPECTOR_SECTION_NAV } from './stockInspectorSections'

interface Props {
  activeId: InspectorSectionId | null
  onFocus: (id: InspectorSectionId) => void
}

export function StockInspectorSectionNav({ activeId, onFocus }: Props) {
  return <InspectorSectionNav items={INSPECTOR_SECTION_NAV} activeId={activeId} onFocus={onFocus} />
}
