import type { LucideIcon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { inspectorShell } from './rightInspectorUi'
import {
  inspectorNavIconClass,
  inspectorNavTriggerClass,
  type InspectorNavTone,
} from './inspectorNavTones'

export interface InspectorNavItem<T extends string = string> {
  id: T
  /** Compact label on line tabs. */
  label: string
  /** Optional longer title on collapsible section headers. */
  sectionLabel?: string
  icon: LucideIcon
  tone: InspectorNavTone
}

interface Props<T extends string> {
  items: readonly InspectorNavItem<T>[]
  activeId: T | null
  onFocus: (id: T) => void
  ariaLabel?: string
}

export function InspectorSectionNav<T extends string>({
  items,
  activeId,
  onFocus,
  ariaLabel = 'Jump to inspector section',
}: Props<T>) {
  return (
    <nav className={inspectorShell.sectionNavWrap} aria-label={ariaLabel}>
      <Tabs
        value={activeId ?? ''}
        onValueChange={(value) => {
          if (value) onFocus(value as T)
        }}
      >
        <TabsList variant="line" className={inspectorShell.sectionNavList}>
          {items.map(({ id, label, icon: Icon, tone }) => (
            <TabsTrigger
              key={id}
              value={id}
              className={cn(
                'group/nav-tab',
                inspectorShell.sectionNavTrigger,
                inspectorNavTriggerClass(tone),
              )}
            >
              <Icon className={cn(inspectorShell.sectionNavIcon, inspectorNavIconClass(tone))} aria-hidden />
              <span className={inspectorShell.sectionNavLabel}>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </nav>
  )
}
