import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InspectorNavItem } from './InspectorSectionNav'
import { inspectorSectionIconClass } from './inspectorNavTones'
import { inspectorSectionTitle } from './inspectorNavUtils'
import { inspectorShell } from './rightInspectorUi'
import type { InspectorNavTone } from './inspectorNavTones'

interface Props {
  expanded: boolean
  onToggle: () => void
  className?: string
  id?: string
  /** Preferred: single source for tab + section (icon, tone, labels). */
  navItem?: InspectorNavItem
  /** Legacy / overrides when navItem is not passed. */
  label?: string
  icon?: LucideIcon
  tone?: InspectorNavTone
}

export function RightInspectorSectionToggle({
  label,
  navItem,
  icon: IconProp,
  tone,
  expanded,
  onToggle,
  className,
  id,
}: Props) {
  const title = navItem ? inspectorSectionTitle(navItem) : label
  const Icon = navItem?.icon ?? IconProp
  const accent = navItem?.tone ?? tone

  if (!title) {
    throw new Error('RightInspectorSectionToggle requires navItem or label')
  }

  return (
    <button
      type="button"
      id={id}
      className={cn(
        inspectorShell.sectionTitle,
        'mb-0 cursor-pointer border-0 bg-transparent p-0',
        className,
      )}
      aria-expanded={expanded}
      onClick={onToggle}
    >
      <span className={inspectorShell.sectionTitleLead}>
        {Icon && accent ? (
          <Icon
            className={cn(inspectorShell.sectionNavIcon, inspectorSectionIconClass(accent))}
            aria-hidden
          />
        ) : null}
        <span>{title}</span>
      </span>
      <span className={inspectorShell.sectionTitleChevron} aria-hidden>
        {expanded ? '▴' : '▾'}
      </span>
    </button>
  )
}
