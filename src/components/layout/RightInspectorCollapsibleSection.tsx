import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { InspectorNavItem } from './InspectorSectionNav'
import { inspectorShell } from './rightInspectorUi'
import { RightInspectorSectionToggle } from './RightInspectorSectionToggle'

interface Props {
  sectionId: string
  navItem: InspectorNavItem
  expanded: boolean
  onToggle: () => void
  children: ReactNode
  className?: string
}

/** Collapsible block; pass the same `navItem` as line tabs for matching icon + tone. */
export function RightInspectorCollapsibleSection({
  sectionId,
  navItem,
  expanded,
  onToggle,
  children,
  className,
}: Props) {
  return (
    <section id={sectionId} className={cn(inspectorShell.section, className)}>
      <RightInspectorSectionToggle
        id={`${sectionId}-toggle`}
        navItem={navItem}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded ? children : null}
    </section>
  )
}
