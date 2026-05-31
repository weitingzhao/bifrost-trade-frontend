import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DiscoveryHint } from './DiscoveryHint'
import { DiscoveryIconButton } from './DiscoveryIconButton'

export function OdLayerSection({
  id,
  step,
  title,
  subtitle,
  enabled = true,
  lockedHint,
  children,
}: {
  id: string
  step: 1 | 2 | 3 | 4
  title: string
  subtitle?: string
  enabled?: boolean
  lockedHint?: string
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const titleId = `${id}-title`
  const contentId = `${id}-content`
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-24 border-b border-border pb-2 last:border-b-0',
        !enabled && 'opacity-80',
      )}
      aria-labelledby={titleId}
    >
      <header
        className={cn(
          'flex items-start gap-2',
          !enabled && 'opacity-60',
        )}
      >
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs font-bold"
          aria-hidden
        >
          {step}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 id={titleId} className="text-base font-medium">
            {title}
          </h3>
          {subtitle ? (
            <DiscoveryHint className="mt-0">{subtitle}</DiscoveryHint>
          ) : null}
        </div>
        <DiscoveryIconButton
          className="od-layer-toggle-btn shrink-0"
          onClick={() => setCollapsed(prev => !prev)}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          aria-label={collapsed ? `Expand step ${step}` : `Collapse step ${step}`}
          title={collapsed ? 'Expand section' : 'Collapse section'}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d={collapsed ? 'M9 18l6-6-6-6' : 'M6 9l6 6 6-6'} />
          </svg>
        </DiscoveryIconButton>
      </header>
      {!collapsed && (
        <div id={contentId} className="mt-3 min-w-0">
          {!enabled && lockedHint ? (
            <DiscoveryHint className="mt-0 text-sm">{lockedHint}</DiscoveryHint>
          ) : (
            children
          )}
        </div>
      )}
    </section>
  )
}
