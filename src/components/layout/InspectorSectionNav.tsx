import type { LucideIcon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { inspectorShell } from './rightInspectorUi'

export interface InspectorNavItem<T extends string = string> {
  id: T
  /** Compact label on line tabs. */
  label: string
  /** Optional longer title on collapsible section headers. */
  sectionLabel?: string
  icon: LucideIcon
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
        {/* Rev .142: in-page tabs are a capsule segmented control, not an underline. */}
        <TabsList variant="capsule" className={inspectorShell.sectionNavList}>
          {items.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className={cn('group/nav-tab', inspectorShell.sectionNavTrigger)}>
              {/* One accent, and it belongs to the layer: the open section is
                  the lifted segment, not a hue of its own. */}
              <Icon
                className={cn(
                  inspectorShell.sectionNavIcon,
                  'text-muted-foreground group-data-[state=active]/nav-tab:text-foreground',
                )}
                aria-hidden
              />
              <span className={inspectorShell.sectionNavLabel}>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </nav>
  )
}
